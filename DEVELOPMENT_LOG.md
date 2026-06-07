# 开发日志

## 2026-06-07 - T25-T28 预发部署收口与真实 provider 接入前评估

状态：已完成

### 本次完成内容

- 新增 `docs/deployment/T25-server-preview-deployment-acceptance.md`，固化服务器 Docker Compose 预发部署基础上线结论；结论限定为“基础上线成功”，不等同于业务完整验收通过。
- 修复 Web H5“上传录音”入口：将 `display: none` file input + 程序化 click 改为透明原生 file input 覆盖可见上传控件，降低移动浏览器 / WebView 拦截文件选择器的风险。
- 新增 `docs/deployment/T26-preview-h5-upload-debug.md`，记录问题现象、根因判断、修改文件、验证结果、未解决事项和 T27 影响。
- 新增 `docs/deployment/T27-domain-https-plan.md`，建议使用域名 + HTTPS，并优先采用服务器层 Nginx + Let's Encrypt 反代到 `localhost:8080`；本阶段未申请证书、未改 DNS、未开放 80 / 443。
- 新增 `docs/deployment/T28-real-provider-readiness.md`，评估真实 AI / 转写 provider 接入准备度，确认除 mock 外的真实 provider 客户端尚未实现，真实 key 不能进入 Git。

### 验证记录

- 公网 `GET http://43.129.231.8:8080/api/health` 非沙箱实测返回 200 OK。
- 预发 API 最小链路验证通过：demo 账号登录、multipart 上传 1 秒 WAV、mock 转写、默认生成 6 个模块均成功。
- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit`：通过。
- `node node_modules/vue-tsc/bin/vue-tsc.js -p frontend/tsconfig.json --noEmit`：通过。
- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json`：通过。
- `node ../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`：通过，Sass legacy JS API 仍为上游 warning。

### 开发决策

- T26 只修复上传录音入口，不硬修 HTTP 非安全上下文导致的浏览器录音限制。
- 当前未提供服务器 SSH、域名、DNS、80/443 或证书授权，因此不执行服务器更新部署、DNS 修改或 HTTPS 申请。
- 当前不接入真实 LLM / 转写 provider，不填写真实 key，不切换 mock provider。
- 真实 provider 建议先本地接 LLM，再接转写；预发切换前必须补齐超时、重试、成本控制和日志脱敏。

## 2026-06-04 - 集成验收复核

状态：已完成

### 本次完成内容

- 复查当前项目结构，确认前端、后端、数据库、API、环境变量、部署文件均位于同一 monorepo 内，当前范围为 `T00` 至 `T21`。
- 检查后端路由挂载，未发现同 method 同 path 的冲突路由；旧版嵌套生成结果 API 与顶层生成结果 API 属于兼容并存，记录为 P2。
- 检查本地运行产物，发现 `backend/dev.db` 未被根 `.gitignore` 显式覆盖，已补充 `*.db`、`*.sqlite`、`*.sqlite3` 与 journal 文件忽略规则。
- 复核并更新 `docs/integration-issues.md`、`docs/local-run.md`、`docs/current-version-acceptance-report.md`。

### 验证记录

- Codex bundled Node `v24.14.0`：可用。
- 当前 shell：`npm` / `npx` / `docker` 不在 PATH，未重放 `npm install` 与 Docker Compose 实机启动。
- `prettier --check .`：通过。
- `tsc -p backend/tsconfig.json --noEmit`：通过。
- `vue-tsc -p frontend/tsconfig.json --noEmit`：通过。
- `tsc -p backend/tsconfig.json`：通过。
- `uni build -p h5`：通过，Sass legacy JS API 为上游 warning。
- `uni build -p mp-weixin`：通过，Sass legacy JS API 为上游 warning。
- `scripts/mvp-smoke-test.ts`：通过；沙箱内本地监听被 `listen EPERM 127.0.0.1` 阻断后，非沙箱重跑通过。
- 临时 SQLite 初始化与 seed：通过。
- 临时后端 `PORT=3010` 启动后，`GET /api/health` 与 `POST /api/auth/login`：通过。
- H5 dev server `http://localhost:5173/`：返回 200。

### 开发决策

- 本轮不新增大功能，只修复会影响 MVP 集成交付卫生的 P1 项。
- 旧版嵌套生成结果接口暂不删除，避免破坏潜在兼容调用；后续可在稳定后统一 deprecate。
- Docker 文件本轮做静态检查；待具备 Docker CLI 的环境后再执行 `docker compose up --build` 实机复测。

## 2026-06-03 - 集成验收收口

状态：已完成

### 本次完成内容

- 完成当前项目结构、前端、后端、数据库、API、环境变量、部署文件的集成核验。
- 新增 `scripts/mvp-smoke-test.ts`，使用临时 SQLite 和临时私有存储，通过真实 HTTP API 验证登录、Memory、音频上传、转写、默认生成、七大结果、编辑保存、采纳 / 不采纳 / 重新生成、智能回访转待办和历史记录。
- 根 `package.json` 新增 `lint`、`test`、`smoke:mvp`、`db:setup:sqlite` 脚本。
- 新增 `backend/prisma/sqlite-init.ts`，在 Prisma SQLite migration 空报 `Schema engine error` 时使用已签入迁移 SQL 初始化数据库，并写入 `_prisma_migrations` 记录。
- `backend/docker-entrypoint.sh` 增加 Prisma migration 失败后的 SQLite SQL 初始化兜底。
- `backend/prisma/seed.ts` 改为自包含 scrypt hash 逻辑，避免 Docker runner 阶段因未复制 `backend/src` 导致 seed 失败。
- 新增 `docs/integration-issues.md`、`docs/local-run.md`、`docs/current-version-acceptance-report.md`。
- 格式化本轮检查发现的 TS / Vue / Markdown 文件。

### 验证记录

- `tsc -p backend/tsconfig.json --noEmit`：通过。
- `vue-tsc -p frontend/tsconfig.json --noEmit`：通过。
- `prettier --check .`：通过。
- `tsc -p backend/tsconfig.json`：通过。
- `uni build -p h5`：通过，Sass legacy JS API 为上游 warning。
- `uni build -p mp-weixin`：通过，Sass legacy JS API 为上游 warning。
- `scripts/mvp-smoke-test.ts`：通过。
- SQLite fallback init + seed：通过。
- 临时后端 `PORT=3010` 启动后，`GET /api/health` 与 `POST /api/auth/login`：通过。
- H5 dev server `http://localhost:5173/`：返回 200。

### 开发决策

- 不新增大功能，只补齐 MVP 可运行、可测试、可部署所需的集成兜底。
- SQLite fallback 仅用于当前 MVP 本地 / Docker SQLite 场景；后续切换 PostgreSQL 时应恢复标准 Prisma migration 流程并重新设计部署数据库初始化。

## 2026-06-03 - T21 Docker 部署与 MVP 验收

状态：已完成

### 本次完成内容

