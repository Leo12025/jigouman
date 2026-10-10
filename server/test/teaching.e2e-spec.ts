// 在线课堂/督学(§4.13) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('在线课堂/督学 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

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

  it('建课堂 → 开始 → 结束 → 督学打卡 → 出勤统计', async () => {
    const c = await request(app.getHttpServer()).post('/api/v1/teaching/classes').set(auth())
      .send({ title: '直播公开课', teacherId: 8001, status: 'SCHEDULED' }).expect(201);
    const classId = c.body.data.id;

    await request(app.getHttpServer()).post(`/api/v1/teaching/classes/${classId}/start`).set(auth()).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/teaching/classes/${classId}/end`).set(auth()).expect(201);

    await request(app.getHttpServer()).post('/api/v1/teaching/study').set(auth())
      .send({ classId, studentId: 7001, status: 'PRESENT', durationSec: 1200 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/teaching/study').set(auth())
      .send({ classId, studentId: 7002, status: 'LATE', durationSec: 800 }).expect(201);

    const stats = await request(app.getHttpServer()).get(`/api/v1/teaching/study/stats/${classId}`).set(auth()).expect(200);
    expect(stats.body.data.total).toBe(2);
    expect(stats.body.data.byStatus.PRESENT).toBe(1);
    expect(stats.body.data.byStatus.LATE).toBe(1);
  });
});
