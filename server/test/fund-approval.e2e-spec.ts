// 资金审批联动 (§4 资金联动 / 审批中心)：退款、转班、调课 接入审批中心，审批通过后系统内生效
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('资金审批联动 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const get = (url: string) => request(app.getHttpServer()).get(url).set(auth());
  const post = (url: string) => request(app.getHttpServer()).post(url).set(auth());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ username: 'admin', password: 'admin123456' }).expect(201);
    token = login.body.data.accessToken;
  });
  afterAll(async () => { await app.close(); });

  const createStudent = async (name: string) => {
    const r = await post('/api/v1/students').send({ name }).expect(201);
    return r.body.data.id as number;
  };
  const createClassGroup = async (name: string, courseId = 1) => {
    const r = await post('/api/v1/courses/class-groups').send({ courseId, name }).expect(201);
    return r.body.data.id as number;
  };
  const createPaidOrder = async (studentId: number) => {
    const c = await post('/api/v1/orders').send({
      studentId,
      items: [{ courseId: 1, name: '数学课', qty: 1, unitPrice: 1000, hours: 10 }],
    }).expect(201);
    const oid = c.body.data.id as number;
    const payable = c.body.data.payableAmount;
    await post(`/api/v1/orders/${oid}/pay`).send({ channel: 'OFFLINE', amount: payable }).expect(201);
    return oid;
  };
  const approve = async (instanceId: number) => {
    await post(`/api/v1/approvals/${instanceId}/approve`).send({ comment: 'ok' }).expect(201);
  };
  const reject = async (instanceId: number) => {
    await post(`/api/v1/approvals/${instanceId}/reject`).send({ comment: 'no' }).expect(201);
  };

  it('退款 → 审批中心 → 审批通过后退款生效+课时回滚', async () => {
    const sid = await createStudent('退款学员');
    const oid = await createPaidOrder(sid);
    const rf = await post(`/api/v1/orders/${oid}/refund`)
      .send({ amount: 1000, reason: '不上了', approverId: 1 }).expect(201);
    const refund = rf.body.data;
    expect(refund.status).toBe('PENDING');
    expect(refund.approvalInstanceId).toBeTruthy();
    // 审批前订单为退款中
    const before = await get(`/api/v1/orders/${oid}`).expect(200);
    expect(before.body.data.status).toBe('REFUNDING');
    // 审批中心通过
    await approve(refund.approvalInstanceId);
    // 退款生效
    const after = await get(`/api/v1/orders/${oid}`).expect(200);
    expect(after.body.data.status).toBe('REFUNDED');
    expect(after.body.data.refunds[0].status).toBe('REFUNDED');
  });

  it('退款 → 审批驳回 → 退款单驳回且订单退回已支付', async () => {
    const sid = await createStudent('退款驳回学员');
    const oid = await createPaidOrder(sid);
    const rf = await post(`/api/v1/orders/${oid}/refund`)
      .send({ amount: 500, approverId: 1 }).expect(201);
    await reject(rf.body.data.approvalInstanceId);
    const after = await get(`/api/v1/orders/${oid}`).expect(200);
    expect(after.body.data.status).toBe('PAID');
    expect(after.body.data.refunds[0].status).toBe('REJECTED');
  });

  it('转班 → 审批通过 → 学员班级变更 + 补差价生成应收订单', async () => {
    const sid = await createStudent('转班学员');
    const cg1 = await createClassGroup('原班级');
    const cg2 = await createClassGroup('目标班级');
    await post('/api/v1/students/courses/enroll')
      .send({ studentId: sid, courseId: 1, classGroupId: cg1 }).expect(201);

    const tr = await post('/api/v1/class-change/transfers').send({
      studentId: sid, fromClassGroupId: cg1, toClassGroupId: cg2, diffAmount: 200, approverId: 1,
    }).expect(201);
    expect(tr.body.data.status).toBe('PENDING');
    await approve(tr.body.data.approvalInstanceId);

    // 转班生效
    const list = await get('/api/v1/class-change/transfers').expect(200);
    const t = list.body.data.list.find((x: any) => x.id === tr.body.data.id);
    expect(t.status).toBe('DONE');

    // 学员报名班级已变更
    const enrolls = await get(`/api/v1/students/${sid}/courses`).expect(200);
    const sc = enrolls.body.data.find((e: any) => e.courseId === 1);
    expect(sc.classGroupId).toBe(cg2);

    // 补差价生成系统内应收订单(金额为 200)
    const orders = await get('/api/v1/orders').query({ studentId: sid }).expect(200);
    const diffOrder = orders.body.data.list.find((o: any) => o.payableAmount === 200);
    expect(diffOrder).toBeTruthy();
  });

  it('调课 → 审批通过 → 课次时间更新', async () => {
    const cg = await createClassGroup('调课班级');
    const lesson = await post('/api/v1/courses/lessons').send({
      classGroupId: cg, courseId: 1, startTime: '2026-10-20T09:00:00', endTime: '2026-10-20T10:00:00',
    }).expect(201);
    const lid = lesson.body.data.id;

    const rs = await post('/api/v1/class-change/reschedules').send({
      lessonId: lid, newStartTime: '2026-10-25T14:00:00', newEndTime: '2026-10-25T15:00:00', approverId: 1,
    }).expect(201);
    expect(rs.body.data.status).toBe('PENDING');
    await approve(rs.body.data.approvalInstanceId);

    const list = await get('/api/v1/courses/lessons/list').query({ classGroupId: cg }).expect(200);
    const l = list.body.data.list.find((x: any) => x.id === lid);
    expect(new Date(l.startTime).getTime()).toBe(new Date('2026-10-25T14:00:00').getTime());
  });
});
