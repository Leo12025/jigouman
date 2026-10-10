// 团购拼团(§4.24) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('团购拼团 (e2e, SQLite)', () => {
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

  it('建活动 → 开团 → 参团满员成团 → 核销 闭环', async () => {
    // 1) 建拼团活动（成团人数 2）
    const a = await request(app.getHttpServer()).post('/api/v1/group-buy/activities').set(auth())
      .send({ name: '暑期拼团课', price: 99.9, groupSize: 2, status: 'ACTIVE' }).expect(201);
    const actId = a.body.data.id;

    // 2) 开团（团长）
    const t = await request(app.getHttpServer()).post('/api/v1/group-buy/teams').set(auth())
      .send({ activityId: actId, leaderStudentId: 1001 }).expect(201);
    const code = t.body.data.code;
    expect(t.body.data.currentSize).toBe(1);
    expect(t.body.data.status).toBe('OPEN');

    // 3) 参团（自动成团）
    const j = await request(app.getHttpServer()).post('/api/v1/group-buy/teams/join').set(auth())
      .send({ code, studentId: 1002 }).expect(201);
    expect(j.body.data.currentSize).toBe(2);
    expect(j.body.data.status).toBe('SUCCESS');

    // 4) 重复参团应被拒
    await request(app.getHttpServer()).post('/api/v1/group-buy/teams/join').set(auth())
      .send({ code, studentId: 1002 }).expect(400);

    // 5) 核销（已成团）
    const r = await request(app.getHttpServer()).post('/api/v1/group-buy/redeem').set(auth())
      .send({ code }).expect(201);
    expect(r.body.data.status).toBe('REDEEMED');
  });

  it('未成团不可核销', async () => {
    const a = await request(app.getHttpServer()).post('/api/v1/group-buy/activities').set(auth())
      .send({ name: '三人团', price: 199, groupSize: 3, status: 'ACTIVE' }).expect(201);
    const t = await request(app.getHttpServer()).post('/api/v1/group-buy/teams').set(auth())
      .send({ activityId: a.body.data.id, leaderStudentId: 2001 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/group-buy/redeem').set(auth())
      .send({ code: t.body.data.code }).expect(400);
  });
});
