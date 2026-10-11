// 多校区独立(§4.11)：X-Org-Id 上下文下的数据隔离 (e2e, SQLite 内存库)
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('多校区独立 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const org = (id: number) => ({ Authorization: `Bearer ${token}`, 'X-Org-Id': String(id) });

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

  it('总校区视角(HQ,无 X-Org-Id)可建两校区并看到全部学员', async () => {
    const a = await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '海淀校区', type: 'CAMPUS' }).expect(201);
    const b = await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '朝阳校区', type: 'CAMPUS' }).expect(201);
    const aId = a.body.data.id;
    const bId = b.body.data.id;

    await request(app.getHttpServer()).post('/api/v1/students').set(org(aId)).send({ name: '学员A' }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/students').set(org(bId)).send({ name: '学员B' }).expect(201);

    // 无 X-Org-Id（总校区/HQ）应看到全部 2 条
    const all = await request(app.getHttpServer()).get('/api/v1/students').set(auth()).expect(200);
    expect(all.body.data.total).toBe(2);

    // 海淀校区视角仅见 学员A
    const inA = await request(app.getHttpServer()).get('/api/v1/students').set(org(aId)).expect(200);
    expect(inA.body.data.total).toBe(1);
    expect(inA.body.data.list[0].name).toBe('学员A');

    // 朝阳校区视角仅见 学员B
    const inB = await request(app.getHttpServer()).get('/api/v1/students').set(org(bId)).expect(200);
    expect(inB.body.data.total).toBe(1);
    expect(inB.body.data.list[0].name).toBe('学员B');
  });

  it('代理路径(考勤)同样按校区隔离：不同校区打卡互不可见', async () => {
    const a = await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '西城校区', type: 'CAMPUS' }).expect(201);
    const b = await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '东城校区', type: 'CAMPUS' }).expect(201);
    const aId = a.body.data.id;
    const bId = b.body.data.id;

    // 在两校区分别打卡(写自动落 org_id 章)
    await request(app.getHttpServer()).post('/api/v1/attendance/clock').set(org(aId)).send({ teacherId: 1, type: 'IN' }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/attendance/clock').set(org(bId)).send({ teacherId: 1, type: 'IN' }).expect(201);

    // 校区A视角：只见本校区 1 条
    const inA = await request(app.getHttpServer()).get('/api/v1/attendance?teacherId=1').set(org(aId)).expect(200);
    expect(inA.body.data.list.length).toBe(1);

    // 总校区视角：两条都可见
    const all = await request(app.getHttpServer()).get('/api/v1/attendance?teacherId=1').set(auth()).expect(200);
    expect(all.body.data.list.length).toBe(2);
  });

  it('每租户仅允许一个总校区(HQ)：重复建 HQ 应拒绝', async () => {
    await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '总部', type: 'HQ' }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '总部2', type: 'HQ' }).expect(404);
  });
});
