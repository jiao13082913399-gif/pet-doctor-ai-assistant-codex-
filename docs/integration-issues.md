# 集成问题清单

验收日期：2026-06-04

验收范围：`T00` 至 `T21` 当前 MVP 代码，覆盖前端 H5、微信小程序页面结构、后端 API、Prisma / SQLite、本地启动、Docker 部署脚本和核心业务链路。

## P0

### 已修复：Docker 启动 seed 会引用未复制的 `backend/src`

- 现象：`backend/Dockerfile` 的 runner 阶段只复制 `backend/dist` 和 `backend/prisma`，但 `backend/prisma/seed.ts` 原先引用 `../src/services/password.js`。容器启动执行 seed 时会找不到源文件。
- 影响：Docker MVP 首次启动无法稳定创建 `demo_doctor / demo_password`，直接阻断部署验收。
- 修复：`backend/prisma/seed.ts` 已改为自包含 scrypt hash 逻辑，避免运行期依赖 `src`。

### 已修复：Prisma SQLite 迁移命令在当前环境空报 `Schema engine error`

- 现象：`prisma migrate dev` / `prisma migrate deploy` 在当前本地环境对 SQLite 空报 `Schema engine error`，即使用绝对 `DATABASE_URL` 也失败。
- 影响：从零初始化数据库会卡住，Docker entrypoint 也可能被迁移阶段阻断。
- 修复：新增 `backend/prisma/sqlite-init.ts`，可执行已签入迁移 SQL 并写入 `_prisma_migrations` 记录；`backend` 的 `db:migrate` 和 Docker entrypoint 均已增加 Prisma 优先、失败后 SQLite SQL 兜底。

## P1

### 已修复：缺少自动化 smoke test

- 现象：根脚本没有 `test`，历史验收依赖手动记录，不能持续确认 21 张任务卡是否已经接成闭环。
- 影响：后续小改动容易打断登录、录音、转写、生成、反馈、待办、历史记录等主链路。
- 修复：新增 `scripts/mvp-smoke-test.ts`，并增加根脚本 `test` / `smoke:mvp`。测试使用临时 SQLite 和临时私有存储，真实启动 Express app 并走 HTTP API。

### 已修复：缺少 lint / 格式检查入口

- 现象：根脚本没有 `lint`，且本轮 Prettier 检查发现 17 个文件格式不一致。
- 影响：不阻断运行，但会影响后续集成可读性和代码评审稳定性。
- 修复：新增根脚本 `lint: prettier --check .`，并已格式化相关 TS / Vue / Markdown 文件。

### 已处理：本地默认端口可能冲突

- 现象：验收时 `PORT=3000` 已被本机占用。
- 影响：默认启动命令可能失败。
- 处理：本轮实际后端启动验收使用 `PORT=3010` 通过；本地运行说明已补充端口冲突时的替代命令。

### 已修复：本地 SQLite 数据库文件未显式忽略

- 现象：工作区存在 `backend/dev.db`，但根 `.gitignore` 原先没有显式忽略 `*.db`、`*.sqlite`、`*.sqlite3` 等本地数据库文件。
- 影响：不影响运行，但存在把本地验收数据或开发数据误提交进仓库的风险。
- 修复：根 `.gitignore` 已补充 SQLite 数据库和 journal 文件忽略规则，`backend/dev.db` 已确认被忽略。

## P2

### 记录：当前 Codex shell PATH 无 `npm` / `npx`，Docker 命令不可用

- 现象：本轮环境 `npm install` 无法直接执行，`npm` / `npx` 命令不可用；`docker` 命令也不可用。但仓库 `node_modules` 已存在，Codex bundled Node 可执行。
- 影响：这是当前执行环境问题，不是项目代码问题。普通开发机仍应使用 README 中的标准 npm / Docker 命令。

### 记录：旧版嵌套生成结果 API 仍保留兼容

- 现象：后端同时存在顶层 `/api/generation-results/{id}` 系列接口，以及旧版兼容的 `/api/recordings/{id}/generation-results/{resultId}` 系列接口。
- 影响：没有同 method 同 path 冲突，前端与 smoke test 均使用顶层接口；但长期看会增加维护面。
- 建议：MVP 不删除旧接口。后续稳定后可标记 deprecated，再按兼容窗口移除或统一到顶层接口。

### 记录：真实转写、真实 LLM、小程序真实微信登录仍是 MVP 外部能力

- 现象：当前 `TRANSCRIPTION_PROVIDER=mock`、`LLM_PROVIDER=mock` 是默认验收配置；微信小程序登录也是 mock openid。
- 影响：不影响 MVP 闭环验收，但上线前需要接真实 provider、密钥、错误重试和费用监控。

### 记录：Sass legacy JS API deprecation warning

- 现象：H5 / 小程序构建时出现 Dart Sass legacy JS API warning。
- 影响：当前不阻断构建，属于上游依赖升级提醒。

### 记录：H5 导出为前端下载能力，自动 smoke 只覆盖数据源

- 现象：自动 smoke 验证了病历和客户画像导出所需数据存在，但没有在浏览器中自动点击下载 PDF / PNG。
- 影响：MVP 当前可接受；后续可用浏览器自动化补充下载断言。
