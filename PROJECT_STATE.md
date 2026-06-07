# 项目状态

项目名称：宠物医生 AI 医助

当前任务：`T25-T28 预发部署收口、H5 上传调试、HTTPS 方案、真实 provider 接入前评估`

当前状态：已完成

更新时间：2026-06-07

## 产品范围

MVP 第一阶段的核心目标是跑通“录音 / 上传音频 -> 语音转写 -> AI 生成结果 -> 编辑 / 采纳 / 保存 / 导出 -> 智能回访转待办”的完整闭环。

当前阶段已完成工程初始化、第一版数据库模型、后端认证基础接口、AI / 转写 Provider 抽象层 mock 联调能力、个人 Memory 初始化 / 编辑 / 建议确认流、录音 / 音频上传后端接口、录音完成后的转写流程编排、转写后的默认 AI 生成结果落库、第六 / 第七模块主动生成、生成结果反馈与版本机制、智能回访结果一键转待办、Web H5 主框架、侧边栏和登录路由、首次登录录音授权与隐私提示、Web 端 AI 录音 / 上传 / 状态列表页面、录音结果详情页与七大结果 Tab、七大结果模块结构化前端展示、H5 第一版 PDF / 图片导出、资源库 / 项目空间 / 院长看板占位模块页面和接口结构预留、微信小程序首页 / AI / 我的三页 Tab 结构适配、T20 异常处理、审计日志与医疗安全提示统一加固、T21 Docker 部署与 MVP 手动验收准备，以及 T25-T28 预发部署收口、H5 上传录音调试、HTTPS 实施前方案和真实 provider 接入前评估。

2026-06-03 集成验收收口：已新增 `scripts/mvp-smoke-test.ts`、根 `lint` / `test` / `smoke:mvp` 脚本、SQLite 初始化兜底脚本 `backend/prisma/sqlite-init.ts`，并修复 Docker seed 运行期依赖 `backend/src` 的问题。验收报告见 `docs/current-version-acceptance-report.md`，问题清单见 `docs/integration-issues.md`，本地运行说明见 `docs/local-run.md`。

2026-06-04 集成验收复核：完成项目结构、路由、API、环境变量、部署文件、构建脚本和核心链路复查；补充根 `.gitignore` 对本地 SQLite 数据库文件的忽略规则。`prettier --check .`、后端 typecheck、前端 typecheck、后端 build、H5 build、微信小程序 build、MVP smoke test、临时 SQLite 初始化 + seed、后端健康检查 / 登录、H5 dev server 访问均通过。当前 shell 无 `npm` / `npx` / `docker`，因此未重放 `npm install` 和 Docker Compose 实机启动。

2026-06-07 预发收口：新增 `docs/deployment/T25-server-preview-deployment-acceptance.md`，将服务器 Docker Compose 预发状态固化为“基础上线成功”，不等同于业务完整验收；公网 `GET http://43.129.231.8:8080/api/health` 非沙箱实测返回 200 OK。

2026-06-07 H5 上传调试：修复 Web H5“上传录音”入口，从 `display: none` file input + 程序化 click 改为透明原生 file input 覆盖可见上传控件；新增 `docs/deployment/T26-preview-h5-upload-debug.md`。后端 typecheck、前端 typecheck、后端 build、H5 build 均通过；预发 API 使用 demo 账号完成 multipart 上传、mock 转写、默认生成 6 个模块最小验证。服务器 H5 更新部署和页面手动点击验证仍需 SSH / 部署授权。

2026-06-07 HTTPS 与真实 provider 准备：新增 `docs/deployment/T27-domain-https-plan.md`，建议使用域名 + HTTPS，并优先采用服务器层 Nginx + Let's Encrypt 反代到 `localhost:8080`；未申请证书、未改 DNS、未开放 80 / 443。新增 `docs/deployment/T28-real-provider-readiness.md`，确认真实 provider 名称与 env 已预留，但除 mock 外均尚未实现真实客户端；建议先本地接 LLM，再接转写，真实 key 不进入 Git。

## 技术栈状态

