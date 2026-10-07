# 校外培训机构管理系统（前后端分离）

依据 `docs/开发文档-机构管理系统.md`（v1.9）实现。
当前交付：**M1 基础框架 + M2 课程/学员 + M3 线索/招生**。

## 目录结构

```
.
├── docs/                          # 产品与开发文档（唯一设计基线）
│   └── 开发文档-机构管理系统.md
├── server/                        # ★ 后端服务（NestJS）
│   ├── src/
│   │   ├── main.ts                # 入口：全局前缀 /api/v1、校验、响应、异常、Swagger
│   │   ├── app.module.ts          # 根模块：全局守卫 + 审计拦截 + 租户 seeding
│   │   ├── common/                # 通用层（响应拦截/分页/异常/装饰器/CRUD 基类）
│   │   ├── core/                  # 基础服务层（database/auth/rbac/tenant/audit）
│   │   └── modules/               # 业务模块
│   │       ├── course/            # M2 课程·分类·班级·课次（排课冲突检测）
│   │       ├── student/           # M2 学员·家长多对多绑定·报名
│   │       └── lead/              # M3 渠道·活动·线索·跟进·试听·转化·漏斗
│   ├── test/                      # e2e 测试（jest + supertest，零外部依赖）
│   ├── .env.example
│   └── package.json
├── web/                           # ★ 网页端（PC 管理后台，React + Ant Design 5）
│   ├── src/
│   │   ├── theme.ts               # 设计 Token 唯一真源（文档 §12.2）
│   │   ├── api/                   # axios 客户端（解包 code/data、JWT 注入、401 自动续期）+ 接口封装
│   │   ├── layouts/               # 侧栏 + 顶栏（机构/用户信息）布局
│   │   ├── pages/                 # 页面（见下方「页面清单」）
│   │   ├── App.tsx                # 路由 + 登录守卫
│   │   └── main.tsx               # ConfigProvider 主题注入入口
│   ├── vite.config.ts             # dev 代理 /api → http://localhost:3000
│   └── package.json
└── package.json                   # 根脚本：统一安装 / 启动 / 构建 / 测试
```

## 技术栈

| 端 | 技术栈 |
|----|--------|
| 后端 `server/` | NestJS 10 + TypeScript + TypeORM + MySQL 8（本地默认 sql.js 内存库）+ JWT + Swagger |
| 网页端 `web/` | React 18 + TypeScript + Vite + **Ant Design 5**（遵循文档 §12 UI 规范：Token 唯一真源、列表=筛选条+表格+分页、详情=Descriptions+Tabs） |

## 快速开始（前后端共用同一套后端）

```bash
# 1. 一次装齐前后端依赖
npm run install:all

# 2. 同时启动后端(:3000) 与网页端(:5173)
npm run dev
```

也可分终端启动：

```bash
npm run dev:server   # 后端 http://localhost:3000 （Swagger: http://localhost:3000/docs）
npm run dev:web      # 网页端 http://localhost:5173
```

> 网页端通过 Vite 代理将 `/api` 转发到 `http://localhost:3000`，
> 因此**前端与后端共用同一个后端实例**，本地开发无需任何跨域配置。

启动后端会自动完成：建表（`DB_SYNCHRONIZE=true`）→ 初始化默认租户、权限点、角色与超级管理员。

- 默认账号：`admin` / `admin123456`
- 本地默认使用 **sql.js 内存库**（零依赖、无需 Docker/MySQL），进程重启数据清空；
  需要持久化时把 `server/.env` 的 `DB_TYPE` 改为 `mysql` 并配置 `DB_*`。

## 构建与测试

```bash
npm run build   # 后端 nest build + 前端 vite build
npm test        # 后端 e2e：登录 / RBAC / 排课冲突 / 班级详情 / 线索全流程 / 漏斗
```

## 里程碑与模块对应

| 里程碑 | 后端模块 | 网页端页面 |
|--------|----------|-----------|
| M1 基础框架 | `core/`（auth、rbac、tenant、audit） | 登录页、首页看板、主布局、用户管理、角色权限 |
| M2 课程+学员 | `modules/course`、`modules/student` | 课程管理、班级管理、课次排课、学员档案 |
| M3 线索+招生 | `modules/lead` | 渠道管理、市场活动、线索 CRM、转化漏斗 |
| M4 订单+课时 | 待开发 | 待开发 |
| M5 作业+家长端 | 待开发 | 家长端/老师端 H5（Ant Design Mobile）待开发 |

### 页面清单（web/src/pages）
`Login` 登录 · `HomePage` 首页看板 · `CoursePage` 课程/分类 · `ClassGroupPage` 班级 ·
`LessonPage` 课次排课（单条 + 按周批量生成）· `StudentPage` 学员/家长/报名 ·
`LeadPage` 线索 CRM · `ChannelPage` 渠道 · `CampaignPage` 活动 · `FunnelPage` 转化漏斗 ·
`UserPage` 用户 · `RolePage` 角色权限

### 鉴权与安全
- 登录返回 `accessToken` + `refreshToken`；前端请求自动携带 Bearer 令牌。
- 访问令牌过期时，客户端自动用 `refreshToken` 续期并重放请求，续期失败才跳转登录页。
- 全局限流：默认 300 次/分钟/IP；登录接口 10 次/分钟、刷新接口 30 次/分钟。
- 刷新令牌不能作为访问令牌访问业务接口（后端 `JwtStrategy` 校验令牌类型）。

> 完整字段、枚举与接口约定见 `docs/开发文档-机构管理系统.md` §5 / §6 / §11.3。
