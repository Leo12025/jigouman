// 完整促销引擎(§4.17 高级玩法) e2e：满减/折扣/叠加/互斥/限制/买赠/限时特价 + 订单集成
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('促销引擎 (e2e, SQLite)', () => {
  let app: INestApplication;
  let courseId = 0;
  let vipStudent = 0;
  let newStudent = 0;

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
      .post('/api/v1/courses').set(auth()).send({ name: '数学', type: 'ONE_ON_ONE' }).expect(201);
    courseId = c.body.data.id;

    const s1 = await request(app.getHttpServer())
      .post('/api/v1/students').set(auth()).send({ name: 'VIP学员', tags: ['VIP'] }).expect(201);
    vipStudent = s1.body.data.id;
    const s2 = await request(app.getHttpServer())
      .post('/api/v1/students').set(auth()).send({ name: '新学员', tags: ['NEW'] }).expect(201);
    newStudent = s2.body.data.id;
  });
  afterAll(async () => { await app.close(); });

  let token = '';
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const calc = (body: any) => request(app.getHttpServer()).post('/api/v1/coupons/calc').set(auth()).send(body);
  const makeTpl = (body: any) => request(app.getHttpServer()).post('/api/v1/coupons/templates').set(auth()).send(body).expect(201);
  // 每个用例前清空模板，避免全场活动跨用例累积污染
  beforeEach(async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/coupons/templates?size=200').set(auth()).expect(200);
    for (const t of list.body.data.list) {
      await request(app.getHttpServer()).delete(`/api/v1/coupons/templates/${t.id}`).set(auth()).expect(200);
    }
  });

  it('阶梯满减(全场活动)：按最高命中档位减免', async () => {
    await makeTpl({
      name: '满减活动', type: 'FULL_REDUCTION', autoApply: 1,
      tiers: [{ threshold: 1000, minus: 100 }, { threshold: 2000, minus: 300 }],
    });
    const r1 = await calc({ amount: 1500 });
    expect(r1.body.data.totalDiscount).toBe(100);
    const r2 = await calc({ amount: 2500 });
    expect(r2.body.data.totalDiscount).toBe(300);
  });

  it('折扣 + 满减可叠加：多优惠累加', async () => {
    await makeTpl({ name: '9折活动', type: 'DISCOUNT', value: 10, autoApply: 1 });
    await makeTpl({ name: '立减50', type: 'AMOUNT', value: 50, autoApply: 1 });
    const r = await calc({ amount: 1000 });
    // 9折=100 + 立减50 = 150
    expect(r.body.data.totalDiscount).toBe(150);
  });

  it('互斥组(stackGroup)：同组仅生效最优一个', async () => {
    await makeTpl({ name: '折扣A', type: 'DISCOUNT', value: 10, autoApply: 1, stackGroup: 'D' });
    await makeTpl({ name: '折扣B', type: 'DISCOUNT', value: 20, autoApply: 1, stackGroup: 'D' });
    const r = await calc({ amount: 1000 });
    // 仅 20% 生效
    expect(r.body.data.totalDiscount).toBe(200);
    expect(r.body.data.applied.length).toBe(1);
  });

  it('人群限制(applicableStudentTags)：仅命中标签生效', async () => {
    await makeTpl({ name: 'VIP专享', type: 'DISCOUNT', value: 15, autoApply: 1, applicableStudentTags: ['VIP'] });
    const vip = await calc({ amount: 1000, studentTags: ['VIP'] });
    expect(vip.body.data.totalDiscount).toBe(150);
    const non = await calc({ amount: 1000, studentTags: ['NEW'] });
    expect(non.body.data.totalDiscount).toBe(0);
  });

  it('买赠(GIFT)：达到购买量生成赠品', async () => {
    await makeTpl({
      name: '买2赠1', type: 'GIFT', autoApply: 1,
      giftRule: { buyQty: 2, giftQty: 1, giftCourseId: courseId, giftName: '赠课' },
    });
    const r = await calc({ items: [{ courseId, qty: 4, unitPrice: 100 }] });
    expect(r.body.data.totalDiscount).toBe(0);
    expect(r.body.data.giftItems.length).toBe(1);
    expect(r.body.data.giftItems[0].qty).toBe(2); // 4/2*1
    expect(r.body.data.applied[0].giftItems[0].courseId).toBe(courseId);
  });

  it('限时特价(FLASH)：仅限指定课程按特价折算', async () => {
    await makeTpl({ name: '限时特价', type: 'FLASH', value: 50, autoApply: 1, applicableCourseIds: [courseId] });
    const hit = await calc({ items: [{ courseId, qty: 2, unitPrice: 100 }] });
    expect(hit.body.data.totalDiscount).toBe(100); // (100-50)*2
    const miss = await calc({ items: [{ courseId: 99999, qty: 2, unitPrice: 100 }] });
    expect(miss.body.data.totalDiscount).toBe(0);
  });

  it('非叠加券(stackable=0)：仅自身生效，排斥其他优惠', async () => {
    await makeTpl({ name: '专属券', type: 'DISCOUNT', value: 30, autoApply: 1, stackable: 0 });
    const r = await calc({ amount: 1000 });
    expect(r.body.data.applied.length).toBe(1);
    expect(r.body.data.totalDiscount).toBe(300);
  });

  it('订单集成：手动券 + 全场活动叠加 + 买赠写入赠品订单项', async () => {
    // 手动满减券
    const tpl = await makeTpl({ name: '手动满300减50', type: 'AMOUNT', value: 50, minSpend: 300, perLimit: 1, totalQty: 10 });
    await request(app.getHttpServer()).post('/api/v1/coupons/grant').set(auth())
      .send({ templateId: tpl.body.data.id, studentId: newStudent, count: 1 }).expect(201);
    // 全场折扣活动
    await makeTpl({ name: '全场95折', type: 'DISCOUNT', value: 5, autoApply: 1 });
    // 全场买赠：买1赠1
    await makeTpl({
      name: '下单赠课', type: 'GIFT', autoApply: 1,
      giftRule: { buyQty: 1, giftQty: 1, giftCourseId: courseId, giftName: '下单赠课' },
    });

    // 取得刚发放券码
    const grants = await request(app.getHttpServer()).get(`/api/v1/coupons?studentId=${newStudent}`).set(auth()).expect(200);
    const code = grants.body.data.list.find((g: any) => g.templateId === tpl.body.data.id).code;

    const order = await request(app.getHttpServer()).post('/api/v1/orders').set(auth()).send({
      studentId: newStudent,
      couponCodes: [code],
      items: [{ courseId, itemType: 'COURSE', name: '数学', qty: 1, unitPrice: 600, hours: 10 }],
    }).expect(201);

    // 600 - 95折(30) - 满减(50) = 520
    expect(order.body.data.discountAmount).toBe(80);
    expect(order.body.data.payableAmount).toBe(520);
    expect(order.body.data.appliedPromotions.length).toBeGreaterThanOrEqual(2);
    // 买赠写入 GIFT 订单项
    const full = await request(app.getHttpServer()).get(`/api/v1/orders/${order.body.data.id}`).set(auth()).expect(200);
    expect(full.body.data.items.some((i: any) => i.itemType === 'GIFT')).toBe(true);
  });
});
