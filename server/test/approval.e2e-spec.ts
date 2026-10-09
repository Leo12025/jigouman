// 审批中心 e2e（M8 待办中心·审批接入，文档 §4.16 / §4.26）：发起审批→生成 APPROVAL 任务入待办中心→通过/驳回→关闭任务。
process.env.DB_TYPE = 'sqlite';
process.env.DB_SQLITE_PATH = ':memory:';
process.env.DEFAULT_TENANT_ID = '100000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('审批中心 Approval (e2e, SQLite)', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;

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
    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    userId = profile.body.data.id;
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('未授权发起审批应 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/approvals').expect(401);
  });

  it('单节点审批：发起→待办→通过→关闭', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'REFUND', title: '退费审批-单', approverIds: [userId] })
      .expect(201);
    const id = create.body.data.id;

    // 审批任务进入待办中心
    const todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(todos.body.data.list.length).toBe(1);
    expect(todos.body.data.list[0].refId).toBe(id);

    // 我的审批待办包含该实例
    const myTodos = await request(app.getHttpServer())
      .get('/api/v1/approvals/todos')
      .set(auth())
      .expect(200);
    expect(myTodos.body.data.some((x: any) => x.id === id)).toBe(true);

    // 通过
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .send({ comment: '同意' })
      .expect(201);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('APPROVED');

    // 任务已关闭（不再出现在我的未办）
    const after = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(after.body.data.list.length).toBe(0);
  });

  it('多节点审批：逐级推进，终审才通过', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'DISCOUNT', title: '折扣特批-双', approverIds: [userId, userId] })
      .expect(201);
    const id = create.body.data.id;

    // 第一节点通过 → 仍 PENDING，进入下一节点任务
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .send({ comment: '初审通过' })
      .expect(201);
    let detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('PENDING');
    expect(detail.body.data.currentNode).toBe(1);
    let todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(todos.body.data.list.length).toBe(1); // 下一节点新任务

    // 第二节点（终审）通过 → APPROVED
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .send({ comment: '终审通过' })
      .expect(201);
    detail = await request(app.getHttpServer())
      .get(`/api/v1/approvals/${id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('APPROVED');
    todos = await request(app.getHttpServer())
      .get('/api/v1/tasks/todos?type=APPROVAL')
      .set(auth())
      .expect(200);
    expect(todos.body.data.list.length).toBe(0);
  });

  it('非当前节点审批人通过应 403', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/approvals')
      .set(auth())
      .send({ bizType: 'TRANSFER', title: '转班-双', approverIds: [userId, 999999] })
      .expect(201);
    const id = create.body.data.id;
    // 当前节点是 userId(0号)，用伪节点? 999999 非当前，无法直接测 403 因为 operator 是 admin(userId)。
    // 这里改为：直接验证已结束的实例不能再审批
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .expect(201); // 第一节点通过
    // 当前节点变为 999999，admin 再 approve 应 403（非当前节点审批人）
    await request(app.getHttpServer())
      .post(`/api/v1/approvals/${id}/approve`)
      .set(auth())
      .expect(403);
  });
});
