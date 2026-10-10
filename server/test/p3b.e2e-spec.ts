// 教材库存(§4.20) + 机构成本(§4.21) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('教材库存/机构成本 (e2e, SQLite)', () => {
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

  it('库存：建物料 → 入库 → 出库 → 流水', async () => {
    const m = await request(app.getHttpServer()).post('/api/v1/materials').set(auth())
      .send({ name: '钢琴教材', category: '教材', stockQty: 0, warningQty: 5 }).expect(201);
    const id = m.body.data.id;

    await request(app.getHttpServer()).post(`/api/v1/materials/${id}/stock`).set(auth())
      .send({ type: 'IN', qty: 20 }).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/materials/${id}/stock`).set(auth())
      .send({ type: 'OUT', qty: 3 }).expect(201);

    const detail = await request(app.getHttpServer()).get(`/api/v1/materials/${id}`).set(auth()).expect(200);
    expect(detail.body.data.stockQty).toBe(17);

    const mv = await request(app.getHttpServer()).get(`/api/v1/materials/${id}/movements`).set(auth()).expect(200);
    expect(mv.body.data.length).toBe(2);
  });

  it('成本：登记 → 列表 → 汇总', async () => {
    await request(app.getHttpServer()).post('/api/v1/costs').set(auth())
      .send({ category: 'RENT', amount: 5000 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/costs').set(auth())
      .send({ category: 'SALARY', amount: 12000 }).expect(201);
    const stats = await request(app.getHttpServer()).get('/api/v1/costs/stats/by-category').set(auth()).expect(200);
    expect(stats.body.data.total).toBe(17000);
    expect(stats.body.data.byCategory.RENT).toBe(5000);
  });
});
