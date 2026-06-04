# 开发说明

## T19 微信小程序三页结构适配

完成时间：2026-06-03

### 已完成范围

- 微信小程序端新增三页 Tab：`首页 / 工具广场`、`AI / 录音与结果`、`我的 / 个人中心`。
- 小程序首页展示技能分类卡片、现成技能“暂未开放”提示和自建工具入口。
- 小程序 AI 页保留开始录音、上传音频、最近录音记录、录音结果查看和七个结果 Tab。
- 小程序“我的”页展示个人信息、Memory Markdown、账号设置、口述 AI 生成助手入口和看板模块占位。
- 小程序登录对接后端 `POST /api/auth/wechat-login` mock，第一版使用本地稳定 mock openid。
- 小程序端接口使用 `uni.request` / `uni.uploadFile`，统一携带同一 JWT token，继续复用 Web 端同一套后端 API 和用户 ID 过滤逻辑。
- `manifest.json` 已增加 `scope.record.desc`，AI 页代码中也标注了小程序录音权限说明。

### 小程序录音权限说明

- 小程序端录音使用 `uni.getRecorderManager`，需要 `scope.record` 授权。
- 页面应在录音前提示用户：请先取得沟通对象同意录音，并遵守门店及当地隐私要求。
- `scope.record.desc` 当前说明为：用于在宠物医院接诊沟通中录音，并生成 AI 辅助整理结果；录音前需取得沟通对象同意。
- 第一版不要求真实审核上线；真实上线前还需要结合微信小程序隐私保护指引、服务端真实 openid 获取链路和门店授权口径继续补充。

### T19 验证结果

- `tsc -p backend/tsconfig.json --noEmit`：通过。
- `vue-tsc --noEmit`：通过。
- `@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`：通过。
- `@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`：通过。

## T12 Web 登录页与隐私授权

完成时间：2026-06-01

### 已完成范围

- Web H5 登录页支持账号、密码、登录按钮、错误提示、登录 loading 和成功进入主框架。
- 主框架认证通过后，按当前用户 ID 检查本地隐私确认状态。
- 首次登录或本地确认状态不存在时，展示录音授权与隐私提示弹窗。
- 弹窗内容明确覆盖录音与 AI 生成、门店和当地隐私要求、录音用途、医疗内容需人工确认。
- 用户必须点击确认按钮后弹窗才会关闭；遮罩点击不会关闭。
- 当前确认状态先写入本地 `uni` storage，代码中预留后端用户字段同步 TODO。

### T12 验证结果

- `npm run typecheck -w frontend`：通过。
- `npm run build:h5 -w frontend`：通过。

## T04 Memory 模块后端与前端基础页面

完成时间：2026-05-31

### 已完成范围

- 新增个人 Memory 后端路由，统一接入 `requireAuth`。
- 新增接口：
  - `GET /api/memory`
  - `POST /api/memory/init`
  - `PUT /api/memory`
  - `POST /api/memory/suggestions`
  - `POST /api/memory/suggestions/:id/accept`
  - `POST /api/memory/suggestions/:id/reject`
- 个人 Memory 按当前用户 `user_id` 绑定，使用 `memory_type = personal_memory`。
- Memory 初始化表单字段覆盖城市、门店、岗位、个人背景、工作场景、常见任务、个人偏好。
- Markdown 模板固定包含 `# 个人 Memory`、`## 基础信息`、`## 工作背景`、`## 常见任务`、`## 沟通偏好`、`## 长期有效信息`。
- suggestion 只先落 `memory_update_suggestions`，必须用户 accept 后才写入 `memories`。
- Web 首页升级为 `AI 搭档 / Memory` 工作台，支持初始化、查看、编辑保存和建议弹窗。
- 小程序新增“我的”页面，预留 Memory 查看入口。

### 更新原则

- 普通客户聊天、普通接诊沟通不默认触发 Memory 更新。
- 当前只有显式长期有效信息，或文本包含长期有效信号时，才创建 pending suggestion。
- reject 不修改 Memory；accept 才将 `after_data.contentText` 写回 Memory。

### T04 验证结果

- `npm run typecheck -w backend`：通过。
- `npm run typecheck -w frontend`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- 使用临时 SQLite 库和 seed 用户完成接口复验：
  - 首次 `GET /api/memory` 返回空 Memory。
  - `POST /api/memory/init` 可创建 Memory。
  - `PUT /api/memory` 可编辑保存 Markdown。
  - 普通接诊聊天不创建 suggestion。
  - 长期有效信息可创建 pending suggestion。
  - accept 写入 Memory，reject 不修改 Memory。

