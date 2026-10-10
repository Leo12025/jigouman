// 合同电子签(§4.23) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('合同电子签 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    token = login.body.data.accessToken;
  });
  afterAll(async () => { await app.close(); });
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('模板 → 创建合同(草稿) → 电子签署(实名+存证) → 详情含 evidence', async () => {
    const tpl = await request(app.getHttpServer())
      .post('/api/v1/contracts/templates')
      .set(auth())
      .send({ name: '报名协议', type: 'ENROLL', content: '甲方{name} 证件{idCard} 确认报名' })
      .expect(201);
    const tplId = tpl.body.data.id;

    const c = await request(app.getHttpServer())
      .post('/api/v1/contracts')
      .set(auth())
      .send({ templateId: tplId, partyName: '张三', idCard: '110101199001011234', relatedType: 'ENROLL', relatedId: 1 })
      .expect(201);
    const cid = c.body.data.id;
    expect(c.body.data.status).toBe('DRAFT');

    const signed = await request(app.getHttpServer())
      .post(`/api/v1/contracts/${cid}/sign`)
      .set(auth())
      .send({ partyName: '张三', idCard: '110101199001011234', signatureResId: 1 })
      .expect(201);
    expect(signed.body.data.status).toBe('SIGNED');
    expect(signed.body.data.evidence?.hash).toBeTruthy();
    expect(signed.body.data.evidence?.algorithm).toBe('sha256');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/contracts/${cid}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.evidence.hash).toBe(signed.body.data.evidence.hash);
  });

  it('缺少实名信息签署应被拒绝', async () => {
    const tpl = await request(app.getHttpServer())
      .post('/api/v1/contracts/templates')
      .set(auth())
      .send({ name: '兼职协议', type: 'EMPLOYEE', content: 'x' })
      .expect(201);
    const c = await request(app.getHttpServer())
      .post('/api/v1/contracts')
      .set(auth())
      .send({ templateId: tpl.body.data.id, partyName: '李四' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/contracts/${c.body.data.id}/sign`)
      .set(auth())
      .send({})
      .expect(400);
  });
});