- 前端：已初始化 `frontend`，采用 uni-app + Vue 3 + TypeScript，H5 优先；已实现 Web H5 登录页、首次登录隐私授权弹窗、主框架、固定侧边栏菜单、移动端折叠适配、AI 录音 / 智能工牌录音上传页面、录音结果详情页、七大结果 Tab、不同 `result_type` 的结构化结果展示组件、病历 PDF / 客户画像图片 / 客户画像 PDF 的 H5 前端导出、资源库 / 项目空间 / 院长看板占位页、小程序首页 / AI / 我的三页 Tab 结构，以及录音 / 上传 / 转写 / 生成 / 导出 / 网络 / 登录过期等错误状态和重试入口。
- 后端：已初始化 `backend`，采用 Node.js + TypeScript + Express。
- 状态管理：已引入 Pinia，尚未创建业务 store；T04 页面先使用本地组件状态。
- 数据库：已引入 Prisma 7，完成 SQLite 本地开发 schema、迁移文件、Prisma Client 生成和 seed；`.env.example` 已预留 SQLite 与 PostgreSQL 配置。
- 认证：已实现 Web 账号密码登录、JWT token、当前用户中间件、微信登录 mock 与微信绑定接口。
- 文件存储：已实现录音音频的本地私有存储，`audio_url` 保存为 `internal://...` 内部路径；`.env.example` 已预留本地私有存储配置。
- 语音转写：已实现 `TranscriptionProvider` 抽象与 mock provider；已实现录音维度转写编排、状态流转、失败重试和转写文本编辑；钉钉、飞书、阿里云、腾讯、manual、other provider 预留为可替换占位。
- 大模型：已实现 `LLMProvider` 抽象、PromptVersion 映射与 mock provider；已实现录音默认生成编排、医疗风险防控 / 团队经验共享主动生成、结果落库和单条结果重新生成；DeepSeek、通义千问 provider 预留为可替换占位。
- Memory：已实现当前用户个人 Memory 后端接口、Markdown 初始化模板、编辑保存，以及待处理建议的接受 / 拒绝流。
- 待办：已实现智能回访结果一键转待办、当前用户待办列表、编辑、完成和删除审计日志。
- 审计：已实现录音删除、待办删除、生成结果保存 / 采纳 / 不采纳 / 重新生成 / 软删除的审计日志，并保留 `GET /api/audit-logs` 受限查询接口。
- 项目 / 资源 / 看板：已保留 `projects`、`project_items`、`resources` 数据结构；T18 起项目空间挂载基础项目与条目接口，资源库与院长看板提供占位接口和明确未开放提示。
- 导出：已实现 H5 第一版前端导出，病历 PDF 与客户画像 PDF 通过 Canvas 渲染后生成 PDF Blob 下载，客户画像图片通过 PNG 下载；小程序后续建议使用 `uni.canvasToTempFilePath` / `saveFile` 或接入服务端导出接口。
- 部署：已完成第一版 Docker / Nginx MVP 部署方案与服务器预发基础上线收口。后端提供 `backend/Dockerfile`，H5 提供 `frontend/Dockerfile` 静态构建并由 Nginx 托管，`docker-compose.yml` 编排 backend / frontend 与 SQLite、私有录音文件 volume，`deploy/docker.env.example` 说明部署环境变量，`scripts/docker-up.sh` / `scripts/docker-down.sh` 提供启动脚本。预发当前通过 `http://43.129.231.8:8080` 访问，后续需在用户授权域名、DNS、80/443 和服务器 SSH 后推进 HTTPS。

## 当前项目结构

```text
.
├── backend
│   ├── src
│   │   ├── config
│   │   ├── middleware
│   │   ├── routes
│   │   ├── services
│   │   ├── types
│   │   └── utils
│   ├── prisma
│   │   ├── migrations
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend
│   ├── src
│   │   ├── pages
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── manifest.json
│   │   └── pages.json
│   ├── package.json
│   └── vite.config.ts
├── docs
│   ├── api.md
│   ├── database-schema.md
│   ├── deployment
│   ├── mvp-acceptance.md
│   └── dev-notes.md
├── deploy
│   ├── docker.env.example
│   └── nginx
├── scripts
│   ├── docker-up.sh
│   └── docker-down.sh
├── docker-compose.yml
├── .env.example
├── README.md
├── DEVELOPMENT_LOG.md
├── PROJECT_STATE.md
├── package.json
└── tsconfig.base.json
```

## 已完成内容

