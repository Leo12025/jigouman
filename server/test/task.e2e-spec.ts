// 待办中心 e2e（M8-待办中心补全，文档 §4.26 / §6.20）：逾期派生、我的待办、聚合统计、作业提交→待批改事件化闭环。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('待办中心 Task (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;

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
        transformOptions: { enableImplicitConversion: true },
      }),
    );
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

  it('未携带 token 访问我的待办应 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/tasks/todos').expect(401);
  });

  it('创建逾期任务并标记 overdue（§4.26 逾期派生）', async () => {
    const dueAt = new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 2 小时前
    const create = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set(auth())
      .send({ type: 'AFTER_CLASS_REVIEW', title: '课后点评 e2e', assigneeId: userId, dueAt })
      .expect(201);
    const id = create.body.data.id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/tasks')
      .set(auth())
      .expect(200);
    const found = list.body.data.list.find((t: any) => t.id === id);
    expect(found).toBeDefined();
    expect(found.overdue).toBe(true);
    expect(found.overdueHours).toBeGreaterThan(0);
  });

  it('我的待办（/tasks/todos）按当前登录人聚合', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos')
      .set(auth())
      .expect(200);
    expect(res.body.data.list.length).toBeGreaterThan(0);
    expect(res.body.data.list.every((t: any) => t.assigneeId === userId && t.status === 'TODO')).toBe(true);
  });

  it('聚合统计（/tasks/stats）：总数/逾期/按类型', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tasks/stats')
      .set(auth())
      .expect(200);
    const d = res.body.data;
    expect(d).toHaveProperty('total');
    expect(d).toHaveProperty('overdue');
    expect(d).toHaveProperty('severeOverdue');
    expect(Array.isArray(d.byType)).toBe(true);
    expect(d.overdue).toBeGreaterThanOrEqual(1);
  });

  it('完成任务后聚合总数递减', async () => {
    const before = await request(app.getHttpServer())
      .get('/api/v1/tasks/stats')
      .set(auth())
      .expect(200);
    const list = await request(app.getHttpServer())
      .get('/api/v1/tasks')
      .set(auth())
      .expect(200);
    const target = list.body.data.list.find((t: any) => t.status === 'TODO');
    await request(app.getHttpServer())
      .put(`/api/v1/tasks/${target.id}/complete`)
      .set(auth())
      .expect(200);
    const after = await request(app.getHttpServer())
      .get('/api/v1/tasks/stats')
      .set(auth())
      .expect(200);
    expect(after.body.data.total).toBe(before.body.data.total - 1);
  });

  it('作业提交→自动生成「待批改」任务，批改后关闭（§4.26 事件化闭环）', async () => {
    const hw = await request(app.getHttpServer())
      .post('/api/v1/homework')
      .set(auth())
      .send({ title: 'e2e 作业', teacherId: userId })
      .expect(201);
    const hwId = hw.body.data.id;

    const submit = await request(app.getHttpServer())
      .post(`/api/v1/homework/${hwId}/submit`)
      .set(auth())
      .send({ studentId: 1, content: 'e2e 提交' })
      .expect(201);
    const submitId = submit.body.data.id;

    // 提交后应出现「待批改」任务（assignee=布置老师）
    const todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=HOMEWORK_REVIEW')
      .set(auth())
      .expect(200);
    expect(todos.body.data.list.length).toBe(1);
    expect(todos.body.data.list[0].refId).toBe(submitId);

    // 批改后该待办应关闭（不再出现在我的未办中）
    await request(app.getHttpServer())
      .post(`/api/v1/homework/submit/${submitId}/review`)
      .set(auth())
      .send({ score: 90, comment: 'good' })
      .expect(201);
    const afterReview = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=HOMEWORK_REVIEW')
      .set(auth())
      .expect(200);
    expect(afterReview.body.data.list.length).toBe(0);
  });
});
