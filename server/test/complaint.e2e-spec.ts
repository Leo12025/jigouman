// 客诉管理 e2e（§4.26 客诉分派→COMPLAINT 待办；§6.23 客诉/售后）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('客诉管理 Complaint (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;
  let teacherId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }),
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

    const tu = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'teacher1', password: '123456', name: 'Teacher One' })
      .expect(201);
    teacherId = tu.body.data.id;
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('校验：标题为空应 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(auth())
      .send({ content: 'x' })
      .expect(400);
  });

  it('建单即分派→生成 COMPLAINT 待办+通知；改派→关闭旧待办+新待办；处理→关闭', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set(auth())
      .send({ title: '教室空调太冷', content: '家长反馈教室温度低', level: 'MEDIUM', assigneeId: userId })
      .expect(201);
    const cid = create.body.data.id;
    expect(create.body.data.status).toBe('PROCESSING');

    const todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=COMPLAINT')
      .set(auth())
      .expect(200);
    const t = todos.body.data.list.find((x: any) => x.refType === 'COMPLAINT' && x.refId === cid);
    expect(t).toBeDefined();
    expect(t.assigneeId).toBe(userId);

    const notis = await request(app.getHttpServer())
      .get('/api/v1/notifications?unreadOnly=1')
      .set(auth())
      .expect(200);
    const n = notis.body.data.list.find(
      (x: any) => x.type === 'TASK_ASSIGNED' && x.refType === 'COMPLAINT' && x.refId === cid,
    );
    expect(n).toBeDefined();

    // 改派给 teacher
    const re = await request(app.getHttpServer())
      .put(`/api/v1/complaints/${cid}/assign`)
      .set(auth())
      .send({ assigneeId: teacherId })
      .expect(200);
    expect(re.body.data.assigneeId).toBe(teacherId);

    const all = await request(app.getHttpServer())
      .get(`/api/v1/tasks?type=COMPLAINT&refType=COMPLAINT&refId=${cid}`)
      .set(auth())
      .expect(200);
    const adminTask = all.body.data.list.find((x: any) => x.assigneeId === userId);
    const teacherTask = all.body.data.list.find((x: any) => x.assigneeId === teacherId);
    expect(adminTask.status).toBe('DONE');
    expect(teacherTask.status).toBe('TODO');

    // 处理完成 → 关闭 teacher 待办
    await request(app.getHttpServer())
      .post(`/api/v1/complaints/${cid}/resolve`)
      .set(auth())
      .send({ resolution: '已调高温度' })
      .expect(201);
    const after = await request(app.getHttpServer())
      .get(`/api/v1/tasks?type=COMPLAINT&refType=COMPLAINT&refId=${cid}`)
      .set(auth())
      .expect(200);
    expect(after.body.data.list.every((x: any) => x.status === 'DONE')).toBe(true);
  });

  it('列表筛选：按 status/level/处理人', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/complaints?status=RESOLVED&level=MEDIUM')
      .set(auth())
      .expect(200);
  });
});
