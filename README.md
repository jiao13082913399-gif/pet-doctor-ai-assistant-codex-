# 宠物医生 AI 医助 MVP

面向宠物医院一线沟通场景的 AI 医助 MVP。产品目标是跑通“录音 / 上传音频 -> 语音转写 -> AI 生成结果 -> 编辑 / 采纳 / 保存 / 导出 -> 智能回访转待办”的完整闭环。

当前进度：已完成 `T21 Docker 部署与 MVP 验收`，并于 2026-06-04 完成集成验收复核。本阶段补齐后端 Dockerfile、H5 静态 Nginx 部署方案、`docker-compose.yml`、SQLite 数据 volume、环境变量模板、启动脚本、README 部署说明、`docs/mvp-acceptance.md` 手动验收路径，以及本地 smoke test / 验收报告 / 问题清单。

## 目录结构

```text
.
├── backend                 # Node.js + TypeScript + Express API 服务
│   ├── src
│   │   ├── config          # 环境变量读取与校验
│   │   ├── middleware      # 请求 ID、404、统一错误处理
│   │   ├── routes          # API 路由
│   │   ├── services        # 认证、用户展示、AI Provider 等服务
│   │   ├── types           # API、领域枚举与 Express 类型扩展
│   │   └── utils           # API 响应与错误工具
│   ├── prisma              # Prisma schema、迁移与 seed
│   └── tsconfig.json
├── frontend                # uni-app + Vue 3 + TypeScript
│   ├── src
│   │   ├── pages           # 页面目录
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── manifest.json   # H5 与微信小程序配置预留
│   │   └── pages.json
│   └── vite.config.ts
├── docs                    # 开发说明与任务记录
├── deploy                  # Docker / Nginx 部署配置
├── scripts                 # 本地启动与部署辅助脚本
├── docker-compose.yml      # MVP Docker Compose 编排
├── .env.example            # 环境变量模板
├── DEVELOPMENT_LOG.md      # 开发日志
├── PROJECT_STATE.md        # 当前项目状态
├── package.json            # npm workspaces 根脚本
└── tsconfig.base.json      # 共享 TypeScript 基础配置
```

## 环境要求

- Node.js >= 20
- npm >= 10

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量：

```bash
cp .env.example .env
```

3. 启动后端：

```bash
npm run dev:backend
```

后端默认运行在 `http://localhost:3000`。

健康检查：

```bash
curl http://localhost:3000/api/health
```

4. 启动前端 H5：

```bash
npm run dev:frontend
```

前端默认运行在 Vite 输出的本地地址，通常为 `http://localhost:5173`。

## 常用命令

```bash
npm run dev:backend      # 启动 Express API
npm run dev:watch -w backend # 启动后端热重载开发模式
npm run dev:frontend     # 启动 uni-app H5
npm run build:mp-weixin -w frontend # 构建微信小程序端
npm run db:generate       # 生成 Prisma Client
npm run db:migrate        # 执行本地数据库迁移
npm run db:seed           # 写入测试用户与测试门店
npm run db:studio         # 打开 Prisma Studio
npm run docker:up         # 构建镜像并启动 Docker MVP 服务
npm run docker:down       # 停止 Docker Compose 服务
npm run build            # 构建后端与前端 H5
npm run typecheck        # 前后端 TypeScript 检查
npm run format           # Prettier 格式化
```

## Docker MVP 部署

T21 提供第一版 Docker 部署与验收环境，默认使用 H5 静态构建 + Nginx 反代后端 API + SQLite volume 持久化数据。

### 文件说明

```text
backend/Dockerfile              # 构建并运行 Express API
frontend/Dockerfile             # 构建 H5 并用 Nginx 托管静态文件
deploy/nginx/default.conf       # Nginx 静态资源与 /api 反代配置
deploy/docker.env.example       # Docker MVP 环境变量模板
docker-compose.yml              # backend + frontend + SQLite volume 编排
scripts/docker-up.sh            # docker build + docker compose up --no-build -d
scripts/docker-down.sh          # docker compose down
docs/mvp-acceptance.md          # MVP 手动验收路径
```

### 启动服务

1. 复制 Docker 环境变量模板，生成不会提交到 Git 的私有配置：

```bash
cp deploy/docker.env.example deploy/docker.env
```

2. 打开 `deploy/docker.env`，至少完成以下检查：