- 创建 npm workspaces monorepo。
- 创建 `frontend` uni-app 工程骨架。
- 创建 `backend` Express API 工程骨架。
- 添加统一 TypeScript 基础配置。
- 添加 `.editorconfig`、`.prettierrc`、`.gitignore`。
- 添加 `.env.example`，覆盖数据库、JWT、私有存储、AI provider、转写 provider、导出目录等变量。
- 后端实现请求 ID 中间件。
- 后端实现统一成功响应格式。
- 后端实现统一错误响应格式。
- 后端实现 404 错误处理。
- 后端实现 `GET /api/health`。
- 后端引入 Prisma 7、`@prisma/client`、SQLite driver adapter。
- 创建 16 张第一版业务 / 日志数据表模型：`users`、`user_auth_bindings`、`stores`、`user_store_relations`、`memories`、`memory_update_suggestions`、`recordings`、`generation_results`、`generation_feedback`、`todos`、`custom_tool_requirements`、`projects`、`project_items`、`resources`、`audit_logs`、`ai_call_logs`。
- 创建 Prisma 迁移文件 `20260529030855_init_schema`。
- 创建 seed 脚本，写入测试用户 `demo_doctor` 与测试门店 `宠一科技测试门店`。
- 新增数据库脚本：`db:generate`、`db:migrate`、`db:seed`、`db:studio`。
- 新增后端业务枚举类型定义 `backend/src/types/domain.ts`。
- 新增 Prisma Client 单例、密码 hash 工具、JWT 工具和认证中间件。
- 新增 `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/me`、`POST /api/auth/wechat-login`、`POST /api/auth/bind-wechat`。
- 新增 `TranscriptionProvider` 抽象，支持 provider 名称：`mock`、`dingtalk`、`feishu`、`aliyun`、`tencent`、`manual`、`other`。
- 新增 `LLMProvider` 抽象，支持 provider 名称：`mock`、`deepseek`、`qwen`。
- 新增 `PromptVersion` 映射：`v1-medical-record`、`v1-customer-profile` 等每类生成任务版本。
- 新增 `AICallLogger`，转写和生成调用都会写入 `ai_call_logs`。
- 新增 mock 转写与 mock 生成联调接口：`POST /api/ai/transcriptions`、`POST /api/ai/generations`。
- mock LLM 会根据 `generationType` 返回非空结构化示例数据，便于前端联调。
- 新增个人 Memory 接口：`GET /api/memory`、`POST /api/memory/init`、`PUT /api/memory`、`POST /api/memory/suggestions`、`POST /api/memory/suggestions/:id/accept`、`POST /api/memory/suggestions/:id/reject`。
- 个人 Memory 使用 `memories.memory_type = personal_memory` 与当前用户 `user_id` 绑定。
- Memory 初始化模板固定包含 `# 个人 Memory`、`## 基础信息`、`## 工作背景`、`## 常见任务`、`## 沟通偏好`、`## 长期有效信息`。
- Memory suggestion 默认只在识别到长期有效信息时创建；接受后才写入 Memory，拒绝不修改 Memory。
- 新增录音接口：`POST /api/recordings/upload`、`POST /api/recordings/start`、`POST /api/recordings/finish`、`GET /api/recordings`、`GET /api/recordings/:id`、`DELETE /api/recordings/:id`、`POST /api/recordings/:id/retry`。
- 新增录音绑定编辑接口：`PUT /api/recordings/:id`，用于保存宠主姓名和宠物姓名。
- 新增录音转写接口：`POST /api/recordings/:id/transcribe`、`GET /api/recordings/:id/transcript`、`PUT /api/recordings/:id/transcript`。
- 转写开始时 `recordings.processing_status = transcribing`，成功后回到可生成的 `uploaded`，失败后为 `failed` 并写入 `error_message`。
- 转写失败不删除 `audio_url`，可通过重新调用转写接口或 `retry` 后重新转写。
- 转写文本可通过 `PUT /api/recordings/:id/transcript` 手动编辑保存。
- 新增默认生成接口：`POST /api/recordings/:id/generate-default-results`。
- 默认生成会创建 6 条 `generation_results`：`summary` 加五个业务模块 `medical_record`、`communication_review`、`customer_profile`、`upsell_opportunities`、`smart_followup`。
- `medical_risk_control` 和 `team_knowledge` 不在默认生成范围内。
- 每个默认模块独立调用 LLM Provider、独立写入 `module_status`，允许部分成功、部分失败。
- 每次默认生成 LLM 调用都会写入 `ai_call_logs`，并关联对应 `generation_result_id`。
- 新增主动生成接口：`POST /api/recordings/:id/generate-risk-control`、`POST /api/recordings/:id/generate-team-knowledge`。
- 医疗风险防控和团队经验共享默认不自动生成，用户在前端点击对应 Tab 后确认生成。
- 主动生成结果 `is_default_generated = false`，重复调用按版本号递增，支持重新生成。
- 主动生成失败只影响当前模块，不覆盖其他模块。
- 新增顶层生成结果反馈接口：`PUT /api/generation-results/:id`、`POST /api/generation-results/:id/save`、`POST /api/generation-results/:id/adopt`、`POST /api/generation-results/:id/reject`、`POST /api/generation-results/:id/regenerate`、`DELETE /api/generation-results/:id`。
- 生成结果支持编辑保存 `content_text` 和 `content_json`，保存后 `status = saved`。
- 采纳会写入 `generation_feedback action=adopt`，并标记 `confirmed_by_user = true`、`confirmed_at = 当前时间`。
- 不采纳必须提交枚举原因，写入 `generation_feedback action=reject`，缺少原因时接口拒绝。
- 重新生成会调用 LLM Provider，当前结果 `version + 1`，`status = regenerated`，成功后 `module_status = completed`，并新增 `generation_feedback action=regenerate`，不会删除旧反馈记录。
- 生成结果保存、采纳、不采纳、重新生成和软删除会写入 `audit_logs`，记录 `before_data` 与 `after_data`。
- 新增待办接口：`POST /api/todos`、`GET /api/todos`、`PUT /api/todos/:id`、`POST /api/todos/:id/complete`、`DELETE /api/todos/:id`。
- 智能回访结果页新增“一键转成待办”，会写入 `title`、`description`、`pet_owner_name`、`pet_name`、`due_time`、`recording_id`、`generation_result_id`、`status`。
- 待办列表按当前登录用户过滤，支持编辑、勾选完成和删除。
- 删除待办会硬删除 `todos` 记录，并写入 `audit_logs action=todo.delete`。
- 病历草稿和医疗风险防控展示人工确认提示，内容口径为 AI 辅助整理 / 识别和提醒。
- 默认生成结束后会尝试从结果中识别 `pet_owner_name` 和 `pet_name` 并回写录音，识别不到时保持为空。
- 默认生成完成后，至少 `summary` 和一个业务模块成功时，`recordings.processing_status = completed`；全部失败或未达到完成条件时为 `failed`。
- 音频上传支持 MP3 / WAV / M4A，不支持视频；文件大小和最长时长通过 `MAX_AUDIO_SIZE_MB`、`MAX_AUDIO_DURATION_SECONDS` 配置。
- 录音上传后创建 `recordings` 记录，`audio_url` 保存为 `internal://...` 私有内部路径。
- 录音删除采用软删除 `deleted_at`，并写入 `audit_logs`。
- 录音列表和详情均按当前登录用户过滤，普通用户不能访问他人录音。
- seed 用户 `demo_doctor` 的测试密码为 `demo_password`，密码以 hash 保存。
- 前端实现 Web H5 登录页、登录守卫、主框架和固定侧边栏菜单。
- 首次登录主框架后会弹出录音授权与隐私提示，内容覆盖录音与 AI 生成、门店和当地隐私要求、录音用途、医疗内容人工确认。
- 隐私提示需用户点击确认后关闭，当前确认状态保存在本地用户维度 storage，并在代码中保留后端用户字段扩展 TODO。
- 侧边栏顺序固定为：`AI 搭档 / Memory`、`AI 录音 / 智能工牌`、`工具广场`、`资源库`、`项目空间`、`任务 / 待办`、`院长看板`、`设置 / 个人中心`。
- 登录后直接进入主框架页；未登录或 token 失效访问主框架会跳转登录页。
- 主框架保留 Memory、AI 录音生成结果、任务 / 待办既有业务能力，其余模块提供明确占位提示。
- 顶部用户信息区支持展示当前用户、刷新当前模块和退出登录。
- AI 录音 / 智能工牌页面支持浏览器 MediaRecorder 录音；录音完成后会转换为 WAV 并调用上传接口。
- 当浏览器不支持录音或非安全上下文无法录音时，页面显示明确提示，并保留上传音频入口。
- Web 端支持上传本地 MP3 / WAV / M4A 音频，前端提示不支持视频文件。
- 音频上传成功后会触发转写和默认 AI 生成流程，并刷新录音详情。
- 录音页面下方展示最近录音记录，包含创建时间、宠主名、宠物名、状态、场景和进入详情按钮。
- 录音状态按中文展示为：上传中、已上传、转写中、生成中、已完成、失败。
- 录音页面支持手动刷新状态，失败记录提供“重新尝试”按钮。
- 录音结果详情页展示录音基础信息、宠主 / 宠物绑定、转写文本、AI 总摘要和七大结果 Tab。
- 宠主 / 宠物绑定区支持编辑保存，转写文本区支持编辑保存。
- 七大结果 Tab 固定为：病历自动生成、沟通复盘、客户全景画像、升单机会挖掘、智能回访、医疗风险防控、团队经验共享。
- 每个结果 Tab 展示 loading / empty / error / completed 状态，并支持编辑、保存、采纳、不采纳和重新生成。
- 七大结果 Tab 已按 `result_type` 分发不同前端展示组件：病历按字段分块，沟通复盘按分析项分块并高亮可改进话术，客户画像使用可修改模块卡片，升单机会使用机会卡片，智能回访使用回访计划卡片并支持话术复制，医疗风险防控使用风险点列表和强人工确认提示，团队经验共享按典型病例 / 优秀话术 / 处置路径 / 沟通技巧 / 可沉淀经验 / 脱敏建议分块展示。
- 结果展示仍保留整体编辑 `content_text` 和 `content_json` 的兜底能力。
- 病历自动生成提供人工确认按钮和 PDF 导出入口；客户全景画像提供图片和 PDF 导出入口。
- T16 起病历 PDF、客户画像图片和客户画像 PDF 均改为 H5 前端文件下载，不再依赖浏览器打印窗口；病历导出包含宠主、宠物、医生 / 用户、生成时间、标准病历结构和医疗人工确认提示；客户画像导出默认按门店内部查看口径做基础脱敏并包含 AI 辅助提示。
- 资源库页面提示“资源库暂未开放，未来用于存放工具生成内容。”，展示文案、图片、报告、工具生成物、技能包输出结果五类未来资源类型。
- 项目空间页面展示项目列表占位、新建项目入口预留和项目详情页占位，并提示未来可关联录音、对话、文件、工具生成物、待办和 Memory。
- 院长看板页面展示录音次数、病历生成次数、回访建议数、升单机会数、待办事项数、待回访客户数六个指标卡，并标注“数据统计能力即将上线”，不展示真实统计数据。
- 医疗风险防控和团队经验共享默认显示“该模块需主动生成”，只在用户点击“立即生成”后调用主动生成接口。
- 结果详情页统一展示“AI 生成内容仅供辅助，需人工确认。”，病历、医疗风险和用药相关内容额外展示具备资质兽医或负责人确认提示。
- Web H5 与小程序端已统一常见错误提示和重试入口：录音失败、上传失败、文件格式不支持、转写失败、AI 生成失败、导出失败、网络中断和登录过期均有明确状态；失败不会清空已成功录音、转写或生成结果。
- Web H5 和小程序端开始录音前均显示“已取得沟通对象同意录音”的确认提示。
- 移动端 H5 支持侧边栏折叠，窄屏下菜单可横向滚动。
- 各主页面统一提供 loading、empty、error 或占位状态，避免空白页面。
- 微信小程序 `pages.json` 已挂载三页 Tab：`首页`、`AI`、`我的`。
- 小程序首页定位为工具广场，展示技能分类卡片、现成技能“暂未开放”提示和自建工具入口。
- 小程序 AI 页保留开始录音、上传音频、最近录音记录、录音结果查看和七个结果 Tab，接口复用 `/recordings`、转写和默认生成接口。
- 小程序“我的”页面展示个人信息、Memory Markdown、账号设置、口述 AI 生成助手入口和看板模块占位。
- 小程序登录页对接 `POST /api/auth/wechat-login` mock，优先复用本地 token 对应用户 ID，后续真实上线前再接服务端 code 换 openid。
- 小程序 API 请求统一使用 `uni.request` / `uni.uploadFile`，继续携带同一个 JWT，并由后端按当前用户 ID 过滤录音、Memory 等业务数据。
- 小程序录音权限已在 `manifest.json` 的 `scope.record.desc` 和 AI 页代码注释中标注：录音前需取得沟通对象同意，并遵守门店及当地隐私要求。
- 新增 `GET /api/audit-logs`，仅允许管理员、院长或开发环境访问；第一版不向普通前端暴露入口。
- README 与开发说明已更新。

