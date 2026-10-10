# 校外培训机构管理系统（前后端分离）

依据 `docs/开发文档-机构管理系统.md`（v1.9）实现。
当前交付：**M1 基础框架 + M2 课程/学员 + M3 线索/招生 + M4 订单/课时 + M5 作业/家长端 + M6 数据看板 + M8 待办中心补全（提醒推送·审批流配置·审批接入·消息渠道配置·客诉与成绩录入事件化来源）+ **课程双维度拆分（课包管课时 · 课件管上课）+ 统一资源上传与存储（本地/OSS 可配置）+ §4.14 师资员工 + §4.15 教室场地 + §4.17 优惠券（订单抵扣打通）+ §4.23 合同电子签 + §4.19 积分会员 + §4.22 问卷满意度 + §4.10 看板预警规则 + §4.11 多校区组织 + §4.20 教材库存 + §4.21 机构成本 + §4.24 团购拼团 + §4.28 分销裂变 + §4.13 在线课堂/督学 + §11.6 老师考勤打卡 + §4.10 看板增强（动态指标配置/多校区汇总对标/自定义报表/预警联动推送）+ 移动端三端 UI 补全（老师排班打卡·顾问营销工具·家长服务）**
（M4 含文档 §4.5 财务：退费按消课比例扣费、分账、教师工资、发票、财务报表；§4.6 课时：补课排课、点名自动生成课后点评任务。
M5 含 §4.7 作业闭环与 §6.23/§11.6 家长端 H5。
M6 含 §4.10 数据经营分析：经营/招生/教学三视图看板（营收·课消·满班·漏斗·出勤·作业预警）。

> 环境要求：**Node >= 22**（前后端均已声明 `engines`）。

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
│   │       ├── course-package/    # 课包（售卖套餐）：套餐课时 + 可上课程范围 + 购课发放
│   │       ├── courseware/        # 课件：课程阶段(大纲文件) → 课时课件(PPT/资源包)
│   │       ├── resource/          # 统一资源：上传/管理，本地存储 或 阿里云 OSS 可配置
│   │       ├── staff/              # §4.14 师资与员工：员工主体 / 师资档案 / 资质证书
│   │       ├── venue/              # §4.15 教室与场地：场地主数据（排课/考勤复用）
│   │       ├── coupon/             # §4.17 优惠券：模板/发放/核销 + 订单抵扣打通
│   │       ├── contract/           # §4.23 合同电子签：模板/实名+手写签名/存证链
│   │       ├── membership/         # §4.19 积分会员：等级/积分规则/流水/自动升级
│   │       ├── survey/             # §4.22 问卷满意度：模板/回收/NPS 统计
│   │       ├── alert/              # §4.10 看板预警：规则配置 + 指标评估触发
│   │       ├── org/                 # §4.11 多校区组织：机构/校区树（HQ/BRANCH/CAMPUS）
│   │       ├── inventory/           # §4.20 教材库存：物料主数据 + 出入库流水（防负库存）
│   │       ├── cost/                # §4.21 机构成本：成本登记 + 按类别汇总
│   │       ├── groupbuy/            # §4.24 团购拼团：活动/拼团/成员 + 满员成团 + 核销
│   │       ├── distribution/        # §4.28 分销裂变：分销员层级 + 佣金登记/结算/汇总
│   │       └── teaching/            # §4.13 在线课堂/督学：课堂 + 出勤打卡 + 出勤统计
│   │       └── attendance/          # §11.6 老师考勤打卡：上下班/课次打卡记录（teacher_clocks）
│   │       ├── student/           # M2 学员·家长多对多绑定·报名
│   │       ├── lead/              # M3 渠道·活动·线索·跟进·试听·转化·漏斗
│   │       ├── order/             # M4 订单·订单项·支付·退费（状态机 + 退费按消课比例）
│   │       ├── hour/              # M4 课时账户·消课流水·考勤点名·请假·补课排课
│   │       ├── finance/           # M4 §4.5 分账配置/记录、教师工资单、发票、财务报表汇总
│   │       └── task/              # M4/M8 §4.26 待办中心：聚合/逾期/统计/事件化来源（课后点评·作业批改·客诉处理·成绩录入）
│   │       ├── homework/          # M5 作业布置·提交·批改·统计（§4.7）
│   │       ├── parent/            # M5 家长账号·OTP登录·绑定·我的作业/课表/点评（§6.23）
│   │       ├── family/            # M5 家校服务：课后点评 course_review（§6.6）
│   │       ├── dashboard/         # M6 数据看板：经营/招生/教学聚合（§4.10/§6.7）
│   │       ├── notification/      # M8 站内通知中心（任务提醒/审批结果触达，§4.26）+ 外部渠道配置(腾讯云/阿里云短信/微信)
│   │       ├── complaint/          # M8 客诉管理（登记/分派/处理闭环，COMPLAINT 待办事件化，§4.26/§6.23）
│   │       └── approval/          # M8 审批中心（实例/节点/通过驳回，§4.16，审批任务入待办中心）+ 审批流模板配置 flows CRUD
│   ├── test/                      # e2e 测试（jest + supertest，零外部依赖）
│   ├── .env.example
│   └── package.json
├── mobile/                        # ★ 移动端 H5（React + Ant Design Mobile 5，一套代码三端）
│   ├── src/
│   │   ├── api/                   # axios 客户端（按角色 token）+ parent / staff 接口
│   │   ├── pages/
│   │   │   ├── parent/            # 家长端：学员 · 课表 · 作业 · 点评 · 我的(消课/成长/缴费/通知)
│   │   │   ├── teacher/           # 老师端：待办 · 课表点名 · 作业批改 · 成绩录入 · 课后点评
│   │   │   └── consultant/        # 顾问端：线索跟进 · 试听排期 · 转化漏斗
│   │   └── main.tsx               # 角色路由 /p/* /t/* /c/* + 登录守卫（HashRouter）
│   ├── vite.config.ts             # dev 代理 /api → http://localhost:3000（端口 5174）
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
| 后端 `server/` | NestJS 10 + TypeScript + TypeORM + MySQL 8（本地默认 **better-sqlite3** 原生 SQLite）+ JWT + Swagger |
| 网页端 `web/` | React 18 + TypeScript + Vite + **Ant Design 5**（遵循文档 §12 UI 规范：Token 唯一真源、列表=筛选条+表格+分页、详情=Descriptions+Tabs） |
| 移动端 `mobile/` | React 18 + TypeScript + Vite + **Ant Design Mobile 5**（家长/老师/顾问三端 H5，HashRouter；后续可套壳 App 或转小程序，见 §11.6） |

