// 统一资源 / 课包 / 课件 e2e（§4.1 资源本地存储 / 课包课时发放与跨课程抵扣 / 课件阶段树）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';
process.env.STORAGE_TYPE = 'local';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), 'jm-uploads-test');

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('统一资源/课包/课件 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let resourceId: number;
  let courseA: number;
  let courseB: number;
  let pkgId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, transformOptions: { enableImplicitConversion: true } }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    token = login.body.data.accessToken;

  });

  afterAll(async () => {
    await app.close();
    try {
      fs.rmSync(process.env.UPLOAD_DIR as string, { recursive: true, force: true });
    } catch {
      /* 清理失败不影响用例结果 */
    }
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('资源上传(本地)：返回可访问 URL', async () => {
    const tmp = path.join(os.tmpdir(), `r-${Date.now()}.txt`);
    fs.writeFileSync(tmp, 'hello courseware');
    const res = await request(app.getHttpServer())
      .post('/api/v1/resources/upload?category=courseware')
      .set(auth())
      .attach('files', tmp)
      .expect(201);
    const r = res.body.data[0];
    expect(r.storageType).toBe('local');
    expect(r.url).toContain('/files/');
    resourceId = r.id;
    fs.unlinkSync(tmp);
  });

  it('课件：建阶段(引大纲资源)+课时课件，阶段树含课件', async () => {
    const ca = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set(auth())
      .send({ name: '数学', type: 'ONE_ON_ONE' })
      .expect(201);
    courseA = ca.body.data.id;
    const cb = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set(auth())
      .send({ name: '英语', type: 'ONE_ON_ONE' })
      .expect(201);
    courseB = cb.body.data.id;

    const stage = await request(app.getHttpServer())
      .post(`/api/v1/courses/${courseA}/stages`)
      .set(auth())
      .send({ name: '阶段一', outlineResourceId: resourceId })
      .expect(201);
    const stageId = stage.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/stages/${stageId}/coursewares`)
      .set(auth())
      .send({
        title: '第一课时 PPT',
        type: 'PPT',
        resourceId,
        resources: [{ resourceId, name: '素材', url: 'x' }],
      })
      .expect(201);

    const tree = await request(app.getHttpServer())
      .get(`/api/v1/courses/${courseA}/stages`)
      .set(auth())
      .expect(200);
    expect(tree.body.data.length).toBe(1);
    expect(tree.body.data[0].coursewares.length).toBe(1);
    expect(tree.body.data[0].coursewares[0].resources).toBeDefined();
  });

  it('课包：建套餐→关联课程→购课发放课时到学员课包账户', async () => {
    const pkg = await request(app.getHttpServer())
      .post('/api/v1/course-packages')
      .set(auth())
      .send({ name: '年课套餐', totalHours: 100, price: 9800 })
      .expect(201);
    pkgId = pkg.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/course-packages/${pkgId}/courses`)
      .set(auth())
      .send({ courseIds: [courseA, courseB] })
      .expect(201);

    const buy = await request(app.getHttpServer())
      .post(`/api/v1/course-packages/${pkgId}/purchase`)
      .set(auth())
      .send({ studentId: 1, hours: 10 })
      .expect(201);
    expect(buy.body.data.packageId).toBe(pkgId);
    expect(buy.body.data.balance).toBe(10);
  });

  it('课包账户可跨套餐内课程抵扣：点名消课从课包账户扣减', async () => {
    // 为 courseA 建班级 + 课次
    const cg = await request(app.getHttpServer())
      .post('/api/v1/courses/class-groups')
      .set(auth())
      .send({ courseId: courseA, name: 'A班' })
      .expect(201);
    const cgId = cg.body.data.id;
    const start = new Date(Date.now() + 3600 * 1000).toISOString();
    const end = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const lesson = await request(app.getHttpServer())
      .post('/api/v1/courses/lessons')
      .set(auth())
      .send({ classGroupId: cgId, courseId: courseA, startTime: start, endTime: end })
      .expect(201);
    const lessonId = lesson.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/lessons/${lessonId}/attendance`)
      .set(auth())
      .send({ records: [{ studentId: 1, status: 'PRESENT' }] })
      .expect(201);

    const acc = await request(app.getHttpServer())
      .get('/api/v1/hour-accounts?studentId=1')
      .set(auth())
      .expect(200);
    const pkgAcc = acc.body.data.list.find((a: any) => a.packageId === pkgId);
    expect(pkgAcc).toBeDefined();
    expect(pkgAcc.balance).toBe(9); // 10 - 1 课包抵扣
  });
});
