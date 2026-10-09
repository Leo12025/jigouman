// 通知中心 e2e（M8 待办中心·提醒推送，文档 §4.26 / §6.6）：任务创建即推送站内通知、未读统计、标记已读。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('通知中心 Notification (e2e, SQLite)', () => {
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

  it('创建任务自动推送站内通知（提醒），可标记已读', async () => {
    // 创建任务，负责人=自己 → 应产生 TASK_ASSIGNED 通知
    await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set(auth())
      .send({ type: 'AFTER_CLASS_REVIEW', title: '课后点评-通知', assigneeId: userId })
      .expect(201);

    const unreadBefore = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(auth())
      .expect(200);
    expect(unreadBefore.body.data.count).toBeGreaterThanOrEqual(1);

    const list = await request(app.getHttpServer())
      .get('/api/v1/notifications?unreadOnly=1')
      .set(auth())
      .expect(200);
    const n = list.body.data.list.find((x: any) => x.type === 'TASK_ASSIGNED' && x.refType === 'AFTER_CLASS_REVIEW');
    expect(n).toBeDefined();
    expect(n.content).toContain('课后点评-通知');

    // 标记已读
    await request(app.getHttpServer())
      .put(`/api/v1/notifications/${n.id}/read`)
      .set(auth())
      .expect(200);
    const unreadAfter = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(auth())
      .expect(200);
    expect(unreadAfter.body.data.count).toBe(unreadBefore.body.data.count - 1);
  });

  it('全部标记已读', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/notifications/read-all')
      .set(auth())
      .expect(200);
    const unread = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(auth())
      .expect(200);
    expect(unread.body.data.count).toBe(0);
  });
});
