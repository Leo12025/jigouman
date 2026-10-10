// 多校区组织树(§4.11) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('多校区组织 (e2e, SQLite)', () => {
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

  it('建总部→分校→校区，树形返回且层级正确', async () => {
    const hq = await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '总部', type: 'HQ' }).expect(201);
    const branch = await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '北京分校', type: 'BRANCH', parentId: hq.body.data.id }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/orgs').set(auth()).send({ name: '中关村校区', type: 'CAMPUS', parentId: branch.body.data.id }).expect(201);

    const tree = await request(app.getHttpServer()).get('/api/v1/orgs/tree').set(auth()).expect(200);
    expect(tree.body.data.length).toBe(1); // 仅一个根(总部)
    const root = tree.body.data[0];
    expect(root.name).toBe('总部');
    expect(root.children[0].name).toBe('北京分校');
    expect(root.children[0].children[0].name).toBe('中关村校区');
  });

  it('删除含下级的组织应被拒绝', async () => {
    const hq = await request(app.getHttpServer()).get('/api/v1/orgs/tree').set(auth()).expect(200);
    const rootId = hq.body.data[0].id;
    await request(app.getHttpServer()).delete(`/api/v1/orgs/${rootId}`).set(auth()).expect(404);
  });
});