- 新增 `backend/Dockerfile`，构建 Express API、生成 Prisma Client、编译 TypeScript，并在容器启动时执行 `prisma migrate deploy`。
- 新增 `backend/docker-entrypoint.sh`，创建 SQLite 数据目录和本地私有存储目录，默认执行幂等 seed，便于 MVP 验收使用 `demo_doctor / demo_password`。
- 新增 `frontend/Dockerfile`，构建 uni-app H5 静态产物，并使用 Nginx 托管。
- 新增 `deploy/nginx/default.conf`，预留 H5 静态服务、SPA fallback、`/api` 反向代理和音频上传体积上限。
- 新增 `docker-compose.yml`，编排 backend、frontend、SQLite 数据 volume 和私有录音文件 volume。
- 新增 `deploy/docker.env.example`，集中说明 Docker MVP 环境变量、mock provider、SQLite 路径、私有存储路径和 seed 开关。
- 新增 `scripts/docker-up.sh`、`scripts/docker-down.sh`，并在根 `package.json` 增加 `docker:up` / `docker:down` 脚本。
- 新增 `docs/mvp-acceptance.md`，覆盖登录、首次隐私授权、Memory、AI 录音、上传音频、转写、默认生成、七大 Tab、主动生成、编辑保存、采纳 / 不采纳 / 重新生成、导出、回访转待办、完成待办、删除录音审计、占位模块和小程序端编译。
- 更新 `README.md`、`PROJECT_STATE.md`。

### 验证记录

- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit`：通过。
- `node node_modules/vue-tsc/bin/vue-tsc.js -p frontend/tsconfig.json --noEmit`：通过。
- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json`：通过。
- `node ../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- `node ../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`：通过，小程序构建完成，产物位于 `frontend/dist/build/mp-weixin`；Sass legacy JS API 仍为上游 deprecation warning。
- `docker compose config` / `docker compose up --build`：未执行。本机当前终端环境没有 `docker` 命令，无法进行 Docker 实机启动验证。

### 开发决策

- T21 不切换数据库技术栈，继续使用 SQLite 作为 MVP 第一版部署数据库，通过 Docker volume 持久化 `/app/data/dev.db`。
- Docker 环境默认使用 `mock` 转写和 `mock` LLM provider，优先保证测试人员能完整走通 MVP 主流程。
- H5 前端构建时使用 `VITE_API_BASE_URL=/api`，由 Nginx 统一反代到后端，避免浏览器跨域配置复杂化。
- PostgreSQL 仅在 README 中说明为后续切换方向；当前 Prisma schema provider 仍为 SQLite，不能只改 compose 数据库地址。

## 2026-06-03 - T20 异常处理、审计日志与安全提示统一加固

状态：已完成

### 本次完成内容

- Web H5 录音区新增统一错误面板重试入口，覆盖录音失败、上传失败、文件格式不支持、转写失败、AI 生成失败、导出失败、网络中断和登录过期。
- Web H5 上传成功后的处理链路拆分为上传、转写、默认生成三个阶段；转写或生成失败时保留已成功录音、转写文本和已成功结果，并提供“重新处理”。
- Web H5 导出失败新增明确“导出失败”提示和重新导出按钮。
- Web H5 开始录音前新增“录音同意确认”弹窗，要求确认已取得沟通对象同意。
- 小程序 AI 页新增错误重试入口、失败录音重新处理入口、录音前同意确认、通用 AI 辅助提示和医疗 / 用药强提示。
- 小程序 API 封装新增 `MiniApiError`，用于区分网络中断、登录过期和后端业务错误。
- 后端新增受限 `GET /api/audit-logs` 接口，仅允许开发环境、管理员或院长访问；普通前端第一版不暴露入口。
- 后端新增 `DELETE /api/generation-results/:id`，用于软删除生成结果并写审计日志。
- 后端生成结果保存、采纳、不采纳、重新生成和软删除均写入 `audit_logs`，记录 `before_data` 与 `after_data`。
- 录音删除审计从局部字段快照升级为完整录音快照。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit`：通过。
- `node node_modules/vue-tsc/bin/vue-tsc.js -p frontend/tsconfig.json --noEmit`：通过。
- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json`：通过。
- `node ../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- `node ../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`：通过，小程序构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- T20 审计 smoke：通过。使用 `/private/tmp/pet-doctor-ai-assistant-t20-smoke.db` 临时 SQLite 执行迁移 SQL 和 seed，启动临时后端后验证 `generation_result.update`、`generation_result.adopt`、`generation_result.reject`、`generation_result.regenerate`、`generation_result.delete`、`todo.delete`、`recording.delete` 均可从 `GET /api/audit-logs` 查回，且每条均包含 `before_data` 与 `after_data`。

### 开发决策

- T20 不新增数据库迁移，继续复用现有 `audit_logs.before_data` / `after_data` 字段。
- 管理员模型第一版不展开复杂 RBAC；审计查询接口暂以 `role = admin`、`isDirector = true` 或开发环境作为访问条件。
- 普通前端不暴露审计日志入口，避免在权限模型未完整设计前扩大可见面。
- 失败重试优先复用现有 retry、transcribe、generate-default-results 和 regenerate 接口，不引入后台队列或任务表。

## 2026-06-03 - T19 微信小程序三页结构适配

状态：已完成

### 本次完成内容

- 保留 Web H5 `pages/index/index.vue` 主工作台，不拆改既有 Web 侧边栏工作流。
- 新增微信小程序三页 Tab 结构：
  - `pages/home/home`：首页 / 工具广场。
  - `pages/ai/ai`：AI 录音与结果查看。
  - `pages/my/my`：我的 / 个人中心。
- 更新 `frontend/src/pages.json`，挂载 `首页 / AI / 我的` tabBar。
- 小程序首页展示技能分类卡片、现成技能“暂未开放”提示和自建工具入口。
- 小程序 AI 页保留开始录音、上传音频、最近录音记录、录音结果查看和七个结果 Tab。
- 小程序 AI 页复用既有后端接口：
  - `GET /api/recordings`
  - `GET /api/recordings/:id`
  - `POST /api/recordings/upload`
  - `POST /api/recordings/:id/transcribe`
  - `POST /api/recordings/:id/generate-default-results`
- 小程序“我的”页展示个人信息、Memory Markdown、账号设置、口述 AI 生成助手入口和看板模块占位。
- 新增小程序端 `uni.request` / `uni.uploadFile` API 封装，统一携带同一 JWT token，继续由后端按当前用户 ID 过滤业务数据。
- 登录页新增微信小程序 `mock wechat-login` 路径，对接 `POST /api/auth/wechat-login`；第一版使用本地 mock openid，真实审核上线前再接服务端 code 换 openid。
- `goWorkspace` 在小程序端会进入工具广场 Tab，H5 端仍进入 Web 主工作台。
- 在 `frontend/src/manifest.json` 增加 `scope.record.desc`，并在小程序 AI 页代码注释中标注录音权限、录音用途、需取得沟通对象同意及隐私要求。
- T19 不新增数据库迁移，不新增后端接口，继续复用 T02 / T05-T07 / T14 已有后端能力。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/dev-notes.md`。

### 验证记录

- `tsc -p backend/tsconfig.json --noEmit`：通过。
- `vue-tsc --noEmit`：通过。
- `@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- `@dcloudio/vite-plugin-uni/bin/uni.js build -p mp-weixin`：通过，小程序构建产物生成到 `frontend/dist/build/mp-weixin`；Sass legacy JS API 仍为上游 deprecation warning。

### 开发决策

- T19 只完成小程序页面结构和接口适配，不做真实小程序审核上线。
- 小程序端保留轻量展示，不复刻 Web H5 所有编辑、导出和复杂结构化展示能力，避免第一版变成双端大重构。
- 微信登录当前继续使用后端 mock `wechat-login`，并通过本地稳定 mock openid 保持同一小程序用户；若本地已有 token，可通过 `userId` 绑定到同一后端用户。
- 小程序录音第一版使用 `uni.getRecorderManager` 和 `scope.record` 授权，上传后沿用后端音频上传、转写和默认生成编排。

## 2026-06-03 - T18 占位模块页面

状态：已完成

### 本次完成内容