> 本地 SQLite 用 `better-sqlite3`（原生驱动，性能好、类型行为接近 MySQL）。因 Node 固定 22、ABI 稳定，无需 Docker/MySQL 即可启动与跑测试。

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
npm run dev:mobile   # 家长端 H5 http://localhost:5174
```

移动端三端共用一个 H5（登录页选择角色）：
- **家长**：手机号 + 短信验证码登录 → 课表 / 作业（在线提交）/ 点评 / 我的（消课考勤、成长档案、缴费、通知与续费提醒）。
- **老师**：机构账号密码登录 → 待办中心 / 班级课表与点名消课 / 作业批改 / 成绩录入 / 课后点评。
- **顾问**：机构账号密码登录 → 线索跟进 / 试听排期 / 转化漏斗。

（非生产环境后端会在 OTP 响应中回传验证码 `code` 便于联调；生产应接入短信服务。）

学员与家长的绑定关系在 PC 端「学员档案 - 家长」维护，或在家长端「我的学员 - 绑定学员」按学员 ID 绑定。

> 网页端通过 Vite 代理将 `/api` 转发到 `http://localhost:3000`，
> 因此**前端与后端共用同一个后端实例**，本地开发无需任何跨域配置。

启动后端会自动完成：建表（`DB_SYNCHRONIZE=true`）→ 初始化默认租户、权限点、角色与超级管理员。

- 默认账号：`admin` / `admin123456`
- 本地默认使用 **better-sqlite3 内存库**（`DB_SQLITE_PATH=:memory:`，进程重启数据清空）；
  - 需要本地落盘调试：把 `DB_SQLITE_PATH` 改为文件路径（如 `./data.db`），数据即可持久化查看；
  - 需要连 MySQL：把 `DB_TYPE` 改为 `mysql` 并配置 `DB_*`。

## 构建与测试

```bash
npm run build   # 后端 nest build + 前端 vite build
npm test        # 后端 e2e（75 个用例，better-sqlite3 内存库，零外部依赖）
```