- 替换 `JWT_SECRET` 和 `PRIVATE_FILE_SIGNING_SECRET`，不要使用示例值。
- 将 `CORS_ORIGIN` 改为实际访问 H5 的域名，例如 `https://ai.example.com`。
- 保持 Docker H5 推荐的 `VITE_API_BASE_URL=/api`，由 Nginx 反向代理后端。
- 确认是否继续使用 `TRANSCRIPTION_PROVIDER=mock` 和 `LLM_PROVIDER=mock`。演示部署可以使用 mock；真实业务上线前必须切换真实 provider 并填写对应密钥。
- 演示环境可使用 `SEED_ON_START=true` 创建 `demo_doctor / demo_password`；正式部署必须在真实账号创建后改为 `false`。

3. 启动 Docker 服务：

```bash
npm run docker:up
```

或按脚本内步骤直接执行：

```bash
docker build -f backend/Dockerfile -t aiweb-backend .
docker build --build-arg VITE_API_BASE_URL=/api -f frontend/Dockerfile -t aiweb-frontend .
docker compose up --no-build -d
```

启动后访问：

```text
H5：http://localhost:8080
API 健康检查：http://localhost:8080/api/health
```

默认 seed 会创建测试账号：

```text
账号：demo_doctor
密码：demo_password
```

如需停止服务：

```bash
npm run docker:down
```

如需清空 MVP 验收数据并重新初始化：

```bash
docker compose down -v
npm run docker:up
```

4. 验证健康检查：

```bash
curl http://localhost:8080/api/health
```

5. 停止服务：

```bash
npm run docker:down
```

### 环境变量

Docker 默认读取私有文件 `deploy/docker.env`。该文件已被 `.gitignore` 忽略，不能提交到 Git。首次部署前应从模板复制：

```bash
cp deploy/docker.env.example deploy/docker.env
```

关键变量：

- `JWT_SECRET`：必须替换为足够长的随机字符串，不能使用示例值。
- `PRIVATE_FILE_SIGNING_SECRET`：必须替换为足够长的随机字符串，不能使用示例值。
- `CORS_ORIGIN`：H5 访问域名，示例为 `https://ai.example.com`，部署时必须改为真实域名。
- `VITE_API_BASE_URL`：Docker H5 推荐值为 `/api`，由 Nginx 反代后端。
- `DATABASE_URL`：默认 `file:/app/data/dev.db`，对应 Docker volume `sqlite-data`。
- `LOCAL_STORAGE_DIR`：默认 `/app/storage/private`，对应 Docker volume `private-storage`，用于录音私有文件。
- `TRANSCRIPTION_PROVIDER` / `LLM_PROVIDER`：默认均为 `mock`，便于 MVP 验收闭环。
- `DEEPSEEK_API_KEY` / `QWEN_API_KEY` / 钉钉、飞书、阿里云、腾讯转写密钥：真实 provider 上线前填写。
- `SEED_ON_START`：演示环境可用 `true`；正式部署必须在真实账号创建后改为 `false`。

### 数据库服务配置

MVP 第一版继续使用 SQLite。`docker-compose.yml` 中通过命名 volume 提供数据库持久化：

```text
sqlite-data -> /app/data/dev.db
private-storage -> /app/storage/private
```

后端容器启动时会执行：

```bash
npx prisma migrate deploy
npm run db:seed
```

后续若切换 PostgreSQL，需要同步调整 `backend/prisma/schema.prisma` 的 datasource provider、迁移文件和 `DATABASE_URL`，不能只替换 compose 中的数据库地址。

### Nginx 配置

`deploy/nginx/default.conf` 已预留：

- H5 静态文件托管。
- SPA fallback 到 `index.html`。
- `/api/` 反向代理到 `backend:3000`。
- `client_max_body_size 120m`，匹配当前音频上传上限。

正式域名、HTTPS 证书、访问日志和网关限流可在该配置基础上扩展。

### MVP 验收

完整手动验收路径见 [docs/mvp-acceptance.md](docs/mvp-acceptance.md)。该文档覆盖登录、首次隐私授权、Memory、音频上传、转写、默认生成、七大 Tab、主动生成、编辑保存、采纳 / 不采纳 / 重新生成、导出、智能回访转待办、删除录音审计、占位模块和小程序端构建。

本轮集成验收产物：

- [集成问题清单](docs/integration-issues.md)
- [本地运行说明](docs/local-run.md)
- [当前版本验收报告](docs/current-version-acceptance-report.md)

## 数据库

T01 已引入 Prisma 7 与 SQLite 本地开发数据库。默认环境变量仍使用：

```bash
DATABASE_URL=file:./dev.db
```

迁移与 seed：

