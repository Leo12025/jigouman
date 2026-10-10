// 看板动态指标定义(§4.10 增强) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('看板动态指标定义 (e2e, SQLite)', () => {
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

  it('动态指标 CRUD + 看板挂载', async () => {
    // 新增
    const c = await request(app.getHttpServer()).post('/api/v1/dashboards/metrics').set(auth())
      .send({ code: 'TRIAL_CONVERSION', name: '试听转化率', category: 'admission', unit: '%', enabled: true, sort: 1 })
      .expect(201);
    const id = c.body.data.id;
    expect(c.body.data.code).toBe('TRIAL_CONVERSION');

    // 列表
    const list = await request(app.getHttpServer()).get('/api/v1/dashboards/metrics').set(auth())
      .expect(200);
    expect(list.body.data.list.some((m: any) => m.id === id)).toBe(true);

    // 更新
    await request(app.getHttpServer()).put(`/api/v1/dashboards/metrics/${id}`).set(auth())
      .send({ name: '试听转化(改)', enabled: false }).expect(200);

    // 看板按角色返回 dynamicMetrics（含该指标，enabled=false 则不挂载）
    const dash = await request(app.getHttpServer()).get('/api/v1/dashboards/admission').set(auth())
      .expect(200);
    expect(Array.isArray(dash.body.data.dynamicMetrics)).toBe(true);
    expect(dash.body.data.dynamicMetrics.some((m: any) => m.code === 'TRIAL_CONVERSION')).toBe(false);

    // 重新启用后挂载
    await request(app.getHttpServer()).put(`/api/v1/dashboards/metrics/${id}`).set(auth())
      .send({ enabled: true }).expect(200);
    const dash2 = await request(app.getHttpServer()).get('/api/v1/dashboards/admission').set(auth())
      .expect(200);
    const hit = dash2.body.data.dynamicMetrics.find((m: any) => m.code === 'TRIAL_CONVERSION');
    expect(hit).toBeTruthy();
    expect(typeof hit.value).toBe('number');

    // 删除
    await request(app.getHttpServer()).delete(`/api/v1/dashboards/metrics/${id}`).set(auth())
      .expect(200);
  });
});