e2e 覆盖：登录/鉴权 · RBAC · 排课冲突 · 班级详情 · 线索全流程 · 漏斗 ·
**M4 基础闭环**（下单→支付→发放课时→点名消课→退费回滚）·
**M4 进阶**（退费按消课比例、分账、教师工资、发票开具、补课排课、课后点评任务、财务报表）·
**M5 作业闭环 + 家长端**（布置→家长 OTP 登录→绑定→越权校验 403→提交→批改→统计→点评）·
**统一资源/课包/课件**（上传本地文件→课包购课发放→课件阶段树→课包账户跨课程抵扣点名消课）·
**M5 成长档案与家校通知**（测评→成绩→素养→赛事获奖→时间轴→通知/续费提醒→家长可见与越权隔离）·
**M6 数据看板**（经营/招生/教学三视图：营收·课消率·满班率·漏斗·出勤率·作业预警，对齐 §4.10/§6.7）。
**M8 待办中心补全**（§4.26：逾期派生·我的待办 GET /todos·聚合统计 GET /tasks/stats·作业提交→待批改事件化闭环·批改关闭；站内通知提醒（notification）；审批中心接入，APPROVAL 任务入待办中心、通过/驳回、多节点推进；**审批流模板配置（§4.16 增强）**：`POST/GET/PUT/DELETE /approvals/flows`，可视化配置节点与审批人、按业务类型复用，发起时 `flowId` 套用）；**消息渠道配置（§4.26 多渠道提醒）**：`GET/PUT/DELETE /notifications/channels`，内置腾讯云/阿里云短信发送接口（TC3-HMAC-SHA256 / RPC-HMAC-SHA1，纯 Node 实现无需 SDK），管理员填密钥即启用，微信通道接口预留）；**客诉与成绩录入事件化来源（§4.26 补全）**：新增客诉模块（登记→分派/改派→处理闭环，自动生成/关闭 COMPLAINT 待办+通知）；测评创建→SCORE_ENTRY 待办+通知、录分→关闭，与待办中心/审批接入同源闭环）。
**经营增强模块（P3/P4）**：**§4.11 多校区组织**（`GET /orgs` 树 + 增/改/删，有下级拒删）；**§4.20 教材库存**（`/materials` 物料 + `/materials/:id/stock` 出入库流水，防负库存）；**§4.21 机构成本**（`/costs` 登记 + `/costs/stats/by-category` 按类别汇总）；**§4.24 团购拼团**（`/group-buy/activities` 活动 + `/group-buy/teams` 开团/参团满员自动成团 + `/group-buy/redeem` 仅已成团可核销）；**§4.28 分销裂变**（`/distribution/distributors` 层级树 + `/distribution/commissions` 佣金登记/结算 + `/distribution/stats` 汇总）；**§4.13 在线课堂/督学**（`/teaching/classes` 课堂 + 开始/结束 + `/teaching/study` 出勤打卡 + `/teaching/study/stats/:classId` 出勤统计）。

## 里程碑与模块对应

| 里程碑 | 后端模块 | 网页端页面 |
|--------|----------|-----------|
| M1 基础框架 | `core/`（auth、rbac、tenant、audit） | 登录页、首页看板、主布局、用户管理、角色权限 |
| M2 课程+学员 | `modules/course`、`modules/student` | 课程管理、班级管理、课次排课、学员档案 |
| M3 线索+招生 | `modules/lead` | 渠道管理、市场活动、线索 CRM、转化漏斗 |
| M4 订单+课时 | `modules/order`、`modules/hour`、`modules/finance`、`modules/task` | 订单与财务（下单/支付/退费预览）、课时管理（账户/流水/预警）、课次点名消课、财务对账（分账/工资/发票/报表）、待办中心 |
| M5 作业+家长端 | `modules/homework`、`modules/parent`、`modules/family` | PC 作业管理（布置/批改/统计）、**家长端 H5**（登录/学员/课表/作业/点评） |
| M6 数据看板 | `modules/dashboard` | **数据看板页**（经营/招生/教学三视图：营收·课消·满班·漏斗·出勤·作业预警） |
| M8 待办中心补全 | `task`、`homework`、`notification`、`approval`、`complaint` | **待办中心增强**（聚合/逾期标红/我的-全部·站内提醒·审批接入·审批流模板配置 UI·**消息渠道配置页**·**客诉管理页**·**成绩管理页**：APPROVAL 任务入待办中心、通过/驳回、多节点推进、按模板发起、腾讯云/阿里云短信触达；**客诉与成绩录入事件化来源**：客诉登记→分派/处理闭环生成 COMPLAINT 待办、测评创建→SCORE_ENTRY 待办、录分关闭） |