- Web H5 资源库页面升级为明确占位模块，提示“资源库暂未开放，未来用于存放工具生成内容。”。
- 资源库展示未来资源类型：文案、图片、报告、工具生成物、技能包输出结果。
- Web H5 项目空间页面展示项目列表占位、新建项目入口预留和项目详情页占位。
- 项目空间提示未来可关联录音、对话、文件、工具生成物、待办和 Memory。
- Web H5 院长看板页面展示 6 个指标卡：录音次数、病历生成次数、回访建议数、升单机会数、待办事项数、待回访客户数。
- 院长看板明确提示“数据统计能力即将上线”，指标值使用占位符，不展示真实统计数据。
- 新增项目空间预留接口：
  - `GET /api/projects`
  - `POST /api/projects`
  - `GET /api/projects/:id`
  - `PUT /api/projects/:id`
  - `POST /api/projects/:id/items`
  - `GET /api/projects/:id/items`
- 新增资源库占位接口 `GET /api/resources`，返回资源结构、占位状态和未来资源类型。
- 新增院长看板占位接口 `GET /api/director-dashboard`，返回指标卡结构和占位状态。
- T18 不新增数据库迁移，继续复用 T01 已创建的 `projects`、`project_items`、`resources`。
- 补齐现有工具广场自建工具前端脚本入口，使 T17 模板与接口闭合。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit`：通过。
- `node node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`：通过。
- `node node_modules/typescript/bin/tsc -p backend/tsconfig.json`：通过。
- `node node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- T18 smoke test：通过，使用 `/private/tmp/pet-doctor-ai-assistant-t18-smoke.db` 临时 SQLite 套用既有迁移 SQL 和 seed 后，`GET /api/resources`、`GET /api/projects`、`GET /api/director-dashboard` 均返回 200；`POST /api/projects`、`POST /api/projects/:id/items`、`GET /api/projects/:id` 项目条目流程通过。

### 开发决策

- T18 的三个模块均保持清晰占位状态，不引入真实资源业务、真实项目关联或真实统计口径。
- 项目接口先提供基础项目和项目条目结构，条目类型只做白名单预留，后续再接录音、对话、文件、工具生成物、待办和 Memory 的真实关联字段。
- 院长看板指标值保持 `null` / `--`，避免在统计口径未定义前展示误导性数字。

## 2026-06-02 - T16 PDF / 图片导出

状态：已完成

### 本次完成内容

- Web H5 录音结果详情页实现第一版前端导出能力。
- 病历自动生成模块支持直接下载 PDF，不再依赖浏览器打印窗口。
- 病历 PDF 内容包含宠主姓名、宠物姓名、医生 / 用户信息、生成时间、标准病历结构、“AI 生成内容仅供辅助，需人工确认。”和“该内容涉及医疗判断，请由具备资质的兽医或负责人确认后使用。”。
- 客户全景画像支持直接下载 PNG 图片和 PDF。
- 客户画像导出按门店内部查看口径生成版式，默认对宠主姓名做基础脱敏，并加入 AI 辅助提示与内部查看提示。
- 导出失败会写入页面错误提示；下载成功会显示 toast。
- H5 导出采用 Canvas 渲染结构化内容，再生成 PNG 或 PDF Blob；代码中标注小程序后续可使用 `uni.canvasToTempFilePath` / `saveFile` 或服务端导出接口。
- 更新 `README.md`、`PROJECT_STATE.md`。

### 验证记录

- `npm run typecheck -w frontend`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。

### 开发决策

- T16 不新增后端接口和数据库迁移，继续复用详情页已有 `recordingDetail`、当前用户信息和 `generation_results.content_json`。
- 为保证中文 PDF 第一版可用，本次采用 Canvas 图片嵌入 PDF 的方式生成下载文件，避免浏览器端 PDF 字体嵌入复杂度。
- 客户画像导出默认服务于门店内部查看，第一版不导出额外敏感字段；后续若需要客户签字版或外发版，应单独设计授权与脱敏规则。

## 2026-06-02 - T15 七大结果模块前端展示结构

状态：已完成

### 本次完成内容

- Web H5 录音结果详情页的七大结果 Tab 从单段 `contentText` 展示升级为按 `result_type` 分发的结构化展示。
- 病历自动生成按主诉、现病史、既往史、体格检查、初步判断、检查建议、治疗建议、医嘱、复诊建议、待医生确认事项分块展示。
- 病历模块保留整体编辑，新增“人工确认”按钮和浏览器打印式 PDF 导出入口。
- 沟通复盘按沟通完整度、追问充分度、宠主疑虑点、价格敏感点、风险告知、异议处理、表达清晰度、可改进话术分块展示，并高亮可改进话术。
- 客户全景画像改为模块化卡片展示，每个模块提供“修改”入口，支持导出图片和 PDF。
- 升单机会挖掘改为机会卡片展示，字段覆盖机会名称、触发依据、推荐理由、推荐话术、注意事项、是否需要医生确认。
- 智能回访改为回访计划卡片展示，回访话术支持复制，并继续保留“一键转成待办”。
- 医疗风险防控改为风险点列表，待补充确认内容高亮，并新增强人工确认提示。
- 团队经验共享按典型病例、优秀话术、处置路径、沟通技巧、可沉淀经验、脱敏建议分块展示。
- 结构化展示兼容 `contentJson` 的 camelCase、snake_case 和部分中文字段名；仍保留 JSON / text 编辑兜底区。
- 更新 `README.md`、`PROJECT_STATE.md`。

### 验证记录

- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。

### 开发决策

- T15 不新增后端接口和数据库迁移，继续复用 `generation_results.content_json` 与 `content_text`。
- PDF 导出第一版采用浏览器打印窗口，客户画像图片导出采用前端 Canvas 生成 PNG；后续若需要统一版式和服务端留档，可接入独立导出服务。
- “每个模块可修改”第一版统一进入既有 JSON / text 编辑模式，避免在 T15 引入复杂字段级保存协议。

## 2026-06-02 - T14 录音结果详情页与七大结果 Tab

状态：已完成

### 本次完成内容

