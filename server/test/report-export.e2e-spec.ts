// 报表导出(§4.10 深化)：后端生成文件流 Excel(CSV+BOM) / PDF(极简文本表) e2e
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('报表导出 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token = '';
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const post = (url: string, body: any) =>
    request(app.getHttpServer()).post(url).set(auth()).send(body);
  const get = (url: string) => request(app.getHttpServer()).get(url).set(auth());

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

    // 准备订单数据
    const c = await post('/api/v1/courses', { name: '数学', type: 'ONE_ON_ONE' }).expect(201);
    const s = await post('/api/v1/students', { name: '导出学员' }).expect(201);
    await post('/api/v1/orders', {
      studentId: s.body.data.id,
      items: [{ courseId: c.body.data.id, itemType: 'COURSE', name: '数学', qty: 1, unitPrice: 600, hours: 10 }],
    }).expect(201);
    // 准备线索数据
    const ch = await post('/api/v1/channels', { name: '门店' }).expect(201);
    await post('/api/v1/leads', { name: '导出线索', phone: '13800000000', channelId: ch.body.data.id, stage: 'NEW' }).expect(201);
  });
  afterAll(async () => { await app.close(); });

  it('自定义报表 → Excel(CSV+BOM) 下载', async () => {
    const r = await post('/api/v1/dashboards/report/export', {
      source: 'order',
      dimensions: ['status'],
      metrics: ['orderCount', 'receivable', 'received'],
      format: 'excel',
      title: '订单报表测试',
    }).expect(200);
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.headers['content-disposition']).toContain('.csv');
    expect(r.text.length).toBeGreaterThan(10);
    // 校验 BOM + 中文表头
    const text = r.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain('状态');
    expect(text).toContain('订单数');
  });

  it('自定义报表 → PDF 下载(ASCII 文本表)', async () => {
    const r = await post('/api/v1/dashboards/report/export', {
      source: 'lead',
      dimensions: ['stage'],
      metrics: ['leadCount', 'signed'],
      format: 'pdf',
    }).expect(200);
    expect(r.headers['content-type']).toContain('application/pdf');
    expect(r.headers['content-disposition']).toContain('.pdf');
    expect(r.body.slice(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('多校区对标 → Excel 下载(含合计行)', async () => {
    const r = await get('/api/v1/dashboards/benchmark/export?format=excel').expect(200);
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.text).toContain('校区');
    expect(r.text).toContain('合计');
  });

  it('多校区对标 → PDF 被拒(含中文)', async () => {
    const r = await get('/api/v1/dashboards/benchmark/export?format=pdf').expect(400);
    expect(r.body.code).not.toBe(0);
  });
});