```bash
npm run db:migrate
npm run db:seed
```

seed 会创建：

- 测试用户：`demo_doctor` / `demo_password`
- 测试门店：`宠一科技测试门店`

注意：如果本地项目路径包含中文、空格或特殊字符，Prisma 7 的 SQLite schema engine 可能对相对路径 `file:./dev.db` 报空错误。可临时使用绝对 SQLite URL 执行：

```bash
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-dev.db" npm run db:migrate
DATABASE_URL="file:/private/tmp/pet-doctor-ai-assistant-dev.db" npm run db:seed
```

数据库表与枚举说明见 [docs/database-schema.md](docs/database-schema.md)。

## 已实现接口

### GET /api/health

用途：后端服务健康检查。

请求参数：无。

成功响应示例：

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

### POST /api/auth/login

用途：Web 端账号密码登录。seed 用户可使用 `demo_doctor` / `demo_password` 登录。

请求示例：

```json
{
  "username": "demo_doctor",
  "password": "demo_password"
}
```

成功后返回 JWT token 和用户基础信息，不返回 `password_hash`。

### POST /api/auth/logout

用途：退出登录。当前第一版使用无状态 JWT，不做服务端 token 黑名单。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/auth/me

用途：返回当前登录用户信息。

认证：需要 `Authorization: Bearer <token>`。未登录、token 无效、token 过期或用户停用统一返回 `401 UNAUTHORIZED`。

### POST /api/auth/wechat-login

用途：小程序微信登录 mock。第一版直接接收 `openid` / `unionid`，可创建微信 mock 用户，也可通过 `userId` 绑定到已有用户。

### POST /api/auth/bind-wechat

用途：给当前登录用户绑定微信 mock 身份。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/ai/transcriptions

用途：调用当前 `TRANSCRIPTION_PROVIDER` 配置的转写抽象层。默认 `mock` provider 会返回示例转写文本，并写入 `ai_call_logs`。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/ai/generations

用途：调用当前 `LLM_PROVIDER` 配置的 LLM 抽象层。默认 `mock` provider 会按 `generationType` 返回结构化示例数据，并写入 `ai_call_logs`。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/memory

用途：读取当前用户绑定的个人 Memory 和待处理建议。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/memory/init

用途：首次初始化个人 Memory。字段包括城市、门店、岗位、个人背景、工作场景、常见任务、个人偏好，并生成固定 Markdown 模板。

认证：需要 `Authorization: Bearer <token>`。

### PUT /api/memory

用途：编辑并保存当前用户个人 Memory 的 Markdown 内容。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/memory/suggestions

用途：读取待处理建议；当请求体包含明确长期有效信息时，创建待确认的 Memory 更新建议。普通客户聊天、普通接诊沟通不会默认写入 Memory。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/memory/suggestions/{id}/accept

用途：接受待处理建议，并将建议内容写入当前用户个人 Memory。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/memory/suggestions/{id}/reject

用途：拒绝待处理建议，不修改 Memory。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/recordings/upload

用途：上传 MP3 / WAV / M4A 音频并创建录音记录。支持 `multipart/form-data` 的 `file` 字段、`audio/*` 原始请求体和 JSON `audioBase64`。

认证：需要 `Authorization: Bearer <token>`。

说明：不支持视频文件；文件大小和最长时长由 `MAX_AUDIO_SIZE_MB`、`MAX_AUDIO_DURATION_SECONDS` 控制；`audioUrl` 使用 `internal://...` 私有路径，不返回公开永久 URL。

### POST /api/recordings/start

用途：创建 `uploading` 状态的录音占位记录，用于前端录音开始。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/recordings/{id}/generate-default-results

用途：对已有 `transcriptText` 的录音生成默认 AI 结果。默认创建 6 条 `generation_results`：`summary`、`medical_record`、`communication_review`、`customer_profile`、`upsell_opportunities`、`smart_followup`。

认证：需要 `Authorization: Bearer <token>`。

说明：每个模块独立调用 LLM Provider、独立写入 `moduleStatus`，每次调用都会写入 `ai_call_logs`。生成结束后会尝试从结果中识别宠主姓名和宠物名并回写录音；识别不到则保持为空。

### POST /api/recordings/{id}/generate-risk-control

用途：主动生成医疗风险防控模块。该模块不在默认生成范围内，重复调用会创建新版本。

认证：需要 `Authorization: Bearer <token>`。

说明：内容必须作为 AI 辅助识别和提醒展示，并提示医生人工确认，不能表达为 AI 已完成风险判断。