- Web H5 `AI 录音 / 智能工牌` 页面新增完整录音结果详情区。
- 录音详情展示创建时间、处理状态、录音格式和录音时长。
- 宠主 / 宠物绑定区支持编辑和保存。
- 新增 `PUT /api/recordings/:id`，用于保存当前用户录音的 `petOwnerName` 和 `petName`。
- 转写文本区展示 `transcript_text`，支持编辑并调用既有转写保存接口保存。
- AI 总摘要区从 `summary` 结果读取并单独展示。
- 七大结果 Tab 固定为：病历自动生成、沟通复盘、客户全景画像、升单机会挖掘、智能回访、医疗风险防控、团队经验共享。
- 每个 Tab 展示 loading / empty / error / completed 状态，并保留编辑、保存、采纳、不采纳、重新生成操作。
- 医疗风险防控和团队经验共享默认显示“该模块需主动生成”，只在点击“立即生成”后调用主动生成接口。
- 结果详情页统一展示“AI 生成内容仅供辅助，需人工确认。”。
- 病历自动生成和医疗风险防控额外展示“该内容涉及医疗判断，请由具备资质的兽医或负责人确认后使用。”。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`。

### 验证记录

- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。

### 开发决策

- T14 不新增数据库迁移，宠主 / 宠物绑定继续复用 `recordings.pet_owner_name` 和 `recordings.pet_name`。
- 总摘要不放入七大业务 Tab，作为详情页独立区块展示；七大 Tab 只承载业务结果模块。
- 第六 / 第七模块继续沿用 T08 主动生成接口，前端不会默认触发。

## 2026-06-01 - T13 AI 录音 / 智能工牌页面

状态：已完成

### 本次完成内容

- Web H5 `AI 录音 / 智能工牌` 页面新增录音操作区。
- 页面展示录音前隐私提示：“请确认已获得沟通对象同意录音，并遵守所在门店及当地隐私要求。”
- 新增中间大按钮“开始录音”，录音中切换为“结束录音”。
- Web 端录音使用浏览器 `MediaRecorder` 获取麦克风音频，录音结束后转换为 WAV 再调用上传接口，避免常见浏览器产出的 WebM 音频被后端格式限制拒绝。
- 浏览器不支持录音、非安全上下文或缺少麦克风能力时，页面显示明确提示，并允许继续上传音频。
- 新增“上传录音”按钮，支持本地 MP3 / WAV / M4A，前端明确拒绝视频文件。
- 上传成功后自动触发 `POST /api/recordings/{id}/transcribe` 和 `POST /api/recordings/{id}/generate-default-results`。
- 下方最近录音记录展示创建时间、宠主名、宠物名、状态、场景和“进入详情”按钮。
- 状态中文展示：上传中、已上传、转写中、生成中、已完成、失败。
- 最近录音记录支持手动刷新状态。
- 失败录音提供“重新尝试”按钮，会调用 retry 后继续转写 / 默认生成流程。
- 保留既有录音详情和生成结果 Tab，第六 / 第七模块仍按 T08 逻辑主动生成。
- 更新 `README.md`、`PROJECT_STATE.md`。

### 验证记录

- `npm run typecheck -w frontend`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- T13 smoke test：通过，本地 WAV 可上传；转写后状态回到 `uploaded`；默认生成后录音状态为 `completed`，生成结果数量为 6。
- Browser 可视检查：通过，Web 页面展示标题、录音前隐私提示、开始录音按钮、上传录音按钮、格式限制说明、最近录音记录、中文状态和进入详情按钮。

### 开发决策

- T13 不新增后端接口和数据库迁移，复用 T05-T07 已完成的录音上传、转写和默认生成接口。
- 第一版在前端同步触发转写和默认生成；后续如果接入后台队列，可保持页面状态刷新和失败重试入口不变。

## 2026-06-01 - T12 Web 登录页与隐私授权

状态：已完成

### 本次完成内容

- 保留 T11 已实现的 Web H5 登录页能力：账号输入、密码输入、登录按钮、错误提示、登录 loading 和登录成功进入主框架。
- 主框架新增首次登录录音授权与隐私提示弹窗。
- 隐私提示内容包含：
  - 本产品涉及录音与 AI 生成。
  - 用户应遵守所在门店和当地隐私要求。
  - 录音内容仅用于生成辅助结果和业务记录。
  - 医疗相关内容需人工确认。
- 弹窗仅提供确认按钮，用户点击“我已知晓并确认”后关闭并继续使用系统。
- 新增前端本地隐私确认状态工具，按用户 ID 维度保存在 `uni` storage。
- 在本地确认状态写入处保留后端用户字段扩展 TODO，后续可迁移到 `users` 表或单独授权记录表。
- 更新 `README.md`、`PROJECT_STATE.md`。

### 验证记录

- `npm run typecheck -w frontend`：通过。
- `npm run build:h5 -w frontend`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。

### 开发决策

- T12 不新增后端接口和数据库迁移，优先使用本地用户维度 storage 记录隐私确认，满足当前验收。
- 弹窗放在主框架认证通过后展示，可复用 `GET /api/auth/me` 返回的用户 ID 生成本地确认键。
- 不允许点击遮罩关闭隐私弹窗，避免用户绕过首次确认。

## 2026-06-01 - T11 Web 主框架、侧边栏和路由

状态：已完成

### 本次完成内容

- 新增 Web H5 登录页 `pages/login/login`，作为前端首屏。
- 登录页调用 `POST /api/auth/login`，成功后保存 JWT 并直接进入主框架页。
- 新增前端认证工具 `frontend/src/utils/auth.ts`，统一管理 API 基础地址、token 读写和登录 / 工作台跳转。
- 主框架页启动时校验本地 token 和 `GET /api/auth/me`，未登录或 token 失效会跳转登录页。
- 主框架顶部新增用户信息区，支持当前模块刷新和退出登录。
- 侧边栏菜单按 PRD 固定为：
  - `AI 搭档 / Memory`
  - `AI 录音 / 智能工牌`
  - `工具广场`
  - `资源库`
  - `项目空间`
  - `任务 / 待办`
  - `院长看板`
  - `设置 / 个人中心`
- 保留已有 Memory、录音生成结果、任务 / 待办能力，并将录音、待办入口名称对齐 T11。
- 工具广场、资源库、项目空间、院长看板、设置 / 个人中心提供明确占位提示，避免空白页。
- 移动端 H5 支持侧边栏折叠，窄屏下菜单横向滚动。
- 登录状态校验、Memory、录音、待办和占位页均提供 loading、empty、error 或明确占位状态。
- 更新 `README.md`、`PROJECT_STATE.md`。

### 验证记录

- `npm run typecheck -w frontend`：通过。
- `npm run build:h5 -w frontend`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。

### 开发决策

- T11 不新增后端接口和数据库迁移，直接复用 T02 登录 / 当前用户接口。
- 取消 T04 为便于验收保留的前端自动 demo 登录，改为显式登录页和 token 守卫。
- 设置 / 个人中心第一版只展示当前用户基础信息；更完整的账号、门店和偏好配置后续再接入业务接口。

## 2026-06-01 - T10 智能回访转待办

状态：已完成

### 本次完成内容

- 新增待办接口：
  - `POST /api/todos`
  - `GET /api/todos`
  - `PUT /api/todos/:id`
  - `POST /api/todos/:id/complete`
  - `DELETE /api/todos/:id`
- `POST /api/todos` 支持 `title`、`description`、`petOwnerName`、`petName`、`dueTime`、`recordingId`、`generationResultId`、`status`，并兼容 snake_case 字段。
- 传入 `generationResultId` 时会校验生成结果归属当前用户，并自动补齐对应 `recordingId`。
- `GET /api/todos` 只返回当前登录用户自己的待办。
- 待办支持编辑和完成，完成后 `status = completed`。
- 删除待办会删除 `todos` 记录，并在同一事务写入 `audit_logs action=todo.delete`。
- 前端智能回访结果 Tab 新增“一键转成待办”按钮，会从智能回访结构化结果中提取宠主、宠物、回访原因、话术和建议时间。
- 前端新增“回访待办”工作台页面，可查看、编辑、勾选完成和删除待办，并展示录音 / 生成结果关联 ID。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- T10 smoke test：通过，`POST /api/todos` 可从 `generationResultId` 自动关联录音；`GET /api/todos` 只返回当前用户待办；`PUT /api/todos/:id` 可编辑；`POST /api/todos/:id/complete` 写入 `status = completed`；`DELETE /api/todos/:id` 删除待办并写入 `audit_logs action=todo.delete`。

### 开发决策

- T10 不新增 Prisma migration，直接复用 T01 已有 `todos` 和 `audit_logs`。
- 第一版不做复杂定时推送，只解析常见“3 天后 / N 小时后 / 明天”作为 `due_time` 初值，后续提醒调度可直接复用该字段。
- `todos` 表没有 `deleted_at`，删除待办采用硬删除，并用 `audit_logs` 保留删除前快照。

## 2026-06-01 - T09 AI 结果反馈与版本机制

状态：已完成

### 本次完成内容

- 新增顶层生成结果接口：
  - `PUT /api/generation-results/:id`
  - `POST /api/generation-results/:id/save`
  - `POST /api/generation-results/:id/adopt`
  - `POST /api/generation-results/:id/reject`
  - `POST /api/generation-results/:id/regenerate`
- 生成结果保存支持编辑 `contentText` / `contentJson`，保存后 `status = saved`。
- 采纳后 `status = adopted`，写入 `generation_feedback action=adopt`，并标记 `confirmed_by_user` / `confirmed_at`。
- 不采纳必须提交原因，原因限定为任务卡枚举项；缺少原因或原因不合法会返回 `400 GENERATION_REJECT_REASON_REQUIRED`。
- 重新生成复用 `LLMProvider`，覆盖当前结果内容，`version + 1`，`status = regenerated`，成功后 `module_status = completed`，并新增 `generation_feedback action=regenerate`。
- 重新生成不删除旧 `generation_feedback`，历史采纳 / 不采纳 / 重新生成反馈会保留。
- 保存接口支持显式写入 `confirmedByUser` / `confirmedAt`；采纳会自动写入人工确认时间。
- 前端生成结果编辑区新增结构化 JSON 编辑框。
- 前端将保存、采纳、不采纳、重新生成切到顶层 `generation-results` 接口。
- `medical_record` 和 `medical_risk_control` 页面均展示人工确认提示。

### 验证记录

- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 仍为上游 deprecation warning。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t09.db" npm run db:migrate -w backend`：仍受当前 Prisma 7 schema engine 空错误影响未通过；本次 smoke test 改用既有迁移 SQL 初始化临时 SQLite 库。
- T09 smoke test：通过，保存后 `status = saved`；采纳后 `status = adopted` 且人工确认字段写入；不采纳无 `reason` 返回 400；合法不采纳写入 `generation_feedback action=reject`；重新生成后 `version` 从 1 增至 2，`status = regenerated`，`moduleStatus = completed`；`generation_feedback` 中 adopt / reject / regenerate 记录均保留。