## 接口约定

API 基础路径：`/api`

成功响应：

```json
{
  "success": true,
  "data": {},
  "requestId": "request-id",
  "timestamp": "2026-05-29T00:00:00.000Z"
}
```

错误响应：

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "服务器内部错误",
    "details": {}
  },
  "requestId": "request-id",
  "timestamp": "2026-05-29T00:00:00.000Z"
}
```

已实现接口：

```text
GET /api/health
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/wechat-login
POST /api/auth/bind-wechat
POST /api/ai/transcriptions
POST /api/ai/generations
GET /api/memory
POST /api/memory/init
PUT /api/memory
POST /api/memory/suggestions
POST /api/memory/suggestions/:id/accept
POST /api/memory/suggestions/:id/reject
POST /api/recordings/upload
POST /api/recordings/start
POST /api/recordings/finish
GET /api/recordings
GET /api/recordings/:id
PUT /api/recordings/:id
DELETE /api/recordings/:id
POST /api/recordings/:id/retry
POST /api/recordings/:id/transcribe
GET /api/recordings/:id/transcript
PUT /api/recordings/:id/transcript
POST /api/recordings/:id/generate-default-results
POST /api/recordings/:id/generate-risk-control
POST /api/recordings/:id/generate-team-knowledge
PUT /api/generation-results/:id
POST /api/generation-results/:id/save
POST /api/generation-results/:id/adopt
POST /api/generation-results/:id/reject
POST /api/generation-results/:id/regenerate
DELETE /api/generation-results/:id
POST /api/todos
GET /api/todos
PUT /api/todos/:id
POST /api/todos/:id/complete
DELETE /api/todos/:id
GET /api/audit-logs
GET /api/resources
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
POST /api/projects/:id/items
GET /api/projects/:id/items
GET /api/director-dashboard
PUT /api/recordings/:id/generation-results/:resultId
POST /api/recordings/:id/generation-results/:resultId/adopt
POST /api/recordings/:id/generation-results/:resultId/reject
```

受保护接口使用 `Authorization: Bearer <JWT token>`。后续业务接口应接入认证中间件，并默认使用 `currentUser.id` 限制普通用户只能访问自己创建的数据。

## 运行方式

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev:backend
npm run dev:frontend
```