> M4 已闭环并全量补齐：
> - **订单链路**：下单→支付（自动发放课时）→上课点名消课→退费（审批后按剩余课时回滚，防资损）
> - **§4.5 财务**：退费按消课比例扣费、分账（教师提成/渠道分成）、教师工资单、电子发票、财务报表汇总
> - **§4.6 课时**：请假不消课、补课排课（占用可用课时）、点名后自动生成"待写课后点评"任务（§4.26 待办中心骨架）
>
> 未接入外部能力（仅本地记录与状态模拟）：持牌支付机构的**实时分账**、税务**发票开具 API**；
> 优惠体系（优惠券/折扣）依赖 §4.17 券模块，尚未实现。

> M5 已闭环：布置→家长提交→老师批改→家长查看反馈，并输出提交率/优秀率/按时率看板。
> - **移动端三端**：家长端（OTP 登录）、老师端（账号密码）、顾问端（账号密码）共用一套 H5，按角色分流路由。
> - **成长档案**（§4.8）：测评/成绩/素养/赛事/获奖，聚合为时间轴，家长端可查阅。
> - **家校服务**（§6.6）：通知（含已读）与续费提醒，家长端可见。
> - **家长端认证**：手机号 + OTP 登录/注册（`kind=parent` 独立身份，无 RBAC 权限，靠"已绑定学员"做数据隔离）。
> - **越权防护**：家长只能为**已绑定**的学员提交作业/查看数据，越权返回 403。
> - **OTP 为内存态**（单机开发/测试用，生产应接入短信服务并改用 Redis 存储 + 严格限频）。
> - 老师端 §11.6 已落地：打卡任务 + 个人排班/考勤（考勤打卡 `teacher_clocks` + 我的课次排班视图）。
> - 顾问端已落地：转介绍奖励（§4.28 佣金登记/结算/汇总）、团购核销（§4.24）、优惠券发放（§4.17 顾问端发放 UI）。
> - 家长端已落地：转介绍（§4.28 分销员登记/佣金）、客诉/售后（§4.26 客诉）、合同查看（§4.23）、团购核销（§4.24）。移动端三端共用一套 H5，按角色分流路由（家长 OTP / 老师·顾问账号密码）。

> M6 已交付（§4.10 数据经营分析 / §6.7 接口）：
> - **经营看板**：应收/已收/退款/净现金流、在读数/退费、课消率、班级满班率、近 6 月趋势、招生漏斗摘要。
> - **招生看板**：线索漏斗（总量/试听/报名/转化）、各阶段分布、按渠道/活动分布、超 7 天未跟进预警。
> - **教学看板**：出勤率、作业提交/批改/优秀/逾期、课后点评数、待办聚合、风险预警（待批改/待点评/待办）。
> - 接口对齐 `GET /api/v1/dashboards/{role}`（role ∈ principal|admission|teaching），受 `dashboard:view` 权限保护。
> - 聚合在应用层完成（与 §4.2 漏斗一致），规避 MySQL/SQLite 日期方言差异。
> - **已实现（§4.10 看板增强）**：`metric_def` 动态指标配置（按角色动态挂载到看板 `dynamicMetrics`）、多维自定义报表（`POST /dashboards/report` 按数据源/维度/指标聚合）、连锁多校区汇总对标（`GET /dashboards/benchmark`，依赖 §4.11 多校区）、`alert_rule` 预警联动推送（`POST /alert-rules/evaluate` 取看板指标快照→命中规则→推送站内通知）。

