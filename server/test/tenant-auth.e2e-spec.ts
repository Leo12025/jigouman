// 租户/品牌域认证增强 + 校区额度 + 家长端增强 (e2e, SQLite 内存库)
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';
process.env.DEFAULT_TENANT_SLUG = 'default';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { OrgService } from '../src/modules/org/org.service';
import { TenantService } from '../src/modules/tenant/tenant.service';

describe('租户认证增强 + 校区额度 + 家长端 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let orgSvc: OrgService;
  let tenantSvc: TenantService;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    orgSvc = moduleRef.get(OrgService);
    tenantSvc = moduleRef.get(TenantService);
    await app.init();
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ username: 'admin', password: 'admin123456' }).expect(201);
    token = login.body.data.accessToken;
  });
  afterAll(async () => { await app.close(); });

  it('用户名@品牌域 登录：admin@default 解析到默认租户并登录成功', async () => {
    const r = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ username: 'admin@default', password: 'admin123456' }).expect(201);
    expect(r.body.data.accessToken).toBeTruthy();
    expect(r.body.data.user.tenantId).toBe(100000);
  });

  it('微信登录端点连通：未配置时返回 401(不触网)', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/wechat/login').send({ code: 'x' }).expect(401);
  });

  it('家长端：手机号后6位快捷登录', async () => {
    const phone = '13800000001';
    const r = await request(app.getHttpServer()).post('/api/v1/parents/login').send({ phone, last6: phone.slice(-6) }).expect(201);
    expect(r.body.data.accessToken).toBeTruthy();
  });

  it('家长端：跨品牌发现接口可用', async () => {
    const r = await request(app.getHttpServer()).get('/api/v1/parents/brands?phone=13800000001').expect(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('校区额度：品牌域 maxCampuses=1 时，第2个校区被拒', async () => {
    const t = await tenantSvc.create({ slug: 'quota1', name: '额度测试', maxCampuses: 1 } as any);
    await orgSvc.create(t.id, { name: '总部', type: 'HQ' } as any);
    await orgSvc.create(t.id, { name: '校区1', type: 'CAMPUS' } as any);
    await expect(orgSvc.create(t.id, { name: '校区2', type: 'CAMPUS' } as any)).rejects.toThrow();
  });
});
