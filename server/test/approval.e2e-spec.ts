// 审批中心 e2e（M8 待办中心·审批接入，文档 §4.16 / §4.26）：发起审批→生成 APPROVAL 任务入待办中心→通过/驳回→关闭任务。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('审批中心 Approval (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    token = login.body.data.accessToken;
    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    userId = profile.body.data.id;
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('未授权发起审批应 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/approvals').expect(401);
  });

  it('单节点审批：发起→待办→通过→关闭', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'REFUND', title: '退费审批-单', approverIds: [userId] })
      .expect(201);
    const id = create.body.data.id;

    // 审批任务进入待办中心
    const todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(todos.body.data.list.length).toBe(1);
    expect(todos.body.data.list[0].refId).toBe(id);

    // 我的审批待办包含该实例
    const myTodos = await request(app.getHttpServer())
      .get('/api/v1/approvals/todos')
      .set(auth())
      .expect(200);
    expect(myTodos.body.data.some((x: any) => x.id === id)).toBe(true);

    // 通过
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .send({ comment: '同意' })
      .expect(201);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('APPROVED');

    // 任务已关闭（不再出现在我的未办）
    const after = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(after.body.data.list.length).toBe(0);
  });

  it('多节点审批：逐级推进，终审才通过', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'DISCOUNT', title: '折扣特批-双', approverIds: [userId, userId] })
      .expect(201);
    const id = create.body.data.id;

    // 第一节点通过 → 仍 PENDING，进入下一节点任务
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .send({ comment: '初审通过' })
      .expect(201);
    let detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('PENDING');
    expect(detail.body.data.currentNode).toBe(1);
    let todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(todos.body.data.list.length).toBe(1); // 下一节点新任务

    // 第二节点（终审）通过 → APPROVED
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .send({ comment: '终审通过' })
      .expect(201);
    detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('APPROVED');
    todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(todos.body.data.list.length).toBe(0);
  });

  it('非当前节点审批人通过应 403', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'TRANSFER', title: '转班-双', approverIds: [userId, 999999] })
      .expect(201);
    const id = create.body.data.id;
    // 当前节点是 userId(0号)，用伪节点? 999999 非当前，无法直接测 403 因为 operator 是 admin(userId)。
    // 这里改为：直接验证已结束的实例不能再审批
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .expect(201); // 第一节点通过
    // 当前节点变为 999999，admin 再 approve 应 403（非当前节点审批人）
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .expect(403);
  });

  it('审批流模板：配置→按模板发起→逐级审批', async () => {
    const flow = await request(app.getHttpServer())
      .post('/api/v1/approvals/flows')
      .set(auth())
      .send({
        bizType: 'REFUND',
        name: '退费审批流',
        enabled: true,
        nodes: [
          { order: 0, name: '主管', approverType: 'USER', approverId: userId },
          { order: 1, name: '财务', approverType: 'USER', approverId: userId },
        ],
      })
      .expect(201);
    const flowId = flow.body.data.id;
    expect(flow.body.data.nodesJson.length).toBe(2);

    const list = await request(app.getHttpServer())
      .get('/api/v1/approvals/flows')
      .set(auth())
      .expect(200);
    expect(list.body.data.list.some((x: any) => x.id === flowId)).toBe(true);

    const create = await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'REFUND', title: '退费-模板', flowId })
      .expect(201);
    const id = create.body.data.id;
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.nodes.length).toBe(2);
    expect(detail.body.data.status).toBe('PENDING');

    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`).set(auth()).send({ comment: '初审' }).expect(201);
    let d2 = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`).set(auth()).expect(200);
    expect(d2.body.data.currentNode).toBe(1);
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`).set(auth()).send({ comment: '终审' }).expect(201);
    d2 = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`).set(auth()).expect(200);
    expect(d2.body.data.status).toBe('APPROVED');
  });

  it('审批流模板：节点缺少审批人应 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/approvals/flows')
      .set(auth())
      .send({ bizType: 'X', name: 'bad', nodes: [{ order: 0, name: 'n', approverType: 'USER' }] })
      .expect(400);
  });

  it('发起审批：flowId 与 approverIds 均无应 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'X', title: 'no approver' })
      .expect(400);
  });

  it('会签(AND)：同节点多人需全部通过才推进，且已审人退出自己待办', async () => {
    // 取 finance 角色 id，并创建第二个财务成员以凑齐会签两人
    const roles = await request(app.getHttpServer()).get('/api/v1/roles').set(auth()).expect(200);
    const financeRole = roles.body.data.find((r: any) => r.code === 'finance');
    await request(app.getHttpServer()).post('/api/v1/users').set(auth())
      .send({ username: 'finance2', name: '财务2', password: 'finance@123456', roleIds: [financeRole.id] })
      .expect((res: any) => expect([201, 409]).toContain(res.status));

    const fin1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ username: 'finance_default', password: 'finance@123456' }).expect(201);
    const fin1Token = fin1Login.body.data.accessToken;
    const fin1Id = fin1Login.body.data.id;
    const fin2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login').send({ username: 'finance2', password: 'finance@123456' }).expect(201);
    const fin2Token = fin2Login.body.data.accessToken;

    // 会签模板：节点0=财务角色(两人) AND；节点1=admin OR 终审
    const flow = await request(app.getHttpServer()).post('/api/v1/approvals/flows').set(auth())
      .send({
        bizType: 'REFUND', name: '退费会签流', enabled: true,
        nodes: [
          { order: 0, name: '财务会签', approverType: 'ROLE', approverRole: 'finance', mode: 'AND' },
          { order: 1, name: '终审', approverType: 'USER', approverId: userId, mode: 'OR' },
        ],
      })
      .expect(201);
    const flowId = flow.body.data.id;

    const create = await request(app.getHttpServer()).post('/api/v1/approvals').set(auth())
      .send({ bizType: 'REFUND', title: '退费-会签', flowId }).expect(201);
    const id = create.body.data.id;

    let detail = await request(app.getHttpServer()).get(`/api/v1/approvals/${id}`).set(auth()).expect(200);
    expect(detail.body.data.nodes[0].mode).toBe('AND');

    // fin1 通过 → 会签未齐，仍 PENDING 且停留在节点0
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`).set('Authorization', `Bearer ${fin1Token}`).send({ comment: 'fin1' }).expect(201);
    detail = await request(app.getHttpServer()).get(`/api/v1/approvals/${id}`).set(auth()).expect(200);
    expect(detail.body.data.status).toBe('PENDING');
    expect(detail.body.data.currentNode).toBe(0);
    expect(detail.body.data.nodes[0].actedUserIds).toContain(fin1Id);
    // fin1 已审，退出自己待办
    const fin1Todos = await request(app.getHttpServer()).get('/api/v1/approvals/todos').set('Authorization', `Bearer ${fin1Token}`).expect(200);
    expect(fin1Todos.body.data.some((x: any) => x.id === id)).toBe(false);
    // fin2 仍在待办
    const fin2Todos = await request(app.getHttpServer()).get('/api/v1/approvals/todos').set('Authorization', `Bearer ${fin2Token}`).expect(200);
    expect(fin2Todos.body.data.some((x: any) => x.id === id)).toBe(true);

    // fin2 通过 → 会签齐，推进到节点1
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`).set('Authorization', `Bearer ${fin2Token}`).send({ comment: 'fin2' }).expect(201);
    detail = await request(app.getHttpServer()).get(`/api/v1/approvals/${id}`).set(auth()).expect(200);
    expect(detail.body.data.currentNode).toBe(1);
    expect(detail.body.data.status).toBe('PENDING');

    // 终审(OR) admin 通过 → APPROVED
    await request(app.getHttpServer()).post(`/api/v1/approvals/${id}/approve`).set(auth()).send({ comment: '终审' }).expect(201);
    detail = await request(app.getHttpServer()).get(`/api/v1/approvals/${id}`).set(auth()).expect(200);
    expect(detail.body.data.status).toBe('APPROVED');
  });
});
