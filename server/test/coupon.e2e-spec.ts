// 优惠券(§4.17) + 订单抵扣闭环 e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('优惠券 + 订单抵扣 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let tplId = 0;
  let code = '';
  let courseId = 0;

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

    const c = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set(auth())
      .send({ name: '语文', type: 'ONE_ON_ONE' })
      .expect(201);
    courseId = c.body.data.id;
  });
  afterAll(async () => { await app.close(); });
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('建满减券模板 + 发放到学员', async () => {
    const tpl = await request(app.getHttpServer())
      .post('/api/v1/coupons/templates')
      .set(auth())
      .send({ name: '满500减100', type: 'AMOUNT', value: 100, minSpend: 500, totalQty: 10, perLimit: 1, validDays: 30 })
      .expect(201);
    tplId = tpl.body.data.id;

    const g = await request(app.getHttpServer())
      .post('/api/v1/coupons/grant')
      .set(auth())
      .send({ templateId: tplId, studentId: 1, count: 1 })
      .expect(201);
    code = g.body.data[0].code;
    expect(code).toBeTruthy();
  });

  it('预览抵扣：满减券在门槛以上减 100', async () => {
    const pv = await request(app.getHttpServer())
      .post('/api/v1/coupons/preview')
      .set(auth())
      .send({ code, amount: 600, courseId })
      .expect(201);
    expect(pv.body.data.discount).toBe(100);
  });

  it('订单使用券码：应付=应收-券抵扣，支付后核销', async () => {
    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(auth())
      .send({
        studentId: 1,
        couponCode: code,
        items: [{ courseId, itemType: 'COURSE', name: '语文', qty: 1, unitPrice: 600, hours: 10 }],
      })
      .expect(201);
    expect(order.body.data.totalAmount).toBe(600);
    expect(order.body.data.discountAmount).toBe(100);
    expect(order.body.data.payableAmount).toBe(500);

    await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.body.data.id}/pay`)
      .set(auth())
      .send({ channel: 'OFFLINE', amount: 500 })
      .expect(201);

    // 已核销：再次预览应失败
    await request(app.getHttpServer())
      .post('/api/v1/coupons/preview')
      .set(auth())
      .send({ code, amount: 600, courseId })
      .expect(400);
  });
});
