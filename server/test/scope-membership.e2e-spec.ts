// 校区级作用域(S0/P0-1) + 组织树祖先路径(P1) + 模板继承(P1-3) + membership 状态机(P2) 回归用例
// 无 Docker：SQLite 内存库即可运行。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';
process.env.DEFAULT_TENANT_SLUG = 'default';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('校区作用域 + 组织祖先 + 模板继承 + membership (e2e, SQLite)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string; // 超级管理员
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const authOf = (t: string) => ({ Authorization: `Bearer ${t}` });

  let hqId: number;
  let campusA: number;
  let campusB: number;
  let campusA1: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
    ds = moduleRef.get(DataSource);
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    token = login.body.data.accessToken;
  });
  afterAll(async () => {
    await app.close();
  });

  it('P1: 组织树祖先路径(ancestors)正确维护', async () => {
    // 默认租户在 seedTenant 已建 HQ，直接取用（禁重复建 HQ）
    const tree = await request(app.getHttpServer()).get('/api/v1/orgs/tree').set(auth()).expect(200);
    hqId = tree.body.data[0].id;

    const a = await request(app.getHttpServer())
      .post('/api/v1/orgs')
      .set(auth())
      .send({ name: '校区A', type: 'CAMPUS', parentId: hqId })
      .expect(201);
    campusA = a.body.data.id;

    const b = await request(app.getHttpServer())
      .post('/api/v1/orgs')
      .set(auth())
      .send({ name: '校区B', type: 'CAMPUS', parentId: hqId })
      .expect(201);
    campusB = b.body.data.id;

    const a1 = await request(app.getHttpServer())
      .post('/api/v1/orgs')
      .set(auth())
      .send({ name: '校区A-1', type: 'CAMPUS', parentId: campusA })
      .expect(201);
    campusA1 = a1.body.data.id;

    const aDetail = await request(app.getHttpServer()).get(`/api/v1/orgs/${campusA}`).set(auth()).expect(200);
    expect(aDetail.body.data.ancestors).toBe(`${hqId}/`);

    const a1Detail = await request(app.getHttpServer()).get(`/api/v1/orgs/${campusA1}`).set(auth()).expect(200);
    expect(a1Detail.body.data.ancestors).toBe(`${hqId}/${campusA}/`);
  });

  async function createCourseAt(orgId: number, name: string): Promise<number> {
    const r = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set(auth())
      .set('X-Org-Id', String(orgId))
      .send({ name, type: 'ONE_ON_ONE', price: 100, totalHours: 5 })
      .expect(201);
    return r.body.data.id;
  }

  let courseA: number;
  let courseB: number;
  let courseA1: number;
  it('准备：在 A / B / A-1 各建一门课程（org_id 由 X-Org-Id 落章）', async () => {
    courseA = await createCourseAt(campusA, 'A课程');
    courseB = await createCourseAt(campusB, 'B课程');
    courseA1 = await createCourseAt(campusA1, 'A-1课程');
  });

  async function grantCourseView(roleId: number) {
    const perms = await request(app.getHttpServer()).get('/api/v1/permissions').set(auth()).expect(200);
    const cv = perms.body.data.find((p: any) => p.code === 'course:view');
    await request(app.getHttpServer())
      .put(`/api/v1/roles/${roleId}`)
      .set(auth())
      .send({ permissionIds: [cv.id] })
      .expect(200);
  }

  it('S0(P0-1): 校区管理员(归属A) 篡改 X-Org-Id 到 B → 403；默认落到归属校区A', async () => {
    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth())
      .send({ code: 'campus_admin', name: '校区管理员', dataScope: 'org', permissionIds: [] })
      .expect(201);
    const roleId = role.body.data.id;
    await grantCourseView(roleId);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth())
      .send({ username: 'admin1', password: 'pwd123456', roleIds: [roleId], orgIds: [campusA] })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin1', password: 'pwd123456' })
      .expect(201);
    const token1 = login.body.data.accessToken;

    // 不带 X-Org-Id：默认落到首个归属校区 A
    const listDefault = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .set(authOf(token1))
      .expect(200);
    const ids = listDefault.body.data.list.map((c: any) => c.id);
    expect(ids).toContain(courseA);
    expect(ids).not.toContain(courseB);

    // 篡改到 B（不在归属列表）→ 403
    await request(app.getHttpServer())
      .get('/api/v1/courses')
      .set(authOf(token1))
      .set('X-Org-Id', String(campusB))
      .expect(403);

    // 合规选 A → 200 且仅含 A
    const listA = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .set(authOf(token1))
      .set('X-Org-Id', String(campusA))
      .expect(200);
    expect(listA.body.data.list.map((c: any) => c.id)).toContain(courseA);
  });

  it('P1: ORG_AND_BELOW —— 大区管理员(归属A) 可见 A 及其下级 A-1，不含 B；篡改 B → 403', async () => {
    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth())
      .send({ code: 'region_admin', name: '大区管理员', dataScope: 'org_and_below', permissionIds: [] })
      .expect(201);
    const roleId = role.body.data.id;
    await grantCourseView(roleId);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth())
      .send({ username: 'admin2', password: 'pwd123456', roleIds: [roleId], orgIds: [campusA] })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin2', password: 'pwd123456' })
      .expect(201);
    const token2 = login.body.data.accessToken;

    const list = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .set(authOf(token2))
      .set('X-Org-Id', String(campusA))
      .expect(200);
    const ids = list.body.data.list.map((c: any) => c.id);
    expect(ids).toContain(courseA); // 本校区
    expect(ids).toContain(courseA1); // 下级校区
    expect(ids).not.toContain(courseB); // 兄弟校区不可见

    // 篡改到 B → 403
    await request(app.getHttpServer())
      .get('/api/v1/courses')
      .set(authOf(token2))
      .set('X-Org-Id', String(campusB))
      .expect(403);
  });

  it('P1-3: 角色继承平台模板权限 —— 自身无权限亦可访问受保护接口', async () => {
    // 取平台模板角色(tenant_id=0) id
    const tpl = await ds.query(
      `SELECT id FROM role WHERE tenant_id = 0 AND code = 'tenant_admin' LIMIT 1`,
    );
    expect(tpl.length).toBeGreaterThan(0);
    const tplId = tpl[0].id;

    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth())
      .send({ code: 'inherit_role', name: '继承角色', dataScope: 'org', permissionIds: [] })
      .expect(201);
    const roleId = role.body.data.id;
    // 自身无任何权限，仅挂接模板继承
    await ds.query(`UPDATE role SET inherits_from = ? WHERE id = ?`, [tplId, roleId]);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth())
      .send({ username: 'admin3', password: 'pwd123456', roleIds: [roleId] })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin3', password: 'pwd123456' })
      .expect(201);
    const token3 = login.body.data.accessToken;

    // role:view 来自继承的模板（自身无权限），应能访问角色列表
    await request(app.getHttpServer()).get('/api/v1/roles').set(authOf(token3)).expect(200);
  });

  it('P2: membership 置为 SUSPENDED 后登录被拒(401)', async () => {
    await ds.query(
      `UPDATE membership SET status = 'SUSPENDED'
       WHERE user_id = (SELECT id FROM sys_user WHERE username = 'admin1' AND tenant_id = 100000)`,
    );
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin1', password: 'pwd123456' })
      .expect(401);
  });
});
