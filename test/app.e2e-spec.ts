// 端到端冒烟测试：无 Docker，使用 SQLite 内存库即可运行。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('机构管理系统 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    // 复现 main.ts 的全局统一响应包装，便于断言 res.body.code/data
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  it('POST /api/v1/auth/login 返回 JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.accessToken).toBeDefined();
    token = res.body.data.accessToken;
  });

  it('未携带 token 访问业务接口应 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/courses').expect(401);
  });

  it('带 token 可创建并列出课程(RBAC 通过)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '数学一对一', type: 'ONE_ON_ONE', price: 200, totalHours: 10 })
      .expect(201);
    expect(created.body.data.id).toBeGreaterThan(0);

    const list = await request(app.getHttpServer())
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.list.length).toBeGreaterThan(0);
  });

  it('排课冲突检测：同一老师同时段重复排课应被拦截', async () => {
    // 先建班级
    const cg = await request(app.getHttpServer())
      .post('/api/v1/courses/class-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: 1, name: '测试班', teacherId: 99, capacity: 10 })
      .expect(201);
    const classGroupId = cg.body.data.id;

    const lesson = {
      classGroupId,
      courseId: 1,
      teacherId: 99,
      startTime: '2026-10-10T09:00:00',
      endTime: '2026-10-10T10:00:00',
    };
    await request(app.getHttpServer())
      .post('/api/v1/courses/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send(lesson)
      .expect(201);

    // 同一老师同段再排 → 应 409
    await request(app.getHttpServer())
      .post('/api/v1/courses/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send(lesson)
      .expect(409);
  });

  afterAll(async () => {
    await app.close();
  });
});