> M8 待办中心补全（§4.26 待办中心）：
> - **聚合能力**：逾期派生（超过 `dueAt` 即逾期，并按严重逾期阈值 72h 标记需升级）、我的待办（`GET /api/v1/tasks/todos`，按当前登录人）、聚合统计（`GET /api/v1/tasks/stats`：总/逾期/严重逾期/按类型分布）。
> - **事件化来源闭环**：点名消课 → 自动生成"课后点评"任务（M4 既有）；作业提交 → 自动生成"待批改"任务、批改完成 → 自动关闭该任务（M8 新增）；客诉登记（带分派）→ 自动生成"客诉处理"任务、处理完成 → 关闭该任务（M8 新增）；测评创建 → 自动生成"成绩录入"任务、录分完成 → 关闭该任务（M8 新增）。
> - **提醒推送（§4.26 多渠道提醒）**：任务创建即向负责人推送**站内通知**（`notification` 模块；`GET /notifications`、`/unread-count`、`/read`）；未读红点 + 顶栏通知铃铛；微信/短信通道字段已预留，待接入外部网关。
> - **审批接入（§4.16 审批中心）**：通用审批流（实例+多级节点）`approval` 模块；发起审批 → 自动生成 `APPROVAL` 类型任务并入待办中心，审批人在待办中心直接「通过/驳回」，终审后关闭任务并通知发起人；与业务单据强关联（`biz_type`+`biz_id`），操作落 `audit_log`。
> - **审批流模板配置（§4.16 增强）**：`POST/GET/PUT/DELETE /api/v1/approvals/flows` 管理可复用审批流；每个节点支持「指定用户」或「指定角色（角色下成员均可审批，任一通过后关闭所有成员待办）」；发起审批时传 `flowId` 自动套用节点配置，无需每次手写审批人；节点可增删/排序/启停。
> - **权限**：复用 `task:*` / `notification:*` / `approval:*` 资源点（已在 rbac 目录并同步超级管理员）。
> - **前端**：待办中心页支持"我的待办/全部"切换、状态/类型/逾期筛选、逾期标红与严重逾期标记、类型分布统计卡；`APPROVAL` 任务提供「通过/驳回」；首页待办概览卡；顶栏通知铃铛；新增**审批流配置页**（系统管理→审批流配置，可视化节点/审批人配置）；待办中心新增「发起审批」弹窗（可选套用模板或手动指定审批人）；新增**消息渠道配置页**（系统管理→消息渠道配置，腾讯云/阿里云短信密钥配置）。
> - **消息渠道配置（§4.26 多渠道提醒）**：`GET/PUT/DELETE /api/v1/notifications/channels` 管理按租户的外部渠道（SMS_TENCENT / SMS_ALIYUN / WECHAT），密钥存于 `config_json`；通知创建后 `ExternalChannelService` best-effort 补发短信（有用户手机号即发），失败仅记日志、不阻断业务与站内通知。腾讯云/阿里云短信发送接口为纯 Node 实现（`crypto`+`fetch`，TC3-HMAC-SHA256 / RPC-HMAC-SHA1），无需第三方 SDK，管理员填密钥即启用；微信接口已按官方 API 实现，待「用户 openid 绑定」后启用。
> - **客诉模块（§4.26 客诉分派 / §6.23 客诉售后）**：`POST/GET /complaints`、`PUT /complaints/:id/assign`、`POST /complaints/:id/resolve`；登记→分派/改派→处理闭环，自动生成/关闭 COMPLAINT 待办并通知处理人；前端客诉管理页（列表筛选·登记·分派·处理）。
> - **未实现**：微信真实下发（短信已实现；微信接口已就绪，待 openid 绑定）、退费/调课/转班等具体业务与审批中心的资金联动（退费资金逻辑维持 M4 自洽、暂不接入审批中心以避免资损）。

### 课程双维度：课包（管课时）+ 课件（管上课）
课程拆为两条独立主线，解决"卖的套餐"与"上的内容"混杂的问题：

- **课包 `course-package`（售卖套餐 / 课时维度）**
  - `course_package`：套餐名称、总课时 `total_hours`、有效期、标价、上下架。
  - `package_course`：套餐**可上哪些课程**（套餐 ↔ 课程多对多）。
  - 购课发放：`POST /course-packages/:id/purchase` 或订单项 `HOUR_PACK + packageId` 支付成功后，
    课时发放到学员**课包账户**（`hour_account.course_id=null` 且 `package_id=套餐`）。
  - **跨课程抵扣**：点名消课时优先扣"课程专属账户"，不足时自动回退到**覆盖该课程的课包账户**（§4.6 课包课时通用），流水记录 `package_id` 便于溯源。
- **课件 `courseware`（上课 / 内容维度）**
  - 层级：**课程 → 阶段 `course_stage`（含大纲文件）→ 课时课件 `courseware`（PPT/资源包等多文件）**。
  - 接口：`POST/GET /courses/:id/stages`、`POST /stages/:id/coursewares`、`GET /courses/:id/stages`（阶段树含课件）、`PUT/DELETE /stages/:id`、`PUT/DELETE /coursewares/:id`。