seed 登录账号：

```text
username: demo_doctor
password: demo_password
```

验证：

```bash
npm run typecheck
npm run build
npm run db:migrate
npm run db:seed
curl http://localhost:3000/api/health
```

## 验证状态

- `npm install`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- `npm run build`：通过。
- `npx prisma validate`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:migrate`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:seed`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npx prisma migrate status`：通过。
- `GET /api/health`：通过。
- `npm run typecheck -w backend`：通过。
- `npm run typecheck -w frontend`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- T13 smoke test：通过，本地 WAV 上传、转写、默认生成和最近记录状态刷新均通过。
- `GET /api/auth/me` 未带 token：通过，返回 `401 UNAUTHORIZED`。
- `POST /api/auth/login` 使用 seed 用户：通过，返回 JWT 和用户基础信息。
- `GET /api/auth/me` 携带 JWT：通过，返回当前用户信息。
- `POST /api/auth/wechat-login`：通过，可用 mock `openid` / `unionid` 创建或登录用户。
- `POST /api/auth/bind-wechat`：通过，可将 mock 微信身份绑定到当前用户。
- `npm run dev:frontend`：可启动并返回 H5 默认页面。
- `npm run typecheck -w backend`：通过。
- `POST /api/ai/transcriptions`：通过，mock 返回转写文本、说话人和时长，并更新录音转写字段。
- `POST /api/ai/generations`：通过，`medical_record` mock 返回结构化 JSON、文本、token 和耗时。
- `ai_call_logs`：通过，转写和生成各写入 1 条 `success` 调用日志。
- `npm run typecheck -w backend`：通过。
- `npm run typecheck -w frontend`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run typecheck -w frontend`：通过。
- `npm run build`：通过。
- `GET /api/memory`：通过，首次返回空 Memory。
- `POST /api/memory/init`：通过，可创建当前用户个人 Memory。
- `PUT /api/memory`：通过，可编辑保存 Markdown。
- `POST /api/memory/suggestions`：通过，普通接诊聊天不创建 suggestion，长期有效信息创建 pending suggestion。
- suggestion accept / reject：通过，accept 写入 Memory，reject 不修改 Memory。
- `POST /api/recordings/upload`：通过，合法 WAV 可创建 `uploaded` 录音，`audioUrl` 为 `internal://...`。
- 不支持格式上传：通过，返回 `415 UNSUPPORTED_AUDIO_FORMAT`。
- `POST /api/recordings/start`：通过，创建 `uploading` 录音。
- `POST /api/recordings/finish`：通过，写入音频后状态更新为 `uploaded`。
- `GET /api/recordings`：通过，只返回当前用户自己的录音。
- `GET /api/recordings/:id`：通过，返回基础信息、转写文本、宠主 / 宠物绑定信息和生成结果列表。
- 普通用户访问他人录音：通过，返回 `404 RECORDING_NOT_FOUND`。
- `DELETE /api/recordings/:id`：通过，写入 `deleted_at` 并创建 `audit_logs`，删除后详情返回 `404 RECORDING_NOT_FOUND`。
- `POST /api/recordings/:id/transcribe`：通过，mock 返回宠物问诊文本，状态从 `transcribing` 回到 `uploaded`，并写入 `ai_call_logs`。
- 转写失败：通过，mock 强制失败时状态为 `failed`、写入 `error_message` 且保留音频，可重新转写。
- `GET /api/recordings/:id/transcript`：通过，可读取 `transcriptText`、`processingStatus`、`errorMessage`。
- `PUT /api/recordings/:id/transcript`：通过，可手动编辑并保存转写文本。
- `POST /api/recordings/:id/generate-default-results`：通过，有转写文本的录音会生成默认 6 条 `generation_results`。
- `generation_results`：通过，默认生成结果可查看，每个模块有独立 `module_status`。
- `ai_call_logs`：通过，默认生成 6 次 LLM 调用均写入日志，并关联对应生成结果。
- `POST /api/recordings/:id/generate-risk-control`：通过，主动生成医疗风险防控，`isDefaultGenerated = false`，内容包含人工确认提示。
- `POST /api/recordings/:id/generate-team-knowledge`：通过，主动生成团队经验共享，重复调用会创建新版本。
- `PUT /api/generation-results/:id`：通过，保存后 `status = saved`，可写入 `contentText`、`contentJson` 和人工确认字段。
- `POST /api/generation-results/:id/adopt`：通过，`status = adopted`，写入 `generation_feedback action=adopt`。
- `POST /api/generation-results/:id/reject`：通过，无 `reason` 返回 400，合法 `reason` 写入 `generation_feedback action=reject`。
- `POST /api/generation-results/:id/regenerate`：通过，调用 mock LLM，`version + 1`，`status = regenerated`，`moduleStatus = completed`，写入 `generation_feedback action=regenerate` 且不删除旧反馈。
- `POST /api/todos`：通过，可从智能回访 `generationResultId` 创建待办并自动关联录音。
- `GET /api/todos`：通过，只返回当前用户待办。
- `PUT /api/todos/:id`：通过，可编辑标题、描述、宠主、宠物和回访时间。
- `POST /api/todos/:id/complete`：通过，写入 `status = completed`。
- `DELETE /api/todos/:id`：通过，删除待办并创建 `audit_logs action=todo.delete`。
- `npm run typecheck -w frontend`：通过。
- `npm run build:h5 -w frontend`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- T11 前端验收：登录页为 H5 首屏；登录成功后进入主框架；主框架侧边栏顺序与 PRD 一致；未登录或 token 失效访问主框架会跳转登录页；8 个菜单均可切换且占位页不为空。
- T12 前端验收：登录失败有错误提示；登录中按钮展示 loading 文案；首次登录主框架后出现隐私弹窗；弹窗确认后关闭并进入系统；隐私确认状态按用户维度本地保存。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- T18 typecheck：通过，分别使用本地 Node 运行 `tsc -p backend/tsconfig.json --noEmit` 和 `tsc -p frontend/tsconfig.json --noEmit`。
- T18 backend build：通过，使用本地 Node 运行 `tsc -p backend/tsconfig.json`。
- T18 H5 build：通过，使用本地 Node 运行 `@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`；Sass legacy JS API 仍为上游 deprecation warning。
- T18 smoke test：通过，使用临时 SQLite 套用既有迁移 SQL 和 seed 后，`GET /api/resources`、`GET /api/projects`、`GET /api/director-dashboard` 返回 200；`POST /api/projects`、`POST /api/projects/:id/items`、`GET /api/projects/:id` 流程通过。
- T19 backend typecheck：通过，使用本地 Node 运行 `tsc -p backend/tsconfig.json --noEmit`。
- T19 frontend typecheck：通过，使用本地 Node 运行 `vue-tsc --noEmit`。
- T19 H5 build：通过，使用本地 Node 运行 `@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`；Sass legacy JS API 仍为上游 deprecation warning。
- T19 mp-weixin build：通过，使用本地 Node 运行 `@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`；构建产物位于 `frontend/dist/build/mp-weixin`。
- T20 backend typecheck：通过，使用本地 Node 运行 `tsc -p backend/tsconfig.json --noEmit`。
- T20 frontend typecheck：通过，使用本地 Node 运行 `vue-tsc -p frontend/tsconfig.json --noEmit`。
- T20 backend build：通过，使用本地 Node 运行 `tsc -p backend/tsconfig.json`。
- T20 H5 build：通过，使用本地 Node 运行 `@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`；Sass legacy JS API 仍为上游 deprecation warning。
- T20 mp-weixin build：通过，使用本地 Node 运行 `@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`；Sass legacy JS API 仍为上游 deprecation warning。
- T20 审计 smoke：通过，临时 SQLite + 临时后端验证 7 类审计动作均写入并可通过受限 `GET /api/audit-logs` 查回，`before_data` / `after_data` 均非空。
- T21 backend typecheck：通过，使用 Codex bundled Node 运行 `tsc -p backend/tsconfig.json --noEmit`。
- T21 frontend typecheck：通过，使用 Codex bundled Node 运行 `vue-tsc -p frontend/tsconfig.json --noEmit`。
- T21 backend build：通过，使用 Codex bundled Node 运行 `tsc -p backend/tsconfig.json`。
- T21 H5 build：通过，使用 Codex bundled Node 运行 `@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`；Sass legacy JS API 仍为上游 deprecation warning。
- T21 mp-weixin build：通过，使用 Codex bundled Node 运行 `@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`；构建产物位于 `frontend/dist/build/mp-weixin`。
- T21 Docker CLI 验证：未执行。本机当前终端环境没有 `docker` 命令，无法实际运行 `docker compose config` 或 `docker compose up --build`。

