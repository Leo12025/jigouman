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
