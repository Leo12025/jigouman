// 端到端冒烟测试：无 Docker，使用 SQLite 内存库即可运行。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('机构管理系统 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let channelId: number;
  let leadId: number;
  let classGroupId: number;
  let m4StudentId: number;
  let m4CourseId: number;
  let m4OrderId: number;
  let m4LessonId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    // 复现 main.ts 的全局统一响应包装，便于断言 res.body.code/data
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  it('POST /api/v1/auth/login 返回 JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.accessToken).toBeDefined();
    token = res.body.data.accessToken;
  });

  it('未携带 token 访问业务接口应 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/courses').expect(401);
  });

  it('带 token 可创建并列出课程(RBAC 通过)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '数学一对一', type: 'ONE_ON_ONE', price: 200, totalHours: 10 })
      .expect(201);
    expect(created.body.data.id).toBeGreaterThan(0);

    const list = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.list.length).toBeGreaterThan(0);
  });

  it('排课冲突检测：同一老师同时段重复排课应被拦截', async () => {
    // 先建班级
    const cg = await request(app.getHttpServer())
      .post('/api/v1/courses/class-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: 1, name: '测试班', teacherId: 99, capacity: 10 })
      .expect(201);
    classGroupId = cg.body.data.id;

    const lesson = {
      classGroupId,
      courseId: 1,
      teacherId: 99,
      startTime: '2026-10-10T09:00:00',
      endTime: '2026-10-10T10:00:00',
    };
    await request(app.getHttpServer())
      .post('/api/v1/courses/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send(lesson)
      .expect(201);

    // 同一老师同段再排 → 应 409
    await request(app.getHttpServer())
      .post('/api/v1/courses/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send(lesson)
      .expect(409);
  });

  it('班级详情：课次装配正确(普通外键列，不走 relations)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/courses/class-groups/${classGroupId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.id).toBe(classGroupId);
    expect(Array.isArray(res.body.data.lessons)).toBe(true);
    expect(res.body.data.lessons.length).toBeGreaterThan(0);
  });

  it('M4 订单/课时：下单→支付→发放课时→点名消课→退费回滚', async () => {
    // 学员
    const stu = await request(app.getHttpServer())
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'M4学员', gender: 1 })
      .expect(201);
    m4StudentId = stu.body.data.id;

    // 课程（20 课时）
    const course = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'M4课程', type: 'ONE_ON_ONE', price: 1000, totalHours: 20 })
      .expect(201);
    m4CourseId = course.body.data.id;

    // 下单
    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: m4StudentId,
        discountAmount: 0,
        items: [{ courseId: m4CourseId, name: 'M4课程', qty: 1, unitPrice: 1000, hours: 20 }],
      })
      .expect(201);
    m4OrderId = order.body.data.id;
    expect(order.body.data.status).toBe('PENDING');
    expect(Number(order.body.data.payableAmount)).toBe(1000);

    // 支付 → 自动发放课时
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${m4OrderId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channel: 'OFFLINE' })
      .expect(201);

    let hours = await request(app.getHttpServer())
      .get(`/api/v1/students/${m4StudentId}/hours`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(hours.body.data[0].balance).toBe(20);

    // 建班级 → 报名 → 排课，用于点名消课
    const cg = await request(app.getHttpServer())
      .post('/api/v1/courses/class-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: m4CourseId, name: 'M4班', teacherId: 77, capacity: 5 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/students/courses/enroll')
      .set('Authorization', `Bearer ${token}`)
      .send({ studentId: m4StudentId, courseId: m4CourseId, classGroupId: cg.body.data.id })
      .expect(201);
    const lesson = await request(app.getHttpServer())
      .post('/api/v1/courses/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        classGroupId: cg.body.data.id,
        courseId: m4CourseId,
        teacherId: 77,
        startTime: '2026-11-01T09:00:00',
        endTime: '2026-11-01T10:00:00',
      })
      .expect(201);
    m4LessonId = lesson.body.data.id;

    // 点名消课（出勤扣 1 课时）
    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${m4LessonId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ records: [{ studentId: m4StudentId, status: 'PRESENT' }] })
      .expect(201);
    hours = await request(app.getHttpServer())
      .get(`/api/v1/students/${m4StudentId}/hours`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(hours.body.data[0].balance).toBe(19);

    // 退费申请（待审批）→ 审批通过触发课时回滚
    // 已消 1 课时，按消课比例扣费后可退 = 19 × 50 = 950（§4.5）
    const refund = await request(app.getHttpServer())
      .post(`/api/v1/orders/${m4OrderId}/refund`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 950, reason: 'e2e' })
      .expect(201);
    expect(refund.body.data.status).toBe('PENDING');
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${m4OrderId}/refund/${refund.body.data.id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    hours = await request(app.getHttpServer())
      .get(`/api/v1/students/${m4StudentId}/hours`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(hours.body.data[0].balance).toBe(0);
  }, 30000);

  it('M4 进阶：退费比例/分账/工资/发票/补课/点评任务(§4.5/§4.6)', async () => {
    const period = new Date().toISOString().slice(0, 7);
    const stu = await request(app.getHttpServer())
      .post('/api/v1/students').set('Authorization', `Bearer ${token}`)
      .send({ name: 'M4b学员', gender: 1 }).expect(201);
    const sid = stu.body.data.id;
    const course = await request(app.getHttpServer())
      .post('/api/v1/courses').set('Authorization', `Bearer ${token}`)
      .send({ name: 'M4b课程', type: 'ONE_ON_ONE', price: 1000, totalHours: 20 }).expect(201);
    const cid = course.body.data.id;

    const order = await request(app.getHttpServer())
      .post('/api/v1/orders').set('Authorization', `Bearer ${token}`)
      .send({ studentId: sid, discountAmount: 0, items: [{ courseId: cid, name: 'M4b课程', qty: 1, unitPrice: 1000, hours: 20 }] })
      .expect(201);
    const oid = order.body.data.id;
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${oid}/pay`).set('Authorization', `Bearer ${token}`)
      .send({ channel: 'OFFLINE' }).expect(201);

    let h = await request(app.getHttpServer()).get(`/api/v1/students/${sid}/hours`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(h.body.data[0].balance).toBe(20);

    // 退费预览：未消课时可退全额
    const pv0 = await request(app.getHttpServer()).get(`/api/v1/orders/${oid}/refund-preview`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(pv0.body.data.remainingHours).toBe(20);
    expect(pv0.body.data.consumedHours).toBe(0);
    expect(Number(pv0.body.data.refundable)).toBe(1000);

    // 排课 + 点名消课（触发分账 + 点评任务）
    const cg = await request(app.getHttpServer())
      .post('/api/v1/courses/class-groups').set('Authorization', `Bearer ${token}`)
      .send({ courseId: cid, name: 'M4b班', teacherId: 88, capacity: 5 }).expect(201);
    const lesson = await request(app.getHttpServer())
      .post('/api/v1/courses/lessons').set('Authorization', `Bearer ${token}`)
      .send({ classGroupId: cg.body.data.id, courseId: cid, teacherId: 88, startTime: '2026-12-01T09:00:00', endTime: '2026-12-01T10:00:00' })
      .expect(201);
    const lid = lesson.body.data.id;
    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${lid}/attendance`).set('Authorization', `Bearer ${token}`)
      .send({ records: [{ studentId: sid, status: 'PRESENT' }] }).expect(201);
    h = await request(app.getHttpServer()).get(`/api/v1/students/${sid}/hours`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(h.body.data[0].balance).toBe(19);

    // 分账记录：教师提成 = 课时价值(单价50 × 1课时) × 30% = 15
    const splits = await request(app.getHttpServer()).get(`/api/v1/finance/splits?teacherId=88`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(splits.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(Number(splits.body.data.list[0].amount)).toBe(15);

    // 待办中心：自动生成课后点评任务
    const tasks = await request(app.getHttpServer()).get(`/api/v1/tasks?type=AFTER_CLASS_REVIEW&refId=${lid}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(tasks.body.data.list.length).toBeGreaterThanOrEqual(1);

    // 退费预览：已消 1 课时后按消课比例扣费
    const pv1 = await request(app.getHttpServer()).get(`/api/v1/orders/${oid}/refund-preview`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(pv1.body.data.remainingHours).toBe(19);
    expect(pv1.body.data.consumedHours).toBe(1);
    expect(Number(pv1.body.data.refundable)).toBe(950);
    // 超过可退余额应被拒绝
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${oid}/refund`).set('Authorization', `Bearer ${token}`)
      .send({ amount: 999 }).expect(400);

    // 工资：按周期聚合分账生成工资单
    await request(app.getHttpServer()).post(`/api/v1/finance/salary/generate`).set('Authorization', `Bearer ${token}`).send({ period }).expect(201);
    const salary = await request(app.getHttpServer()).get(`/api/v1/finance/salary?teacherId=88`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(salary.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(Number(salary.body.data.list[0].baseAmount)).toBeGreaterThanOrEqual(15);

    // 发票：申请 → 开具
    const inv = await request(app.getHttpServer()).post(`/api/v1/finance/invoices`).set('Authorization', `Bearer ${token}`)
      .send({ orderId: oid, studentId: sid, title: 'e2e发票', amount: 500 }).expect(201);
    await request(app.getHttpServer()).put(`/api/v1/finance/invoices/${inv.body.data.id}/issue`).set('Authorization', `Bearer ${token}`).expect(200);
    const invGot = await request(app.getHttpServer()).get(`/api/v1/finance/invoices/${inv.body.data.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(invGot.body.data.status).toBe('ISSUED');
    expect(invGot.body.data.invoiceNo).toBeTruthy();

    // 补课排课
    const mk = await request(app.getHttpServer()).post(`/api/v1/lessons/makeup`).set('Authorization', `Bearer ${token}`)
      .send({ studentId: sid, courseId: cid, teacherId: 88, startTime: '2026-12-05T09:00:00', endTime: '2026-12-05T10:00:00' }).expect(201);
    expect(mk.body.data.type).toBe('MAKEUP');

    // 财务报表汇总
    const sum = await request(app.getHttpServer()).get(`/api/v1/finance/summary`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(sum.body.data).toHaveProperty('profit');
  }, 30000);

  it('M5 作业闭环(§4.7)：布置→家长提交→批改→统计→未提交名单', async () => {
    // 学员 + 课程 + 班级 + 报名
    const stu = await request(app.getHttpServer()).post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`).send({ name: 'M5学员', gender: 1 }).expect(201);
    const sid = stu.body.data.id;
    const course = await request(app.getHttpServer()).post('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'M5课程', type: 'ONE_ON_ONE', price: 1000, totalHours: 20 }).expect(201);
    const cg = await request(app.getHttpServer()).post('/api/v1/courses/class-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: course.body.data.id, name: 'M5班', teacherId: 77, capacity: 5 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/students/courses/enroll')
      .set('Authorization', `Bearer ${token}`)
      .send({ studentId: sid, courseId: course.body.data.id, classGroupId: cg.body.data.id }).expect(201);

    // 布置作业
    const hw = await request(app.getHttpServer()).post('/api/v1/homework')
      .set('Authorization', `Bearer ${token}`)
      .send({ classGroupId: cg.body.data.id, courseId: course.body.data.id, title: 'M5作业', content: '练习1-10' })
      .expect(201);
    const hwId = hw.body.data.id;

    // 家长端：OTP → 登录 → 绑定学员
    const otp = await request(app.getHttpServer()).post('/api/v1/parents/otp')
      .send({ phone: '13800000001' }).expect(201);
    expect(otp.body.data.code).toBeTruthy();
    const login = await request(app.getHttpServer()).post('/api/v1/parents/login')
      .send({ phone: '13800000001', code: otp.body.data.code }).expect(201);
    const parentToken = login.body.data.accessToken;
    expect(parentToken).toBeTruthy();

    await request(app.getHttpServer()).post('/api/v1/parents/bind')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentId: sid, parentName: 'M5家长', relation: '母亲' }).expect(201);

    const mine = await request(app.getHttpServer()).get('/api/v1/parents/students')
      .set('Authorization', `Bearer ${parentToken}`).expect(200);
    expect(mine.body.data.some((s: any) => Number(s.studentId) === Number(sid))).toBe(true);

    // 我的作业：应能看到该作业且未提交
    const myHw = await request(app.getHttpServer()).get('/api/v1/parents/homeworks')
      .set('Authorization', `Bearer ${parentToken}`).expect(200);
    expect(myHw.body.data.some((h: any) => Number(h.homeworkId) === Number(hwId) && !h.submitted)).toBe(true);

    // 越权：提交未绑定学员应被拒绝
    const other = await request(app.getHttpServer()).post('/api/v1/students')
      .set('Authorization', `Bearer ${token}`).send({ name: 'M5未绑定', gender: 1 }).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/homework/${hwId}/submit`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentId: other.body.data.id, content: '越权提交' }).expect(403);

    // 家长提交作业
    const submit = await request(app.getHttpServer()).post(`/api/v1/homework/${hwId}/submit`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentId: sid, content: '已完成', files: ['photo1.jpg'] }).expect(201);
    expect(submit.body.data.submitAt).toBeTruthy();
    const submitId = submit.body.data.id;

    // 老师批改
    const review = await request(app.getHttpServer())
      .post(`/api/v1/homework/submit/${submitId}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ score: 95, comment: '完成得很好', isExcellent: 1 }).expect(201);
    expect(Number(review.body.data.score)).toBe(95);

    // 统计：提交率/按时率/优秀率
    const stats = await request(app.getHttpServer()).get(`/api/v1/homework/${hwId}/stats`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(stats.body.data.submittedCount).toBe(1);
    expect(stats.body.data.submitRate).toBe(100);
    expect(stats.body.data.excellentCount).toBe(1);

    // 未提交名单：已提交后应为空
    const pending = await request(app.getHttpServer()).get(`/api/v1/homework/${hwId}/unsubmitted`)
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(pending.body.data.length).toBe(0);

    // 课后点评 → 家长可见（§6.6 / §11.6）
    await request(app.getHttpServer()).post('/api/v1/course-reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ studentId: sid, courseId: course.body.data.id, content: '课堂表现积极', rating: 5 }).expect(201);
    const myReviews = await request(app.getHttpServer()).get('/api/v1/parents/reviews')
      .set('Authorization', `Bearer ${parentToken}`).expect(200);
    expect(myReviews.body.data.some((r: any) => Number(r.studentId) === Number(sid))).toBe(true);
  }, 30000);

  it('M3 渠道：可创建并列出渠道', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/channels')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '抖音', type: 'DOUYIN', cost: 1000, source: 'douyin' })
      .expect(201);
    expect(res.body.data.id).toBeGreaterThan(0);
    channelId = res.body.data.id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/channels')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.some((c: any) => c.id === channelId)).toBe(true);
  });

  it('M3 线索：新建为 NEW → 分配后 FOLLOWING → 跟进', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '张小明', phone: '13800001111', channelId, gender: 1 })
      .expect(201);
    leadId = created.body.data.id;
    expect(created.body.data.stage).toBe('NEW');

    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ownerId: 7 })
      .expect(201);
    expect(assigned.body.data.stage).toBe('FOLLOWING');
    expect(assigned.body.data.ownerId).toBe(7);

    const followed = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/follow`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'CALL', content: '首次电话沟通，意向数学一对一' })
      .expect(201);
    expect(followed.body.data.leadId).toBe(leadId);
  });

  it('M3 试听：到课后线索阶段推进为 TRIALED', async () => {
    const trial = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/trials`)
      .set('Authorization', `Bearer ${token}`)
      .send({ attended: true, feedback: '试听表现良好' })
      .expect(201);
    expect(trial.body.data.attended).toBe(1);

    const lead = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(lead.body.data.stage).toBe('TRIALED');
  });

  it('M3 转化：线索转学员(SIGNED)并打通学员档案', async () => {
    const converted = await request(app.getHttpServer())
      .post(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    const studentId = converted.body.data.studentId;
    expect(studentId).toBeGreaterThan(0);

    // 学员档案已建立并绑定家长
    const student = await request(app.getHttpServer())
      .get(`/api/v1/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(student.body.data.name).toBe('张小明');
    expect(student.body.data.parents.length).toBe(1);
    expect(student.body.data.parents[0].phone).toBe('13800001111');

    // 线索回写学员ID + 阶段 SIGNED
    const lead = await request(app.getHttpServer())
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(lead.body.data.stage).toBe('SIGNED');
    expect(lead.body.data.convertedStudentId).toBe(studentId);
  });

  it('M3 漏斗：按阶段统计并给出转化率', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/leads/funnel?channelId=${channelId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.byStage.SIGNED).toBe(1);
    expect(res.body.data.conversionRate).toBeGreaterThan(0);
  });

  it('M1 刷新令牌：refreshToken 可换取新 accessToken', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    const refreshToken = login.body.data.refreshToken;
    expect(refreshToken).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    expect(res.body.data.accessToken).toBeTruthy();

    // 新 accessToken 可访问业务接口
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${res.body.data.accessToken}`)
      .expect(200);

    // 刷新令牌不能当访问令牌用
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);
  });

  it('M1 用户/角色/权限管理接口可用', async () => {
    // 权限点
    const perms = await request(app.getHttpServer())
      .get('/api/v1/permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(perms.body.data.length).toBeGreaterThan(0);

    // 新建角色并分配权限
    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'e2e_role', name: 'E2E角色', dataScope: 'org' })
      .expect(201);
    const roleId = role.body.data.id;

    // 新建用户并绑定该角色
    const user = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'e2e_user', password: 'e2e123456', name: 'E2E用户', roleIds: [roleId] })
      .expect(201);
    expect(user.body.data.passwordHash).toBeUndefined();
    expect(user.body.data.roles[0].id).toBe(roleId);

    // 列表可见
    const list = await request(app.getHttpServer())
      .get('/api/v1/users?keyword=e2e_user')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.total).toBe(1);

    // 不能删除当前登录账号
    await request(app.getHttpServer())
      .delete(`/api/v1/users/1`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('M2 批量排课：按周生成课次并跳过冲突时段', async () => {
    // 2026-10-05 是周一；生成 10/05~10/11 两周的周一课次
    const res = await request(app.getHttpServer())
      .post('/api/v1/courses/lessons/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        classGroupId,
        startDate: '2026-10-05',
        endDate: '2026-10-18',
        slots: [{ weekday: 1, start: '14:00', end: '15:00' }],
      })
      .expect(201);
    // 10/05, 10/12 两次（与已有 09:00 课次不冲突）
    expect(res.body.data.createdCount).toBe(2);
    expect(res.body.data.skippedCount).toBe(0);

    // 重复生成同一时段 → 全部冲突被跳过
    const again = await request(app.getHttpServer())
      .post('/api/v1/courses/lessons/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        classGroupId,
        startDate: '2026-10-05',
        endDate: '2026-10-18',
        slots: [{ weekday: 1, start: '14:00', end: '15:00' }],
      })
      .expect(201);
    expect(again.body.data.createdCount).toBe(0);
    expect(again.body.data.skippedCount).toBe(2);
  });

  afterAll(async () => {
    await app.close();
  });
});