### 开发决策

- T09 不新增 Prisma migration，复用 T01 已有 `generation_results.confirmed_by_user`、`generation_results.confirmed_at`、`generation_results.version` 和 `generation_feedback`。
- `regenerate` 作用于当前结果行并递增版本号，不创建新 `generation_results` 行，便于保留同一结果的反馈历史。
- 重新生成成功后 `module_status` 使用 `completed`，`status` 使用 `regenerated` 区分用户动作结果。

## 2026-05-31 - T08 主动生成医疗风险防控与团队经验共享

状态：已完成

### 本次完成内容

- 新增主动生成接口：
  - `POST /api/recordings/:id/generate-risk-control`
  - `POST /api/recordings/:id/generate-team-knowledge`
- 医疗风险防控和团队经验共享继续不纳入默认生成范围。
- 主动生成复用 T07 编排能力，但 `is_default_generated = false`。
- 主动生成重复调用按 `recording_id + result_type` 的最大 `version` 递增创建新结果，支持重新生成。
- 单个主动模块生成失败时保留失败结果行，`module_status = failed`，不影响其他模块。
- 医疗风险防控 prompt 和 mock 内容覆盖麻醉、手术、重症、输血、侵入性检查、费用争议、宠主理解、风险告知完整性和补充确认项。
- 医疗风险防控内容明确展示人工确认提示，并限制为 AI 辅助识别和提醒口径。
- 团队经验共享 prompt 和 mock 内容覆盖典型病例摘要、优秀话术、处置路径、沟通技巧、可沉淀经验和脱敏建议。
- 新增生成结果编辑保存与反馈接口：
  - `PUT /api/recordings/:id/generation-results/:resultId`
  - `POST /api/recordings/:id/generation-results/:resultId/adopt`
  - `POST /api/recordings/:id/generation-results/:resultId/reject`
- 前端新增录音接诊 / 生成结果工作区，可读取录音、切换结果 Tab、主动生成第六 / 第七模块、编辑保存、采纳、不采纳和重新生成。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 只输出上游 deprecation warning。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t08.db" npm run db:migrate -w backend`：仍受当前 Prisma 7 schema engine 空错误影响未通过；本次接口 smoke test 改用既有迁移 SQL 初始化临时 SQLite 库后完成。
- T08 smoke test：通过，默认生成只返回 6 个默认类型；主动生成 `medical_risk_control`、`team_knowledge` 均为 `isDefaultGenerated = false`；医疗风险内容包含人工确认提示；保存、采纳、不采纳接口均通过。

### 开发决策

- T08 不新增 Prisma migration，直接复用 `generation_results`、`generation_feedback` 和 `ai_call_logs`。
- 主动生成不修改录音整体处理状态，避免第六 / 第七模块失败影响已完成的默认结果。
- 前端在医疗风险防控 Tab 固定展示人工确认提示，避免误解为 AI 已完成风险判断。

## 2026-05-31 - T07 AI 默认生成总摘要与前五项结果

状态：已完成

### 本次完成内容

- 新增默认生成编排服务 `backend/src/services/recordings/default-generation.ts`。
- 新增录音默认生成接口：
  - `POST /api/recordings/:id/generate-default-results`
- 默认生成范围固定为 6 条 `generation_results`：
  - `summary`
  - `medical_record`
  - `communication_review`
  - `customer_profile`
  - `upsell_opportunities`
  - `smart_followup`
- `medical_risk_control` 和 `team_knowledge` 不纳入默认生成。
- 默认生成会读取录音 `transcript_text`、录音基础信息、宠主 / 宠物信息、当前用户信息和用户 Memory。
- 每个模块先创建 `generation_results` 行，再独立调用 `LLMProvider`，并按模块更新 `module_status`。
- 允许部分模块成功、部分模块失败；失败模块保留对应 `generation_results` 行，`module_status = failed`。
- 每次 LLM 调用继续通过 `generateWithLLM` 写入 `ai_call_logs`，并关联具体 `generation_result_id`。
- 生成完成后会从结果内容中尝试识别 `pet_owner_name` 和 `pet_name` 并回写 `recordings`，识别不到则保持为空。
- 完成状态规则：至少 `summary` 和一个业务模块成功时，`recordings.processing_status = completed`；全部失败或未达到完成条件时为 `failed`。
- 补齐 mock LLM 的模块结构，使 `medical_record`、`communication_review`、`customer_profile`、`upsell_opportunities`、`smart_followup` 的 JSON 字段可直接支撑前端展示。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `npm run typecheck -w backend`：通过。
- `POST /api/recordings/:id/generate-default-results`：通过，有转写文本的录音生成 6 条默认结果。
- `generation_results` 查询：通过，`summary`、`medical_record`、`communication_review`、`customer_profile`、`upsell_opportunities`、`smart_followup` 均为 `module_status = completed`。
- `ai_call_logs` 查询：通过，默认生成写入 6 条 `call_type = generation` 日志。
- 宠主 / 宠物识别回写：通过，mock 内容识别并回写 `pet_owner_name = 王女士`、`pet_name = 小布`。
- `recordings.processing_status`：通过，至少 `summary` 和一个业务模块成功后更新为 `completed`。

### 开发决策

- T07 不新增 Prisma migration，直接复用 T01 已有 `generation_results`、`recordings` 与 `ai_call_logs`。
- 默认生成接口当前仍是请求内编排，后续可以替换为后台队列；落库顺序和状态字段已按异步任务思路预留。
- 重复调用默认生成时不覆盖旧结果，而是按 `result_type` 递增 `version` 创建新结果，避免丢失历史生成内容。
- 宠主 / 宠物名识别优先使用结构化 JSON，辅以展示文本中的标签解析；不强行猜测，识别不到则保留为空。

### 当前未完成范围

- 未接入真实外部 LLM provider。
- 未实现生成结果编辑、采纳、保存和导出。
- 未实现智能回访结果转待办。

