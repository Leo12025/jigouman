// 学员全生命周期聚合(§学员视图) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('学员全生命周期 (e2e, SQLite)', () => {
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

  it('线索→试听→转化购课 全链路聚合', async () => {
    // 1) 线索
    const lead = await request(app.getHttpServer()).post('/api/v1/leads').set(auth())
      .send({ name: '小明家长', phone: '13900000001', intentionCourse: '钢琴' }).expect(201);
    const leadId = lead.body.data.id;

    // 2) 到店试听
    await request(app.getHttpServer()).post(`/api/v1/leads/${leadId}/trials`).set(auth())
      .send({ trialAt: '2026-10-01 10:00', attended: true, feedback: '很好' }).expect(201);

    // 3) 转化为学员（打通 CRM→学员）
    const conv = await request(app.getHttpServer()).post(`/api/v1/leads/${leadId}/convert`).set(auth())
      .send({ studentName: '小明', gender: 1 }).expect(201);
    const sid = conv.body.data.studentId;

    // 4) 购课（下单）
    await request(app.getHttpServer()).post('/api/v1/orders').set(auth())
      .send({ studentId: sid, items: [{ courseId: 5, name: '钢琴入门', qty: 1, unitPrice: 2000, hours: 20 }] })
      .expect(201);

    // 5) 全生命周期聚合
    const lc = await request(app.getHttpServer()).get(`/api/v1/students/${sid}/lifecycle`).set(auth()).expect(200);
    expect(lc.body.data.lead).not.toBeNull();
    expect(lc.body.data.lead.trials.length).toBe(1);
    expect(lc.body.data.purchase.orders.length).toBe(1);
    expect(lc.body.data.summary.hasLead).toBe(true);
    expect(lc.body.data.summary.orderCount).toBe(1);
    expect(Array.isArray(lc.body.data.events)).toBe(true);
    expect(lc.body.data.events.length).toBeGreaterThanOrEqual(3);
  });
});
