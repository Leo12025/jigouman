// 师资员工(§4.14) + 教室场地(§4.15) e2e（SQLite 内存库）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('师资员工 + 教室场地 (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;

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

  afterAll(async () => { await app.close(); });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  let empId = 0;
  let certId = 0;
  let roomId = 0;

  it('员工：新建老师 + 列表 + 更新', async () => {
    const c = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set(auth())
      .send({ name: '王老师', phone: '13800000000', kind: 'teacher', status: 'ACTIVE' })
      .expect(201);
    empId = c.body.data.id;
    expect(c.body.data.kind).toBe('teacher');

    const list = await request(app.getHttpServer())
      .get('/api/v1/employees?kind=teacher')
      .set(auth())
      .expect(200);
    expect(list.body.data.list.some((e: any) => e.id === empId)).toBe(true);

    await request(app.getHttpServer())
      .put(`/api/v1/employees/${empId}`)
      .set(auth())
      .send({ status: 'ACTIVE', remark: '骨干教师' })
      .expect(200);
  });

  it('员工：师资档案 + 资质证书', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/employees/${empId}/teacher-profile`)
      .set(auth())
      .send({ subjects: ['数学', '物理'], ageGroups: ['6-8岁'], bio: '耐心细致' })
      .expect(200);

    const cert = await request(app.getHttpServer())
      .post(`/api/v1/employees/${empId}/certificates`)
      .set(auth())
      .send({ type: 'TEACHER_CERT', name: '教师资格证', issuer: '教育局' })
      .expect(201);
    certId = cert.body.data.id;

    const certs = await request(app.getHttpServer())
      .get(`/api/v1/employees/${empId}/certificates`)
      .set(auth())
      .expect(200);
    expect(certs.body.data.length).toBe(1);
    expect(certs.body.data[0].name).toBe('教师资格证');
  });

  it('教室：新建 + 列表 + 更新 + 删除（§4.15）', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/classrooms')
      .set(auth())
      .send({ name: '一号教室', type: '教室', capacity: 30, equipment: ['投影', '钢琴'] })
      .expect(201);
    roomId = r.body.data.id;

    const list = await request(app.getHttpServer())
      .get(`/api/v1/classrooms?type=${encodeURIComponent('教室')}`)
      .set(auth())
      .expect(200);
    expect(list.body.data.list.some((x: any) => x.id === roomId)).toBe(true);

    await request(app.getHttpServer())
      .put(`/api/v1/classrooms/${roomId}`)
      .set(auth())
      .send({ capacity: 40, status: 'ACTIVE' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/classrooms/${roomId}`)
      .set(auth())
      .expect(200);
  });

  it('员工：删除（软删）', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/employees/${empId}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/employees/${empId}`)
      .set(auth())
      .expect(404);
  });
});