### POST /api/recordings/{id}/generate-team-knowledge

用途：主动生成团队经验共享模块。该模块不在默认生成范围内，重复调用会创建新版本。

认证：需要 `Authorization: Bearer <token>`。

### PUT /api/generation-results/{id}

用途：编辑并保存生成结果的 `contentText` / `contentJson`，保存后 `status = saved`。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/generation-results/{id}/save

用途：保存生成结果正文，行为同 `PUT /api/generation-results/{id}`。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/generation-results/{id}/adopt

用途：采纳生成结果，写入 `generation_feedback`，并标记 `confirmedByUser = true`。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/generation-results/{id}/reject

用途：不采纳生成结果，写入 `generation_feedback`。请求体必须提交 `reason`，可选 `customReason`。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/generation-results/{id}/regenerate

用途：调用 LLM Provider 重新生成该结果，`version + 1`，`status = regenerated`，并写入 `generation_feedback action=regenerate`。

认证：需要 `Authorization: Bearer <token>`。

### DELETE /api/generation-results/{id}

用途：软删除当前用户生成结果，并写入 `audit_logs action=generation_result.delete`。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/audit-logs

用途：读取审计日志。第一版仅保留接口和 TODO，不向普通前端暴露。

认证：需要 `Authorization: Bearer <token>`；仅管理员、院长或开发环境可访问。

### POST /api/todos

用途：创建当前用户待办，可从智能回访结果传入 `recordingId` / `generationResultId` 建立关联。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/todos

用途：返回当前用户自己的待办列表。

认证：需要 `Authorization: Bearer <token>`。

### PUT /api/todos/{id}

用途：编辑当前用户待办的标题、描述、宠主、宠物、回访时间和状态。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/todos/{id}/complete

用途：将当前用户待办标记为 `completed`。

认证：需要 `Authorization: Bearer <token>`。

### DELETE /api/todos/{id}

用途：删除当前用户待办，并写入 `audit_logs action=todo.delete`。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/resources

用途：资源库占位接口，返回当前用户资源列表结构、占位状态和未来资源类型。

认证：需要 `Authorization: Bearer <token>`。

说明：T18 只保留 `resources` 数据结构与入口，暂不提供真实资源业务功能。

### GET /api/projects

用途：返回当前用户自己的项目列表。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/projects

用途：创建当前用户项目结构。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/projects/{id}

用途：返回当前用户项目详情、项目条目和未来关联能力提示。

认证：需要 `Authorization: Bearer <token>`。

### PUT /api/projects/{id}

用途：编辑当前用户项目基础信息。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/projects/{id}/items

用途：给当前用户项目新增条目结构，条目类型预留 `recording`、`conversation`、`file`、`resource`、`todo`、`memory`、`tool_output` 等。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/projects/{id}/items

用途：返回当前用户项目下的条目列表。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/director-dashboard

用途：院长看板占位接口，返回六个指标卡结构和“数据统计能力即将上线”提示。

认证：需要 `Authorization: Bearer <token>`。

说明：T18 不展示真实统计数据。

### POST /api/recordings/finish

用途：结束录音并写入音频文件，或将已有私有音频的录音状态更新为 `uploaded`。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/recordings

用途：返回当前用户自己的未删除录音列表。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/recordings/{id}

用途：返回当前用户某条录音详情，包括基础信息、转写文本、宠主 / 宠物绑定信息和生成结果列表。

认证：需要 `Authorization: Bearer <token>`。

### PUT /api/recordings/{id}

用途：编辑并保存当前用户某条录音的宠主姓名与宠物姓名。

认证：需要 `Authorization: Bearer <token>`。

### DELETE /api/recordings/{id}

用途：软删除当前用户录音，写入 `recordings.deleted_at` 和 `audit_logs`。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/recordings/{id}/retry

用途：将当前用户录音重置为可重试的 `uploaded` 状态，并清空错误信息。

认证：需要 `Authorization: Bearer <token>`。

### POST /api/recordings/{id}/transcribe

用途：对已上传音频的录音发起转写。第一版为请求内完成转写编排，不做实时转写；状态会从 `transcribing` 流转到 `uploaded`，失败时流转到 `failed` 并保留音频。

认证：需要 `Authorization: Bearer <token>`。

### GET /api/recordings/{id}/transcript

用途：读取录音转写文本、处理状态和错误信息。

认证：需要 `Authorization: Bearer <token>`。

### PUT /api/recordings/{id}/transcript

