// 跨校区汇总对比 e2e（§4.11 / §10 M8 多校区）：总校区视角聚合全部校区指标 + 排名。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('跨校区汇总对比 CampusOverview (e2e, SQLite)', () => {
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

  it('未携带 token 访问应 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/dashboards/campus-overview').expect(401);
  });

  it('创建两个校区并校验跨校区汇总对比', async () => {
    const created: string[] = [];
    for (const name of ['城东校区', '城西校区']) {
      const r = await request(app.getHttpServer())
        .post('/api/v1/orgs')
        .set('Authorization', `Bearer ${token}`)
        .send({ name, type: 'CAMPUS' })
        .expect(201);
      created.push(r.body.data.name);
    }

    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboards/campus-overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
    const d = res.body.data;

    // 结构校验
    expect(Array.isArray(d.campuses)).toBe(true);
    expect(d).toHaveProperty('summary');
    expect(d).toHaveProperty('compare');
    expect(typeof d.summary.campusCount).toBe('number');
    expect(d.summary.campusCount).toBeGreaterThanOrEqual(2);

    // 新建校区应出现在汇总中
    const names = d.campuses.map((c: any) => c.name);
    expect(names).toEqual(expect.arrayContaining(created));

    // 每个校区含六维度指标且为数值
    const c0 = d.campuses[0];
    expect(typeof c0.admission.leads).toBe('number');
    expect(typeof c0.admission.conversionRate).toBe('number');
    expect(typeof c0.revenue.received).toBe('number');
    expect(typeof c0.revenue.netCashflow).toBe('number');
    expect(typeof c0.students.studying).toBe('number');
    expect(typeof c0.hours.consumeRate).toBe('number');
    expect(typeof c0.teaching.attendanceRate).toBe('number');
    expect(typeof c0.cost.costTotal).toBe('number');
    expect(typeof c0.rank).toBe('number');

    // 排名：校区数>=2 时 compare 含营收冠军/最弱
    if (d.campuses.length >= 2) {
      expect(d.compare).not.toBeNull();
      expect(d.compare.received).toHaveProperty('top');
      expect(d.compare.received).toHaveProperty('bottom');
      expect(typeof d.compare.received.avg).toBe('number');
    }
  });

  it('campus-overview 路由不应被 :role 捕获', async () => {
    // :role 对未知角色返回 400；此处应正常 200
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboards/campus-overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
  });

  afterAll(async () => {
    await app.close();
  });
});
