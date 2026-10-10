// 分销裂变(§4.28) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('分销裂变 (e2e, SQLite)', () => {
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

  it('新增分销员 → 登记佣金 → 结算 → 汇总', async () => {
    const d = await request(app.getHttpServer()).post('/api/v1/distribution/distributors').set(auth())
      .send({ name: '推广员A', phone: '13800000000', level: 1, status: 'ACTIVE' }).expect(201);
    const distId = d.body.data.id;
    expect(d.body.data.inviteCode).toBeTruthy();

    await request(app.getHttpServer()).post('/api/v1/distribution/commissions').set(auth())
      .send({ distributorId: distId, amount: 100, orderId: 9001 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/distribution/commissions').set(auth())
      .send({ distributorId: distId, amount: 200, orderId: 9002 }).expect(201);

    const list = await request(app.getHttpServer()).get('/api/v1/distribution/commissions').set(auth())
      .query({ distributorId: distId }).expect(200);
    expect(list.body.data.length).toBe(2);

    const stats = await request(app.getHttpServer()).get('/api/v1/distribution/stats').set(auth()).expect(200);
    expect(stats.body.data.total).toBe(300);
    expect(stats.body.data.byStatus.PENDING).toBe(300);
  });

  it('分销层级树可构建', async () => {
    const parent = await request(app.getHttpServer()).post('/api/v1/distribution/distributors').set(auth())
      .send({ name: '上级', level: 2 }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/distribution/distributors').set(auth())
      .send({ name: '下级', parentId: parent.body.data.id, level: 1 }).expect(201);
    const tree = await request(app.getHttpServer()).get('/api/v1/distribution/distributors/tree').set(auth()).expect(200);
    expect(Array.isArray(tree.body.data)).toBe(true);
    expect(tree.body.data.some((n: any) => n.children && n.children.length > 0)).toBe(true);
  });
});
