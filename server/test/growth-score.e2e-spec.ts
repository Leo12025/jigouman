// 成绩录入事件化 e2e（§4.26：测评创建→SCORE_ENTRY 待办；录分→关闭）
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('成绩录入事件化 ScoreEntry (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;

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
    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    userId = profile.body.data.id;
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('创建测评→生成 SCORE_ENTRY 待办；录分→关闭待办', async () => {
    const exam = await request(app.getHttpServer())
      .post('/api/v1/exams')
      .set(auth())
      .send({ name: '期中测验', courseId: 1 })
      .expect(201);
    const eid = exam.body.data.id;

    const todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=SCORE_ENTRY')
      .set(auth())
      .expect(200);
    const t = todos.body.data.list.find((x: any) => x.refType === 'EXAM' && x.refId === eid);
    expect(t).toBeDefined();
    expect(t.assigneeId).toBe(userId);

    // 录入成绩（关联该测评）
    await request(app.getHttpServer())
      .post('/api/v1/scores')
      .set(auth())
      .send({ studentId: 1, examId: eid, score: 90, level: 'A', comment: '良好' })
      .expect(201);

    const all = await request(app.getHttpServer())
      .get(`/api/v1/tasks?type=SCORE_ENTRY&refType=EXAM&refId=${eid}`)
      .set(auth())
      .expect(200);
    expect(all.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(all.body.data.list.every((x: any) => x.status === 'DONE')).toBe(true);
  });
});
