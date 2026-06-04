# 当前版本验收报告

验收日期：2026-06-04

当前版本：`T21 Docker 部署与 MVP 验收 + 集成验收收口复核`

## 集成结论

当前 AI 医助 Web + 小程序项目已经整合为一个可运行、可测试、可部署的 MVP。前端、后端、数据库 schema、API 类型、环境变量模板、Docker 部署文件和核心业务链路均位于同一 monorepo 中，`T00` 至 `T21` 的代码没有发现阻断 MVP 的重复路由或冲突 API。

2026-06-04 复核新增一个 P1 修复：根 `.gitignore` 补充 SQLite 本地数据库文件忽略规则，避免 `backend/dev.db` 这类本地验收数据误提交。旧版嵌套生成结果 API 与顶层 API 属于兼容并存，未发现同 method 同 path 冲突，列为 P2 技术债。

## 项目结构识别

- 前端：`frontend/`，uni-app + Vue 3 + TypeScript，H5 与微信小程序页面位于 `frontend/src/pages`。
- 后端：`backend/`，Express + TypeScript，入口为 `backend/src/app.ts` 和 `backend/src/server.ts`。
- 数据库：`backend/prisma/schema.prisma`、`backend/prisma/migrations/20260529030855_init_schema/migration.sql`。
- API 类型：`backend/src/types/api.ts`、`frontend/src/types/mini-api.ts`、`frontend/src/utils/api.ts`。
- 环境变量：`.env.example`、`deploy/docker.env.example`，本地后端会读取根 `.env` 和运行目录 `.env`。
- 部署文件：`backend/Dockerfile`、`frontend/Dockerfile`、`docker-compose.yml`、`deploy/nginx/default.conf`、`backend/docker-entrypoint.sh`。
- 本地运行产物：`backend/dist`、`frontend/dist`、`backend/dev.db` 均已被 `.gitignore` 忽略，不属于交付源码。

## 21 张任务卡整合状态

已完成并接入主项目：

- `T00-T04`：工程骨架、数据库、认证、AI provider、Memory。
- `T05-T10`：录音上传、转写、默认生成、主动生成、结果反馈、智能回访转待办。
- `T11-T17`：Web H5 主框架、隐私提示、录音页面、结果详情、七大 Tab、PDF / 图片导出、工具广场 / 自建工具。
- `T18-T21`：占位模块、小程序三页结构、异常处理 / 审计 / 安全提示、Docker 部署与 MVP 验收。

## 核心链路验证

自动 smoke 已通过以下后端 API 链路：

登录 -> Memory 初始化 -> 音频上传 -> 转写 -> 前五项业务模块加摘要默认生成 -> 主动生成第六 / 第七模块 -> 七个 Tab 数据存在 -> 编辑保存 -> 采纳 -> 不采纳 -> 重新生成 -> 智能回访转待办 -> 待办列表 -> 历史记录。

H5 PDF / 图片导出属于浏览器下载能力，本轮自动 smoke 验证了病历和客户画像导出所需数据源存在；H5 build 与 dev server 启动均通过。

## 2026-06-04 验证记录

- 运行时：Codex bundled Node `v24.14.0` 可用，满足 Node.js >= 20；当前 shell 无 `npm` / `npx`，未能重放 `npm install`。
- 依赖状态：仓库已有 `node_modules`，本轮使用明确 Node 路径直接调用 `prettier`、`tsc`、`vue-tsc`、`uni`、`tsx`。
- `prettier --check .`：通过。
- `tsc -p backend/tsconfig.json --noEmit`：通过。
- `vue-tsc -p frontend/tsconfig.json --noEmit`：通过。
- `tsc -p backend/tsconfig.json`：通过。
- `uni build -p h5`：通过，有 Sass legacy JS API warning，不阻断。
- `uni build -p mp-weixin`：通过，有 Sass legacy JS API warning，不阻断。
- `scripts/mvp-smoke-test.ts`：通过。沙箱内首次因 `listen EPERM 127.0.0.1` 被本地端口限制阻断，非沙箱重跑通过。
- SQLite fallback init + seed：通过，临时数据库为 `/private/tmp/pet-doctor-ai-assistant-integration-start.db`。
- 后端从零启动：使用临时 SQLite，`PORT=3010` 启动通过，`GET /api/health` 与 `POST /api/auth/login` 均返回成功。
- H5 dev server：`http://localhost:5173/` 启动成功，首页 `HEAD /` 返回 `200 OK`。
- Docker 实机启动：当前 shell 无 `docker` 命令，未能重放 `docker compose up --build`；部署文件已完成静态检查。

## MVP 验收结论

当前版本可作为本地可运行、可测试、可部署的 MVP 基线。P0 无新增阻断项，P1 已优先处理，P2 均为非阻断记录项。上线前仍需补真实转写 Provider、真实 LLM Provider、真实微信登录和 Docker 实机环境复测。