## 已知注意事项

- 当前 uni-app Vue 3 依赖使用 npm `vue3` dist-tag 对应版本线：`3.0.0-alpha-5010120260525001`。
- `@dcloudio/vite-plugin-uni` peer dependency 要求 Vite `5.2.8`，因此前端锁定该版本。
- `npm install` 会提示部分上游依赖 deprecated 和 audit 警告，当前暂不强制修复，避免破坏 uni-app 编译链路。
- 当前 Prisma 7 在包含中文和空格的项目路径下，对相对 SQLite URL `file:./dev.db` 可能返回空的 `Schema engine error`。可用绝对 SQLite URL 临时执行迁移和 seed。
- 当前已有数据库模型、迁移、seed、后端认证接口、AI / 转写 provider 抽象层、mock 联调接口、Memory 基础接口、录音上传接口、录音转写流程编排、默认 AI 生成结果落库、结果反馈机制、待办业务接口、项目空间预留接口、资源库 / 院长看板占位接口、Web H5 主框架、H5 第一版前端导出、小程序三页结构和 Docker MVP 部署准备，但没有真实转写、真实外部 LLM、服务端导出留档、小程序导出实现、真实微信审核上线和真实看板统计。
- 本地运行后端必须提供 `JWT_SECRET`，建议从 `.env.example` 复制 `.env` 后修改默认值。

## 下一步任务

建议进入小程序真机联调、真实 Memory suggestion 来源接入、真实 LLM / 转写 Provider 联调、服务端导出留档，或项目 / 资源真实业务能力开发。
