# 机构管理系统 — 后端服务（NestJS）

校外培训机构管理系统后端，依据 `docs/开发文档-机构管理系统.md` 实现。
当前交付 **M1 基础框架 + M2 课程/学员（最小业务闭环）**。

技术栈：NestJS 10 + TypeScript + TypeORM + MySQL 8 + JWT + Swagger。

---

## 1. 已交付能力

### M1 基础框架（§2 / §7）
- 多租户：单库多租户，`tenant_id` 隔离（`TenantGuard` 注入 `req.tenantId`）。
- RBAC：用户 / 角色 / 权限（`user_role`、`role_permission` 关联表），`RolesGuard` 校验权限点。
- 鉴权：JWT（Bearer），`JwtAuthGuard` 全局校验；`@Public()` 放行登录等接口。
- 统一响应：`{ code, message, data, traceId }`（`ResponseInterceptor`）。
- 统一异常处理：`AllExceptionsFilter` 兜底，`BusinessException` 业务异常。
- 审计日志：`AuditInterceptor` 扫描 `@OperationLog`，写 `audit_log`（who/when/what）。
- 分页基类：`PageQueryDto` + `BaseService`（租户隔离 CRUD，含软删除）。

### M2 课程 + 学员（§4.1 / §4.4 / §5.1 / §5.3）
- 课程：分类、课程（6 种类型）、班级、课次（含**排课冲突检测** §8.5）。
- 学员：学员档案、家长多对多绑定（OTP/邀请码，保留解绑历史）、报名课程。

---

## 2. 目录结构

```
src/
├── main.ts                     # 入口：全局前缀/校验/响应/异常/Swagger
├── app.module.ts               # 根模块：全局守卫 + 审计拦截 + 租户 seeding
├── common/                     # 通用层（响应/分页/异常/装饰器/基类）
├── core/
│   ├── database/               # TypeORM 配置
│   ├── auth/                   # JWT 策略/守卫/登录
│   ├── rbac/                   # 用户/角色/权限 + 初始化 seeding
│   ├── tenant/                 # 多租户守卫
│   └── audit/                  # 审计日志
└── modules/
    ├── course/                 # 课程/分类/班级/课次
    └── student/                # 学员/家长/报名
```

---

## 3. 本地运行

### 依赖
- Node.js ≥ 20
- 数据库：**默认 sql.js 内存库（零依赖，无需 Docker/MySQL）**；生产可切换为 MySQL 8（见 `.env` 的 `DB_TYPE`）。
- Redis 仅在 M1/M2 之外的增强模块使用，本地调试暂不需要。

### 步骤（不走 Docker，纯 Node）
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（默认即 sqlite，开箱即用）
cp .env.example .env
#   生产/联调时把 DB_TYPE 改为 mysql 并填好 DB_* / JWT_SECRET

# 3. 启动（开发热重载，自动用内存库建表 + 初始化超管）
npm run start:dev
```

启动后自动执行：
- 建表（`DB_SYNCHRONIZE=true`，生产请改 false 并走 migration）
- 默认租户初始化：权限点 + 角色 + 超级管理员（`admin` / `admin123456`）

> 注：sql.js 为内存库，进程重启后数据清空，专用于本地调试与自动化测试；
> 需要持久化时把 `DB_TYPE` 改为 `mysql` 并准备 MySQL 实例（可用本地安装或 `docker-compose up -d`）。

### 运行测试（同样零外部依赖）
```bash
npm run test:e2e     # 端到端冒烟：登录 + RBAC + 课程 CRUD + 排课冲突检测
```

### 验证
- Swagger：`http://localhost:3000/docs`
- 登录：`POST /api/v1/auth/login` → `{ username:'admin', password:'admin123456' }`
- 携带返回的 `accessToken` 调业务接口：`Authorization: Bearer <token>`

---

## 4. 主要接口

| 模块 | 示例 |
|------|------|
| 鉴权 | `POST /api/v1/auth/login` |
| 课程 | `GET/POST /api/v1/courses`、`POST /api/v1/courses/lessons`（冲突检测） |
| 班级 | `POST /api/v1/courses/class-groups` |
| 学员 | `POST/GET /api/v1/students`、`POST /api/v1/students/parents/bind` |
| 报名 | `POST /api/v1/students/courses/enroll` |

> 完整字段与枚举见 `docs/开发文档-机构管理系统.md` §5 / §11.3。

---

## 5. 下一步（按文档 §10 计划）
- M3 线索+招生 → M4 订单+课时 → M5 作业+家长端 → M6 数据看板 → M7 试点 → M8 增强模块。
- 生产化：migration（`npm run migration:run`）、资金监管、OA/IM 集成、AI 网关。