用途：手动编辑并保存录音转写文本，保存后录音保持为可生成的 `uploaded` 状态。

认证：需要 `Authorization: Bearer <token>`。

完整接口说明见 [docs/api.md](docs/api.md)。

## API 响应约定

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
    "message": "服务器内部错误"
  },
  "requestId": "request-id",
  "timestamp": "2026-05-29T00:00:00.000Z"
}
```

404 或运行时错误也会使用同一错误格式返回。

## 当前范围

- 已完成 monorepo 目录结构、uni-app H5 默认页面与微信小程序构建脚本预留。
- 已完成 Express API 服务、统一响应、统一错误处理、请求 ID 与 `GET /api/health`。
- 已完成 Prisma schema、第一版迁移文件、Prisma Client 生成配置与 seed。
- 已完成后端认证系统、JWT 当前用户上下文、Web 登录、退出、当前用户、微信登录 mock 和微信绑定接口。
- 已完成转写 Provider 抽象、LLM Provider 抽象、PromptVersion 映射、AICallLogger 与 mock 联调接口。
- 已完成个人 Memory 后端接口、初始化 Markdown 模板、编辑保存、AI 建议更新接受 / 拒绝流。
- 已完成 Web H5 登录页、登录守卫、主框架与固定侧边栏菜单；侧边栏按 PRD 顺序包含 `AI 搭档 / Memory`、`AI 录音 / 智能工牌`、`工具广场`、`资源库`、`项目空间`、`任务 / 待办`、`院长看板`、`设置 / 个人中心`。
- 已完成微信小程序三页 Tab 结构：`首页 / 工具广场`、`AI / 录音与结果`、`我的 / 个人中心`；小程序端登录对接 `POST /api/auth/wechat-login` mock，接口请求统一携带同一 JWT，业务数据继续按当前用户 ID 过滤。
- 小程序 AI 页已保留开始录音、上传音频、最近录音、录音详情和七个结果 Tab；小程序录音使用 `scope.record` 授权，代码和 `manifest.json` 已标注录音用途、同意录音和隐私要求。
- 已完成首次登录录音授权和隐私提示弹窗，用户确认后会在本地状态中记录，代码已预留后端用户字段扩展 TODO。
- 已完成 T20 异常处理和安全提示加固：Web H5 与小程序端对录音失败、上传失败、文件格式不支持、转写失败、AI 生成失败、导出失败、网络中断和登录过期提供明确提示与重新尝试入口；开始录音前会提示确认已取得沟通对象同意。
- 已完成 T20 审计加固：录音删除、待办删除、生成结果保存 / 采纳 / 不采纳 / 重新生成 / 软删除均写入 `audit_logs`，记录 `before_data` 与 `after_data`；`GET /api/audit-logs` 仅允许管理员、院长或开发环境访问，普通前端第一版不暴露入口。
- 已完成 T21 Docker 部署与 MVP 验收准备：提供后端 Dockerfile、H5 Nginx 静态部署、`docker-compose.yml`、SQLite 与私有文件 volume、Docker 环境变量模板、启动脚本和 `docs/mvp-acceptance.md` 手动验收路径。
- 已建立用户、门店、Memory、录音、AI 结果、反馈、待办、自建工具需求、项目、资源、审计日志、AI 调用日志等基础模型。
- 已实现录音 / 音频上传后端接口，音频文件使用本地私有目录存储，数据库只保存 `internal://...` 内部路径。
- 已完成录音转写流程编排、默认 AI 生成结果落库、结果反馈机制、智能回访转待办、Web 主操作界面、H5 第一版 PDF / 图片导出、资源库 / 项目空间 / 院长看板占位模块页面、微信小程序三页结构和 MVP Docker 部署准备；暂未实现真实转写服务、真实 LLM 服务、服务端导出留档能力、真实统计看板和小程序真实审核上线。
- 当前 uni-app Vue 3 依赖使用 npm `vue3` 版本线，并将 Vite 钉定为 `5.2.8` 以匹配官方 peer dependency。
- `npm install` 会提示部分上游依赖漏洞与 deprecated 包，当前暂不使用 `npm audit fix --force`，避免破坏 uni-app 版本线。

## 下一步任务

下一张任务卡建议进入小程序真机联调、真实 Memory suggestion 来源接入、真实 LLM / 转写 Provider 联调、服务端导出留档或项目 / 资源真实业务能力开发。

更多状态与日志见：

- [PROJECT_STATE.md](PROJECT_STATE.md)
- [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md)
- [docs/dev-notes.md](docs/dev-notes.md)
