// 积分会员(§4.19) + 问卷(§4.22) + 看板预警(§4.10) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('P2 会员/问卷/预警 (e2e, SQLite)', () => {
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

  it('会员：建等级 → 发积分自动升级 → 流水', async () => {
    await request(app.getHttpServer()).post('/api/v1/membership/levels').set(auth())
      .send({ name: 'VIP', level: 2, minPoints: 100, discount: 10 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/membership/members/1/points').set(auth())
      .send({ studentId: 1, points: 120, refType: 'ORDER' }).expect(201);
    const m = await request(app.getHttpServer()).get('/api/v1/membership/members/1').set(auth()).expect(200);
    expect(m.body.data.totalPoints).toBe(120);
    expect(m.body.data.levelId).toBeTruthy();
    const lg = await request(app.getHttpServer()).get('/api/v1/membership/members/1/ledger').set(auth()).expect(200);
    expect(lg.body.data.length).toBe(1);
  });

  it('问卷：建模板 → 提交 → 统计', async () => {
    const tpl = await request(app.getHttpServer()).post('/api/v1/surveys/templates').set(auth())
      .send({ title: '结课满意度', type: 'NPS' }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/surveys/submit').set(auth())
      .send({ templateId: tpl.body.data.id, studentId: 1, score: 9 }).expect(201);
    const stats = await request(app.getHttpServer()).get(`/api/v1/surveys/stats/${tpl.body.data.id}`).set(auth()).expect(200);
    expect(stats.body.data.count).toBe(1);
    expect(stats.body.data.avgScore).toBe(9);
  });

  it('预警：建规则 → 模拟检查触发', async () => {
    await request(app.getHttpServer()).post('/api/v1/alert-rules').set(auth())
      .send({ name: '欠费预警', metric: 'ARREARS_AMOUNT', operator: 'GT', threshold: 1000, channel: 'INAPP' }).expect(201);
    const r = await request(app.getHttpServer()).post('/api/v1/alert-rules/check').set(auth())
      .send({ metrics: { ARREARS_AMOUNT: 5000 } }).expect(201);
    expect(r.body.data.triggered.length).toBeGreaterThanOrEqual(1);
  });
});