## 2026-05-31 - T06 语音转写流程与异步任务状态

状态：已完成

### 本次完成内容

- 新增录音转写接口：
  - `POST /api/recordings/:id/transcribe`
  - `GET /api/recordings/:id/transcript`
  - `PUT /api/recordings/:id/transcript`
- 新增内部音频路径解析 `resolveStoredAudioFilePath`，将 `internal://recordings/...` 解析到 `LOCAL_STORAGE_DIR` 下的私有文件路径。
- `POST /api/recordings/:id/transcribe` 会按当前用户和未删除条件校验录音归属。
- 转写开始时更新 `recordings.processing_status = transcribing`，并清空旧错误信息。
- 转写调用统一走 `TranscriptionProvider` / `transcribeAudio`，沿用 T03 的 `ai_call_logs` 写入能力。
- 转写成功后写入 `recordings.transcript_text`，必要时更新 `audio_duration`，状态回到可继续生成的 `uploaded`。
- 转写失败后状态更新为 `failed`，写入 `error_message`，保留 `audio_url`，允许重新转写。
- mock 转写 provider 支持 `forceFail` 测试字段，用于验收失败重试流程。
- `GET /api/recordings/:id/transcript` 返回转写文本、处理状态、错误信息和更新时间，便于前端读取状态。
- `PUT /api/recordings/:id/transcript` 支持手动编辑保存 `transcript_text`，保存后状态为 `uploaded`。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `npm run typecheck -w backend`：通过。
- `POST /api/recordings/:id/transcribe`：通过，mock 返回宠物问诊文本，写入 `transcript_text` 和 `ai_call_logs`。
- mock 强制失败：通过，状态变为 `failed`，写入 `error_message`，音频保留，可重新转写。
- `GET /api/recordings/:id/transcript`：通过，可读取转写文本和状态。
- `PUT /api/recordings/:id/transcript`：通过，可编辑保存转写文本。

### 开发决策

- T06 不新增 Prisma migration，直接复用 T01 已有 `recordings` 与 `ai_call_logs`。
- 第一版“不做实时转写”，接口内完成转写编排；接口响应和状态字段已按异步任务思路设计，后续可替换为后台队列。
- 转写成功后的状态使用 `uploaded` 作为“生成前可继续处理”的状态，后续 T07 生成编排可从该状态进入 `generating`。
- 失败重试不删除音频，不清空已有 `transcript_text`；重新转写成功后会覆盖为新的转写结果。

### 当前未完成范围

- 未接入真实转写 provider。
- 未实现后台队列、任务表或轮询进度百分比。
- 未实现转写完成后自动触发 AI 生成结果落库。

## 2026-05-31 - T05 录音 / 上传音频后端接口

状态：已完成

### 本次完成内容

- 新增受保护录音路由 `backend/src/routes/recordings.ts`。
- 新增轻量音频上传解析与私有存储服务 `backend/src/services/recordings/audio-upload.ts`。
- 新增录音接口：
  - `POST /api/recordings/upload`
  - `POST /api/recordings/start`
  - `POST /api/recordings/finish`
  - `GET /api/recordings`
  - `GET /api/recordings/:id`
  - `DELETE /api/recordings/:id`
  - `POST /api/recordings/:id/retry`
- 支持 `multipart/form-data`、`audio/*` 原始请求体和 JSON `audioBase64` 上传音频。
- 音频格式支持 MP3 / WAV / M4A，不支持视频文件。
- 新增环境变量读取：`MAX_AUDIO_SIZE_MB`、`MAX_AUDIO_DURATION_SECONDS`、`LOCAL_STORAGE_DIR`。
- 上传完成后创建或更新 `recordings`，状态从 `uploading` / `uploaded` 开始流转。
- `audio_url` 保存为 `internal://...` 私有内部路径，实际文件落到本地私有目录。
- 录音列表和详情均按当前登录用户过滤。
- 录音详情返回基础信息、转写文本、宠主 / 宠物绑定信息和生成结果列表。
- 删除录音采用软删除 `deleted_at`，并在同一事务写入 `audit_logs`。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `npm run typecheck -w backend`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 只输出上游 deprecation warning。
- `npm run build -w backend`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t05.db" npm run db:migrate -w backend`：受当前中文 / 空格项目路径下 Prisma 7 schema engine 空错误影响未通过；本次接口验证改用已有迁移 SQL 初始化临时 SQLite 库后完成。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t05.db" npm run db:seed -w backend`：通过。
- `POST /api/recordings/upload`：通过，合法 WAV 创建 `uploaded` 录音，返回 `internal://...` 音频路径。
- 不支持格式上传：通过，返回 `415 UNSUPPORTED_AUDIO_FORMAT`。
- `POST /api/recordings/start`：通过，创建 `uploading` 录音。
- `POST /api/recordings/finish`：通过，写入音频后状态变为 `uploaded`。
- `GET /api/recordings`：通过，只返回当前用户自己的录音。
- `GET /api/recordings/:id`：通过，返回宠主 / 宠物绑定信息和生成结果列表。
- 普通用户访问他人录音：通过，返回 `404 RECORDING_NOT_FOUND`。
- `DELETE /api/recordings/:id`：通过，写入 `recordings.deleted_at` 和 `audit_logs`。

### 开发决策

- T05 不新增 Prisma migration，直接复用 T01 已有 `recordings` 与 `audit_logs`。
- 当前音频文件先落本地私有目录；后续可在 `internal://...` 语义不变的前提下替换为对象存储或受控下载接口。
- MP3 / M4A 时长第一版依赖客户端传入 `durationSeconds`；WAV 可从文件头推断。后续如引入 ffprobe 或云端媒体分析服务，可改为服务端强校验。
- `GET /api/recordings/:id` 对越权和不存在统一返回 `404 RECORDING_NOT_FOUND`，避免泄露他人录音存在性。

### 当前未完成范围

- 未实现受权限保护的音频下载 / 临时签名下载接口。
- 未接入真实转写任务编排。
- 未实现上传后自动触发 AI 生成结果落库。
- 未实现对象存储、断点续传和服务端 MP3 / M4A 精确时长解析。

## 2026-05-31 - T04 Memory 模块后端与前端基础页面

状态：已完成

### 本次完成内容

- 新增受保护 Memory 路由 `backend/src/routes/memory.ts`。
- 新增个人 Memory 接口：
  - `GET /api/memory`
  - `POST /api/memory/init`
  - `PUT /api/memory`
  - `POST /api/memory/suggestions`
  - `POST /api/memory/suggestions/:id/accept`
  - `POST /api/memory/suggestions/:id/reject`
- 个人 Memory 使用 `memories.memory_type = personal_memory`，所有读写按当前登录用户 `user_id` 过滤。
- 首次初始化支持城市、门店、岗位、个人背景、工作场景、常见任务、个人偏好字段，并生成固定 Markdown 模板：
  - `# 个人 Memory`
  - `## 基础信息`
  - `## 工作背景`
  - `## 常见任务`
  - `## 沟通偏好`
  - `## 长期有效信息`
- Memory suggestion 使用 `memory_update_suggestions.suggestion_type = personal_memory_update`。
- 普通客户聊天、普通接诊沟通不默认写入 Memory；只有识别到长期有效信息时创建 pending suggestion。
- suggestion 必须由用户调用 accept 后才写入 `memories.content_text`，reject 只更新建议状态。
- 前端首页升级为 Web 工作台，侧边栏第一项为 `AI 搭档 / Memory`。
- Web 页面支持首次初始化、Markdown 展示、编辑保存、建议更新弹窗、接受和拒绝建议。
- 小程序新增 `pages/my/my.vue`，在“我的”页面预留 Memory 查看入口。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 验证记录

