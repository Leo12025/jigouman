// 数据看板 e2e（M6，文档 §4.10 / §6.7）：经营/招生/教学三类看板聚合。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('数据看板 Dashboard (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  it('POST /api/v1/auth/login 返回 JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    expect(res.body.code).toBe(0);
    token = res.body.data.accessToken;
    expect(token).toBeDefined();
  });

  it('未携带 token 访问看板应 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/dashboards/principal').expect(401);
  });

  it('principal 经营看板返回关键结构', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboards/principal')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
    const d = res.body.data;
    expect(d).toHaveProperty('revenue');
    expect(d).toHaveProperty('students');
    expect(d).toHaveProperty('hours');
    expect(d).toHaveProperty('classGroups');
    expect(d).toHaveProperty('admissionSummary');
    expect(Array.isArray(d.trend)).toBe(true);
    expect(typeof d.revenue.received).toBe('number');
  });

  it('admission 招生看板返回漏斗与渠道/活动分布', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboards/admission')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.funnel).toHaveProperty('conversionRate');
    expect(Array.isArray(res.body.data.byChannel)).toBe(true);
    expect(Array.isArray(res.body.data.byCampaign)).toBe(true);
    expect(typeof res.body.data.pendingFollow).toBe('number');
  });

  it('teaching 教学看板返回出勤/作业/预警', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboards/teaching')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('attendance');
    expect(res.body.data).toHaveProperty('homework');
    expect(Array.isArray(res.body.data.alerts)).toBe(true);
    expect(res.body.data.homework).toHaveProperty('assigned');
  });

  it('非法 role 应 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboards/xxx')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /api/v1/dashboards/screen 数据大屏总览返回KPI与趋势', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboards/screen')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
    const d = res.body.data;
    expect(d).toHaveProperty('kpis');
    expect(typeof d.kpis.received).toBe('number');
    expect(typeof d.kpis.conversionRate).toBe('number');
    expect(Array.isArray(d.trend)).toBe(true);
    expect(Array.isArray(d.byChannel)).toBe(true);
    expect(Array.isArray(d.alerts)).toBe(true);
  });
});