## T02 后端认证与用户基础接口

完成时间：2026-05-29

### 已完成范围

- 新增 Prisma Client 单例：`backend/src/db/prisma.ts`。
- 新增密码工具：使用 Node.js `crypto.scrypt` 生成和校验密码 hash。
- 新增 JWT 工具：使用 `JWT_SECRET` 和 HS256 生成、校验本地 JWT。
- 新增认证中间件：`requireAuth`，会从 `Authorization: Bearer <token>` 读取 JWT，并写入 `req.currentUser`。
- 新增认证接口：
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/wechat-login`
  - `POST /api/auth/bind-wechat`
- 更新 seed：`demo_doctor` 的密码 hash 改为真实 hash，测试密码为 `demo_password`。
- 新增 API 文档：`docs/api.md`。

### 安全约定

- 密码只保存 hash，不返回 `password_hash`。
- JWT secret 必须来自环境变量 `JWT_SECRET`。
- 受保护接口未登录、token 无效、token 过期、用户停用统一返回 `401 UNAUTHORIZED`。
- 后续业务接口应统一接入 `requireAuth`，并默认以 `req.currentUser.id` 过滤用户自有数据。

### 运行方式

```bash
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev:backend
```

seed 用户：

- 用户名：`demo_doctor`
- 密码：`demo_password`

### T02 验证结果

- `npm run typecheck -w backend`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t02-auth-20260529.db" JWT_SECRET="local-t02-test-secret" npm run db:seed -w backend`：通过。
- `GET /api/auth/me` 未带 token：通过，返回 `401 UNAUTHORIZED`。
- `POST /api/auth/login` 使用 `demo_doctor` / `demo_password`：通过，返回 JWT 和用户信息。
- `GET /api/auth/me` 携带 JWT：通过，返回当前用户信息。
- `POST /api/auth/wechat-login` 携带 mock `openid` / `unionid`：通过，可创建微信 mock 用户并返回 JWT。
- `POST /api/auth/bind-wechat` 携带 JWT 和 mock `openid` / `unionid`：通过，可绑定当前用户。

### 注意事项

- 本次未新增数据表，不需要新的 Prisma migration。
- 当前工作区路径包含中文和空格时，`prisma migrate dev` 仍可能出现空的 `Schema engine error`。本次接口验收通过直接执行既有迁移 SQL 创建临时 SQLite 库后完成。

## T01 数据库 Schema 与 Prisma 模型

完成时间：2026-05-29

### 已完成范围

- 引入 Prisma 7、`@prisma/client` 和 SQLite driver adapter。
- 创建 `backend/prisma/schema.prisma`，建立第一版业务数据模型。
- 创建迁移文件：`backend/prisma/migrations/20260529030855_init_schema/migration.sql`。
- 创建 seed 脚本：`backend/prisma/seed.ts`。
- 新增数据库脚本：
  - `npm run db:generate`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run db:studio`
- 新增后端业务枚举类型定义：`backend/src/types/domain.ts`。
- 新增 schema 文档：`docs/database-schema.md`。

### 字段设计

- 数据库表名和列名按 PRD 使用 snake_case；Prisma 模型使用 PascalCase / camelCase，并通过 `@@map`、`@map` 映射到实际表和列。
- 所有可变业务表保留 `created_at`、`updated_at`，其中 `updated_at` 使用 Prisma `@updatedAt` 自动维护。
- `recordings`、`generation_results`、`memories`、`custom_tool_requirements`、`projects`、`project_items`、`resources`、`stores` 使用 `deleted_at` 支持软删除。
- `audit_logs` 与 `ai_call_logs` 是追加型日志表，只保留 `created_at`，不设置 `updated_at` 和软删除。
- 结构化 AI 内容、审计前后数据、资源元数据使用 Json 字段，保留后续迁移到 PostgreSQL JSON 类型的空间。
- `ai_call_logs.estimated_cost` 使用 Decimal，避免后续成本统计用 Float 累积误差。
- 未在任务卡中强约束的表字段保持第一版最小可用：优先满足用户、门店、录音、生成结果、反馈、待办、Memory、项目和资源之间的关联关系。

### 枚举设计

T01 只将任务卡明确要求的状态设计为 Prisma enum，并同步导出 TypeScript literal union：

- `RecordingProcessingStatus`：覆盖上传、已上传、转写中、生成中、完成、失败。
- `GenerationResultType`：覆盖默认生成结果、主动生成模块和团队知识。
- `GenerationModuleStatus`：表示单个生成模块的生成进度。
- `GenerationStatus`：表示生成结果被保存、采纳、拒绝、重新生成或确认的业务状态。
- `GenerationFeedbackAction`：限定反馈动作为采纳、不采纳、重新生成。
- `TodoStatus`：限定待办为待处理、已完成、已取消。
- `MemoryUpdateSuggestionStatus`：限定 Memory 更新建议为待处理、已接受、已拒绝。
- `CustomToolRequirementStatus`：限定自建工具需求为草稿、已生成、已归档。

### 运行方式

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
```