- `npm run typecheck -w backend`：通过。
- `npm run typecheck -w frontend`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过，H5 构建完成；Sass legacy JS API 只输出上游 deprecation warning。
- `GET /api/memory`：通过，首次返回 `memory = null`、`pendingSuggestions = []`。
- `POST /api/memory/init`：通过，返回 `personal_memory`，Markdown 模板包含必需标题。
- `PUT /api/memory`：通过，可保存编辑后的 Markdown。
- `POST /api/memory/suggestions`：通过，普通接诊聊天不创建 suggestion；显式长期有效信息会创建 pending suggestion。
- `POST /api/memory/suggestions/:id/accept`：通过，建议状态变为 `accepted`，内容写入 Memory。
- `POST /api/memory/suggestions/:id/reject`：通过，建议状态变为 `rejected`，不修改 Memory。

### 开发决策

- T04 不新增 Prisma migration，直接复用 T01 已有 `memories` 和 `memory_update_suggestions`。
- 前端为便于本地验收，H5 页面会在没有 token 时使用 seed 用户 `demo_doctor` / `demo_password` 自动登录。
- 当前 suggestion 创建使用保守规则：显式传入 `longTermInfo` 时创建建议；传入普通 `sourceText` / `chatText` 时，只有包含长期有效信号才创建建议。
- 当前不接入真实 LLM 自动分析普通聊天，避免普通客户聊天、普通接诊沟通误触发 Memory 更新。

### 当前未完成范围

- 未接入真实聊天 / 接诊 / AI 生成结果中的 Memory suggestion 自动识别链路。
- 未实现复杂 Markdown diff 展示。
- 未实现 Memory 历史版本和审计日志写入。

## 2026-05-31 - T03 AI Provider 与转写 Provider 抽象层

状态：已完成

### 本次完成内容

- 新增 `TranscriptionProvider` 抽象，输入为 `recordingId`、`audioFilePath`、`audioFormat`，输出为 `transcriptText`、`detectedSpeakers`、`duration`。
- 新增 `LLMProvider` 抽象，输入为 `prompt`、`context`、`modelName`、`generationType`，输出为 `contentJson`、`contentText`、`tokens`、`latency`。
- 新增 provider 白名单和环境变量读取：
  - `TRANSCRIPTION_PROVIDER`：`mock`、`dingtalk`、`feishu`、`aliyun`、`tencent`、`manual`、`other`
  - `LLM_PROVIDER`：`mock`、`deepseek`、`qwen`
- 新增 `PromptVersion` 映射，每类生成任务都有独立版本，例如 `v1-medical-record`、`v1-customer-profile`。
- 新增 `AICallLogger`，转写与生成调用都会写入 `ai_call_logs`，失败占位 provider 也会记录 failed 日志。
- 新增 mock 转写 provider，返回非空转写文本、示例说话人和时长。
- 新增 mock LLM provider，按 `generationType` 返回结构化示例 JSON 和非空文本。
- 新增受保护联调接口：
  - `POST /api/ai/transcriptions`
  - `POST /api/ai/generations`
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/api.md`、`docs/database-schema.md`。

### 接口记录

- `POST /api/ai/transcriptions` 会校验录音属于当前用户，调用配置的转写 provider，写入 `ai_call_logs`，并把 mock 转写结果回填到 `recordings.transcript_text` / `recordings.audio_duration`。
- `POST /api/ai/generations` 会校验可选的 `recordingId` / `generationResultId` 属于当前用户，调用配置的 LLM provider，返回 mock 结构化内容并写入 `ai_call_logs`。
- 真实 DeepSeek、通义千问、钉钉、飞书、阿里云、腾讯等 provider 只保留可替换结构，当前调用会返回 `501` 未接入错误。

### 运行方式

```bash
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev:backend
```

默认 `.env.example` 已配置：

```text
TRANSCRIPTION_PROVIDER=mock
TRANSCRIPTION_MODEL_NAME=mock-transcription-v1
LLM_PROVIDER=mock
LLM_MODEL_NAME=mock-llm-v1
```

### 验证记录

- `npm run typecheck -w backend`：通过。
- `POST /api/ai/transcriptions`：通过，返回 mock 转写文本、说话人 `["医生", "宠主"]` 和时长 `128`。
- `POST /api/ai/generations`：通过，`medical_record` 返回 `contentJson`、`contentText`、token 和耗时。
- `ai_call_logs` 查询：通过，转写和生成各写入 1 条 `success` 日志。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t03.db" npm run db:migrate -w backend`：受当前中文 / 空格项目路径下 Prisma 7 schema engine 空错误影响未通过；本次接口验证改用已有迁移 SQL 初始化临时 SQLite 库后完成。

### 开发决策

- T03 不接入真实外部 AI 服务，不要求真实 key。
- Provider 切换通过环境变量完成，mock 为默认值。
- 非 mock provider 作为显式占位实现，后续接入时替换对应 class 即可，不影响服务层调用方。
- 联调接口只覆盖抽象层调用和日志落库，不扩展完整录音上传、批量生成结果落库、待办生成等后续业务流程。

### 当前未完成范围

- 未实现真实 DeepSeek、通义千问、钉钉、飞书、阿里云、腾讯调用。
- 未实现录音上传接口。
- 未实现 AI 生成结果自动写入 `generation_results` 的完整编排。
- 未实现导出、待办、审计日志业务能力。

## 2026-05-29 - T02 后端认证与用户基础接口

状态：已完成

### 本次完成内容

- 新增 Prisma Client 单例 `backend/src/db/prisma.ts`。
- 新增密码 hash 工具，使用 Node.js `crypto.scrypt` 保存和校验密码。
- 新增 JWT 工具，使用 `JWT_SECRET` 和 HS256 生成、校验 token。
- 新增认证中间件 `requireAuth`，从 `Authorization: Bearer <token>` 读取当前用户并写入 `req.currentUser`。
- 新增认证接口：
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/wechat-login`
  - `POST /api/auth/bind-wechat`
- 更新 seed，测试用户 `demo_doctor` 密码为 `demo_password`，数据库保存真实 hash。
- 新增 API 文档 `docs/api.md`。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/dev-notes.md`、`docs/database-schema.md`。

### 接口记录

- Web 登录成功返回 JWT token 和用户基础信息。
- `GET /api/auth/me` 返回当前用户信息，不返回 `password_hash`。
- 微信登录 mock 使用 `openid` / `unionid`，可创建微信 mock 用户，也可通过 `userId` 绑定已有用户。
- 微信绑定接口会阻止同一个微信身份绑定到其他用户。
- 未登录、token 无效、token 过期或用户停用统一返回 `401 UNAUTHORIZED`。

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

### 验证记录

- `npm run typecheck -w backend`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t02-auth-20260529.db" JWT_SECRET="local-t02-test-secret" npm run db:seed -w backend`：通过。
- `GET /api/auth/me` 未带 token：通过，返回 `401 UNAUTHORIZED`。
- `POST /api/auth/login` 使用 `demo_doctor` / `demo_password`：通过，返回 JWT 和用户信息。
- `GET /api/auth/me` 携带 JWT：通过，返回当前用户信息。
- `POST /api/auth/wechat-login` 携带 mock `openid` / `unionid`：通过，可创建微信 mock 用户并返回 JWT。
- `POST /api/auth/bind-wechat` 携带 JWT 和 mock `openid` / `unionid`：通过，可绑定当前用户。
- `POST /api/auth/logout` 携带无效 JWT：通过，返回统一 `401 UNAUTHORIZED`。

### 开发决策