### 统一资源上传与存储（本地 / OSS 可配置）
所有文件（大纲、PPT、资源包、头像等）统一走 `resource` 模块，屏蔽存储差异：

- 接口：`POST /resources/upload`（多文件，字段 `files`）、`GET /resources`（按分类/关联筛选）、`GET /resources/:id`、`DELETE /resources/:id`（软删 + 清理底层对象）。
- 数据库 `resource` 记录：`storage_type`(local/oss)、`storage_key`、`url`、`mime_type`、`size`、`category`、`refType/refId`。
- 存储驱动可插拔（`StorageDriver` 接口）：
  - **local**（默认）：写入 `UPLOAD_DIR`，经 `/files/*` 静态路由访问。
  - **oss**：`STORAGE_TYPE=oss` 时启用阿里云 OSS（`ali-oss`，延迟加载，使用前需 `npm i ali-oss`）。
- 配置见 `.env.example`：`STORAGE_TYPE`、`UPLOAD_DIR`、`PUBLIC_BASE_URL`、`OSS_*`。
- 权限点：`resource` / `course-package` / `courseware` 模块随 RBAC `MODULES` 自动播种（view/create/update/delete/export）；
  上传为动作型权限点 **`resource:upload`**（已加入 `EXTRA_PERMS`），超级管理员与授课老师均持有。

### 页面清单（web/src/pages）
`Login` 登录 · `HomePage` 首页看板 · `CoursePage` 课程/分类 · `ClassGroupPage` 班级 ·
`LessonPage` 课次排课（单条 + 按周批量生成 + 点名消课 + 补课排课）· `StudentPage` 学员/家长/报名 · `StudentLifecyclePage` 学员全生命周期视图(线索→到店体验→购课→上课→续课→服务→结课/退费) ·
`OrderPage` 订单与财务（下单/支付/退费预览按消课比例）· `HourPage` 课时管理（账户/流水/预警）·
`FinancePage` 财务对账（分账/工资 · 发票 · 财务报表）· `TaskPage` 待办中心（我的待办/逾期标红/按类型统计）·
`HomeworkPage` 作业管理（布置/提交批改/统计提交率·优秀率·按时率/未提交名单）·
`LeadPage` 线索 CRM · `ChannelPage` 渠道 · `CampaignPage` 活动 · `FunnelPage` 转化漏斗 ·
`UserPage` 用户 · `RolePage` 角色权限 · `ComplaintPage` 客诉管理（登记/分派/处理闭环）· `ScorePage` 成绩管理（测评创建/录分·SCORE_ENTRY 事件化）·
`CoursePackagePage` 课包管理（套餐增删改·关联可上课程·购课发放课时）· `CoursewarePage` 课件管理（课程→阶段(含大纲上传)→课时课件(资源包上传)）· `ResourcePage` 资源库（上传/按分类筛选/删除，本地或 OSS）· `OrgPage` 多校区组织（机构/校区树）· `InventoryCostPage` 教材库存 + 机构成本（出入库/成本登记/按类别汇总）· `CouponPage` 优惠券（模板/发放/核销 + 订单抵扣）· `ContractPage` 合同电子签（模板/签署/作废）· `MemberPage` 积分会员（等级/积分流水/自动升级）· `SurveyPage` 问卷满意度（模板/回收/NPS 统计）· `AlertPage` 看板预警（规则配置/指标触发）· `GroupBuyPage` 团购拼团（活动/开团/参团/核销）· `DistributionPage` 分销裂变（分销员层级/佣金结算/汇总）· `TeachingPage` 在线课堂/督学（课堂开始结束/出勤打卡/统计）· `ReportPage` 看板配置与报表（动态指标配置 / 多校区对标 / 自定义报表 / 预警评估）

### 鉴权与安全
- 登录返回 `accessToken` + `refreshToken`；前端请求自动携带 Bearer 令牌。
- 访问令牌过期时，客户端自动用 `refreshToken` 续期并重放请求，续期失败才跳转登录页。
- 全局限流：默认 300 次/分钟/IP；登录接口 10 次/分钟、刷新接口 30 次/分钟。
- 刷新令牌不能作为访问令牌访问业务接口（后端 `JwtStrategy` 校验令牌类型）。

> 完整字段、枚举与接口约定见 `docs/开发文档-机构管理系统.md`：
> §4.5 订单与财务 · §4.6 课时管理 · §4.26 待办中心 · §5 数据库设计 · §6 API · §11.3 状态机。