seed 会创建：

- 用户：`demo_doctor`
- 门店：`宠一科技测试门店`

当前工作区路径包含中文和空格时，Prisma 7 schema engine 对相对 SQLite URL 可能返回空的 `Schema engine error`。本次验收使用绝对 SQLite URL 完成：

```bash
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:migrate
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:seed
```

### T01 验证结果

- `npx prisma validate`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:migrate`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:seed`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npx prisma migrate status`：通过，数据库 schema 为最新。
- `npm run typecheck`：通过。
- `npm run build`：通过。

### 当前未完成范围

- T01 不实现登录、录音上传、转写、AI 生成、编辑保存、导出和待办业务接口。
- T01 不实现数据库读写 service 层。
- PostgreSQL 尚未执行实库迁移验证；当前 schema 保留了迁移空间。

## T00 工程初始化与开发规范

完成时间：2026-05-29

### 已完成范围

- 创建 monorepo 工程结构：
  - `frontend`：uni-app + Vue 3 + TypeScript。
  - `backend`：Node.js + TypeScript + Express。
  - `docs`：开发文档目录。
- 添加根目录 `.env.example`，包含数据库、JWT、私有存储、AI provider、转写 provider、导出目录等配置。
- 添加基础代码规范：
  - `.editorconfig`
  - `.prettierrc`
  - `tsconfig.base.json`
- 后端实现：
  - 统一成功响应格式。
  - 统一错误响应格式。
  - 请求 ID 中间件。
  - `GET /api/health` 健康检查接口。
- 前端实现：
  - H5 默认首页。
  - `mp-weixin` 构建脚本与 `manifest.json` 结构预留。

### 运行方式

```bash
npm install
cp .env.example .env
npm run dev:backend
npm run dev:frontend
```

健康检查：

```bash
curl http://localhost:3000/api/health
```

后端如需热重载：

```bash
npm run dev:watch -w backend
```

### 当前未完成范围

- 未实现账号密码登录。
- 未实现微信登录接口。
- 未实现 Memory、录音、音频上传、语音转写、AI 生成、编辑保存、采纳、不采纳、重新生成。
- 未实现 PDF / 图片导出。
- 未实现智能回访转待办。
- 未实现审计日志持久化。
- 未接入 PostgreSQL / Prisma 业务模型。

### MVP 决策记录

- 后端选择 Express 而非 NestJS，优先降低第一阶段工程复杂度。
- 语音转写、LLM、StorageProvider 在 T00 只预留环境变量，不创建业务抽象，避免超出任务卡范围。
- 本地数据库默认示例使用 SQLite URL，保留 PostgreSQL 环境变量示例，便于后续 Prisma schema 迁移。
- uni-app Vue 3 依赖使用 npm `vue3` dist-tag 对应版本线：`3.0.0-alpha-5010120260525001`。`@dcloudio/vite-plugin-uni` 的 peer dependency 要求 Vite `5.2.8`，因此前端锁定该 Vite 版本。
- `npm install` 当前会提示上游依赖的 deprecated 与 audit 警告。T00 不执行强制升级，避免破坏 uni-app 编译链路；后续如升级 uni-app 版本线，需要单独做兼容性验证。

### T00 验证结果

- `npm run typecheck -w backend`：通过。
- `npm run build -w backend`：通过。
- `npm run typecheck -w frontend`：通过。
- `npm run build:h5 -w frontend`：通过。
- `npm run dev -w backend`：可启动，`GET /api/health` 返回统一成功响应。
- `npm run dev:frontend`：可启动，H5 dev server 返回默认页面。