- 不引入额外认证依赖，第一版使用 Node.js 标准库完成 `scrypt` 密码 hash 和 HS256 JWT。
- `logout` 当前保持无状态 JWT 语义，只返回退出成功，不维护服务端 token 黑名单。
- 微信登录 provider 固定为 `wechat_mock`，为后续真实小程序 code2Session 接入留出替换点。
- 后续业务接口应默认接入 `requireAuth`，并按 `req.currentUser.id` 限制普通用户只能访问自己创建的数据。

### 当前未完成范围

- 未实现 token 黑名单、refresh token、复杂角色权限。
- 未接入真实微信 code2Session。
- 未实现录音、上传、转写、AI 生成、导出、待办等业务接口。

## 2026-05-29 - T01 数据库 Schema 与 Prisma 模型

状态：已完成

### 本次完成内容

- 引入 Prisma 7、`@prisma/client`、`@prisma/adapter-better-sqlite3`、`better-sqlite3`。
- 新增 `backend/prisma/schema.prisma`，创建第一版数据库模型。
- 新增 Prisma 配置 `backend/prisma.config.ts`，集中配置 schema、migration path、seed 命令和 datasource。
- 新增迁移文件 `backend/prisma/migrations/20260529030855_init_schema/migration.sql`。
- 新增 seed 脚本 `backend/prisma/seed.ts`。
- 新增根目录和 backend 数据库脚本：
  - `db:generate`
  - `db:migrate`
  - `db:seed`
  - `db:studio`
- 新增后端枚举类型定义 `backend/src/types/domain.ts`。
- 新增 schema 文档 `docs/database-schema.md`。
- 更新 `README.md`、`PROJECT_STATE.md`、`docs/dev-notes.md`。

### 数据表记录

本次创建 16 张表：

`users`、`user_auth_bindings`、`stores`、`user_store_relations`、`memories`、`memory_update_suggestions`、`recordings`、`generation_results`、`generation_feedback`、`todos`、`custom_tool_requirements`、`projects`、`project_items`、`resources`、`audit_logs`、`ai_call_logs`。

### 枚举记录

- `RecordingProcessingStatus`
- `GenerationResultType`
- `GenerationModuleStatus`
- `GenerationStatus`
- `GenerationFeedbackAction`
- `TodoStatus`
- `MemoryUpdateSuggestionStatus`
- `CustomToolRequirementStatus`

### 运行方式

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
```

本次验收使用：

```bash
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:migrate
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:seed
```

seed 创建：

- 用户：`demo_doctor`
- 门店：`宠一科技测试门店`

### 验证记录

- `npx prisma validate`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:migrate`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npm run db:seed`：通过。
- `DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-t01.db" npx prisma migrate status`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。

### 开发决策

- Prisma 模型使用 PascalCase / camelCase，数据库表名和字段通过 `@@map`、`@map` 固定为 PRD 要求的 snake_case。
- 日志表 `audit_logs`、`ai_call_logs` 按追加型记录处理，只保留 `created_at`。
- `generation_feedback` 虽然任务卡字段只列出 `created_at`，但按“所有业务表保留 created_at、updated_at”要求补充 `updated_at`。
- Prisma 7 Client 需要 SQLite driver adapter，seed 使用 `PrismaBetterSqlite3` 初始化 Prisma Client。
- 当前工作区路径包含中文和空格，Prisma 7 schema engine 对相对 SQLite URL 可能返回空错误；本次验收使用绝对 SQLite URL 完成。

### 当前未完成范围

- 未实现业务读写 service。
- 未实现登录、录音、上传、转写、AI 生成、导出、待办接口。
- 未做 PostgreSQL 实库迁移验证。

## 2026-05-29 - T00 工程初始化与开发规范

状态：已完成

### 本次完成内容

- 初始化《宠物医生 AI 医助》MVP monorepo。
- 创建 `frontend`：uni-app + Vue 3 + TypeScript。
- 创建 `backend`：Node.js + TypeScript + Express。
- 创建 `docs` 文档目录。
- 添加根目录工程配置：
  - `package.json`
  - `package-lock.json`
  - `tsconfig.base.json`
  - `.env.example`
  - `.gitignore`
  - `.editorconfig`
  - `.prettierrc`
- 后端完成：
  - Express 应用创建。
  - 环境变量加载。
  - CORS 与 Helmet 基础中间件。
  - 请求 ID 注入。
  - 统一成功响应。
  - 统一错误响应。
  - 404 处理。
  - `GET /api/health` 健康检查。
- 前端完成：
  - uni-app H5 默认页面。
  - 微信小程序 `manifest.json` 配置预留。
  - Pinia 引入。
  - 首页 API 健康检查展示。
  - loading、error、success 和重试基础状态。
- 文档完成：
  - 更新 `README.md`。
  - 创建 `PROJECT_STATE.md`。
  - 创建 `DEVELOPMENT_LOG.md`。
  - 更新 `docs/dev-notes.md`。

### 接口记录

#### GET /api/health

用途：检查 API 服务是否可用。

请求参数：无。

响应结构：使用统一成功响应格式。

示例：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "pet-doctor-ai-assistant-api",
    "timestamp": "2026-05-29T02:44:10.096Z"
  },
  "requestId": "3aaafb78-fa5d-4e65-ad5c-1671701a3398",
  "timestamp": "2026-05-29T02:44:10.097Z"
}
```

### 运行方式

```bash
npm install
cp .env.example .env
npm run dev:backend
npm run dev:frontend
```

### 验证记录

- `npm install`：通过。
- `npm run typecheck -w backend`：通过。
- `npm run build -w backend`：通过。
- `npm run typecheck -w frontend`：通过。
- `npm run build:h5 -w frontend`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `GET /api/health`：通过，返回统一成功响应。
- `npm run dev:frontend`：通过，H5 dev server 可返回默认页面。

### 开发决策

- 后端选择 Express，而不是 NestJS，原因是 MVP 第一阶段优先快速落地和降低工程复杂度。
- T00 不创建 Prisma schema 和业务模型，避免超出任务卡范围。
- T00 只在 `.env.example` 预留 StorageProvider、TranscriptionProvider 和 LLMProvider 相关配置。
- uni-app Vue 3 依赖锁定在 `3.0.0-alpha-5010120260525001` 版本线，Vite 锁定 `5.2.8`，以匹配 `@dcloudio/vite-plugin-uni` peer dependency。
- 暂不执行 `npm audit fix --force`，避免破坏当前 uni-app 编译链路。

### 当前未完成范围

- Web 账号密码登录。
- 微信登录接口与小程序登录结构。
- Prisma 与数据库模型。
- Memory 创建、查看、编辑。
- Web 录音。
- MP3 / WAV / M4A 上传。
- 转写 Provider 抽象与 mock provider。
- LLM Provider 抽象与 mock provider。
- AI 默认五项结果生成。
- 医疗风险防控、团队经验共享主动生成。
- 结果编辑、保存、采纳、不采纳、重新生成。
- 不采纳原因收集。
- PDF / 图片导出。
- 智能回访转待办。
- 自建工具问答追问生成需求文档。
- 删除审计日志。
- Docker、docker-compose、Nginx 预留。

### 下一步任务

`T01 基础数据模型与 Prisma 初始化`

建议实施内容：

- 安装 Prisma 与数据库客户端。
- 配置 SQLite 本地开发数据库，并保留 PostgreSQL 迁移兼容性。
- 建立基础 schema。
- 添加数据库迁移与生成命令。
- 增加基础 seed 或连接验证脚本。
- 更新 README、PROJECT_STATE、DEVELOPMENT_LOG 和 `docs/dev-notes.md`。
