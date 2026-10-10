// 老师考勤打卡(§11.6) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('老师考勤打卡 (e2e, SQLite)', () => {
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

  it('打卡 IN/OUT 并查询记录', async () => {
    const a = await request(app.getHttpServer()).post('/api/v1/attendance/clock').set(auth())
      .send({ teacherId: 10, type: 'IN' }).expect(201);
    expect(a.body.data.type).toBe('IN');
    await request(app.getHttpServer()).post('/api/v1/attendance/clock').set(auth())
      .send({ teacherId: 10, type: 'OUT' }).expect(201);

    const r = await request(app.getHttpServer()).get('/api/v1/attendance?teacherId=10').set(auth())
      .expect(200);
    expect(r.body.data.list.length).toBeGreaterThanOrEqual(2);
  });
});
