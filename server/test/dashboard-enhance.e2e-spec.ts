// 看板增强(§4.10)：多校区汇总 / 自定义报表 / 预警联动推送 e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('看板增强 dashboard-enhance (e2e, SQLite)', () => {
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

  it('多校区汇总对标：建校区+成本+库存后返回对标', async () => {
    const org = await request(app.getHttpServer()).post('/api/v1/orgs').set(auth())
      .send({ name: '海淀校区', type: 'CAMPUS', status: 'ACTIVE' }).expect(201);
    const orgId = org.body.data.id;
    await request(app.getHttpServer()).post('/api/v1/costs').set(auth())
      .send({ category: 'RENT', amount: 1000, orgId, remark: '房租' }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/materials').set(auth())
      .send({ sku: 'M1', name: '教材A', category: 'BOOK', unit: '本', stockQty: 10, warningQty: 2, price: 50, orgId }).expect(201);

    const r = await request(app.getHttpServer()).get('/api/v1/dashboards/benchmark').set(auth())
      .expect(200);
    const campus = r.body.data.campuses.find((c: any) => c.id === orgId);
    expect(campus).toBeTruthy();
    expect(campus.costTotal).toBe(1000);
    expect(campus.stockValue).toBe(500);
    expect(r.body.data.compare.avgCost).toBeGreaterThanOrEqual(0);
  });

  it('自定义报表：按线索阶段聚合', async () => {
    await request(app.getHttpServer()).post('/api/v1/leads').set(auth())
      .send({ name: '学员A', phone: '13800000001' }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/leads').set(auth())
      .send({ name: '学员B', phone: '13800000002' }).expect(201);
    const r = await request(app.getHttpServer()).post('/api/v1/dashboards/report').set(auth())
      .send({ source: 'lead', dimensions: ['stage'], metrics: ['leadCount', 'signed'] })
      .expect(201);
    expect(Array.isArray(r.body.data.rows)).toBe(true);
    const rows = r.body.data.rows as any[];
    const newRow = rows.find((x: any) => x.stage === 'NEW');
    expect(newRow).toBeTruthy();
    expect(newRow.leadCount).toBe(2);
  });

  it('预警联动：建规则→评估→命中即推送通知给接收人', async () => {
    // TOTAL_LEADS 当前为 2(本套件前序用例建了线索)，阈值 999，LT 触发
    const rule = await request(app.getHttpServer()).post('/api/v1/alert-rules').set(auth())
      .send({ name: '线索过少', metric: 'TOTAL_LEADS', operator: 'LT', threshold: 999, channel: 'INAPP', receivers: [1], enabled: true })
      .expect(201);
    const ev = await request(app.getHttpServer()).post('/api/v1/alert-rules/evaluate').set(auth())
      .expect(201);
    expect(ev.body.data.triggeredCount).toBeGreaterThanOrEqual(1);
    expect(ev.body.data.notified.length).toBeGreaterThanOrEqual(1);

    // 接收人(admin=1)应收到 ALERT 通知
    const n = await request(app.getHttpServer()).get('/api/v1/notifications').set(auth())
      .expect(200);
    expect(n.body.data.list.some((x: any) => x.type === 'ALERT')).toBe(true);

    // 清理规则
    await request(app.getHttpServer()).delete(`/api/v1/alert-rules/${rule.body.data.id}`).set(auth()).expect(200);
  });
});
