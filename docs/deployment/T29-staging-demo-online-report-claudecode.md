# T29 预发 Demo 上线验收记录（Claude Code · Staging Demo Online Report）

> **来源标注**：本文档由 **Claude Code** 独立生成与公网验收，区别于本仓库其他由 Codex 生成的部署文档（如 `T25-server-preview-deployment-acceptance.md`、`T26`~`T28`）。与现有 T25 互为印证、独立归档，不替代、不合并。
>
> 本文档为「线上结果固化」记录，仅作存档与版本一致性追踪用途。
> 不含任何 token / JWT_SECRET / 私钥 / `.env` 真实内容。文中 demo 口令为**非敏感测试账号口令**，仅用于公开 demo 验收。

---

## 1. 基本信息

| 项目 | 内容 |
| --- | --- |
| 部署时间（验收完成） | 2026-06-07（UTC，验收请求时间约 10:23Z） |
| 服务器 IP | `43.129.231.8`（腾讯云 CVM） |
| 公网访问地址 | http://43.129.231.8:8080 |
| 部署方式 | Docker + docker compose（backend + frontend/Nginx） |
| 访问入口 | 前端 Nginx 托管 H5 静态资源 + 反代 `/api` → backend |
| 对外端口 | TCP 8080（腾讯云安全组已放行 `0.0.0.0/0`） |

### Demo 账号

| 字段 | 值 | 说明 |
| --- | --- | --- |
| 用户名 | `demo_doctor` | seed 创建 |
| 当前可登录密码 | `demo_password` | **线上实际 seed 默认口令**（非 `demo123456`，见第 4 节差异说明） |
| 角色 / 职位 | doctor / 主治医生 | |
| 所属门店 | 宠一科技测试门店 | seed 创建 |

---

## 2. 验收结果（全部通过 ✅）

| 验收项 | 方法 | 结果 |
| --- | --- | --- |
| `/api/health` | `GET http://43.129.231.8:8080/api/health` | ✅ 公网 HTTP 200，返回 `{"status":"ok","service":"...api"}` |
| H5 页面 | `GET http://43.129.231.8:8080/` | ✅ 公网 200，标题「宠物医生 AI 医助」，静态资源（uni.css / index.js）均 200 |
| demo 登录 | `POST /api/auth/login` `{demo_doctor / demo_password}` | ✅ `success:true`，返回 token |
| `/api/auth/me` | `GET /api/auth/me` (Bearer) | ✅ `success:true`，返回完整用户信息（demo_doctor / doctor / 主治医生） |
| 核心闭环 - 写 | `POST /api/projects` `{name:"验收测试病例"}` | ✅ 创建成功，返回 project id |
| 核心闭环 - 读回 | `GET /api/projects` (Bearer) | ✅ 列表中可见刚创建的病例 |

> 备注：验收过程中创建了一条名为「验收测试病例」的测试 project（demo 数据，无害）。当前业务接口无 delete 路由，如需清理可在服务器侧按需处理。

---

## 3. 容器与运行状态

| 组件 | 状态 |
| --- | --- |
| backend | healthy（`/api/health` 公网 200） |
| frontend | running（Nginx 托管 H5 + 反代 `/api`） |
| 数据卷 | SQLite 持久化（`DATABASE_URL=file:/data/app.db`，挂载命名卷） |
| 日志策略 | json-file 驱动，单文件 10MB × 5（自动滚动，避免占满磁盘） |
| 密钥安全 | 未输出任何 token / JWT_SECRET / 私钥 / `.env` 内容到日志或仓库 |

---

## 4. ⚠️ 版本一致性事实（线上来自**另一个 GitHub 仓库**，已回传且已打 tag）

**关键事实（经服务器 git 盘点确认）：线上代码与本次 Goal 最初指定的 `claude-code-AI-` 仓库不是同一份，而是来自另一个独立仓库，且该版本已 push、已打 tag、工作区干净。**

| 维度 | 最初指定仓库 `claude-code-AI-` `v0.1.0-beta`（commit 73d3435） | 线上实际运行版本 |
| --- | --- | --- |
| GitHub 仓库 | `jiao13082913399-gif/claude-code-AI-` | **`jiao13082913399-gif/pet-doctor-ai-assistant-codex-`** |
| 线上 commit / tag | — | **`de3c415`，tag `v0.1.1-docker-mvp-local-verified`（= origin/main = origin/HEAD）** |
| ORM / DB 驱动 | Prisma 5 + 默认 SQLite | Prisma 7 + `@prisma/adapter-better-sqlite3` + better-sqlite3 |
| 模块体系 | CommonJS | ESM（`"type":"module"`） |
| 密码 hash | `bcryptjs` | Node 内置 `crypto.scrypt`，格式 `scrypt$<saltHex>$<derivedKeyHex>` |
| seed 默认密码 | `demo123456` | `demo_password` |
| seed 门店名 | 示范宠物医院（测试店） | 宠一科技测试门店 |

**结论修正：** 之前担心的「线上代码未回传 GitHub」**不成立**。线上代码已经在 GitHub 仓库 `pet-doctor-ai-assistant-codex-` 中（`de3c415` = origin/main，且已打 tag `v0.1.1-docker-mvp-local-verified`）。真正的"不一致"是：**线上用的是 codex 仓库，而非 Goal 最初写的 `claude-code-AI-` 仓库**——这是两个不同的 GitHub repo。`claude-code-AI-`（及本地 `~/pet-ai-assistant`）停留在旧版 `v0.1.0-beta`，与线上无关。

---

## 5. 线上服务器代码状态盘点

> 本机（开发机）无法通过本地私钥 SSH 直连服务器（公钥未绑定到 authorized_keys），以下服务器侧 git 信息需在腾讯云网页终端执行采集命令获取后回填。

### 服务器侧（已采集，目录 `/home/ubuntu/apps/pet-doctor-ai-assistant`）

| 项目 | 值 |
| --- | --- |
| 当前目录 | `/home/ubuntu/apps/pet-doctor-ai-assistant` |
| git status | `HEAD detached at v0.1.1-docker-mvp-local-verified`，`nothing to commit, working tree clean` |
| remote | `origin → https://github.com/jiao13082913399-gif/pet-doctor-ai-assistant-codex-.git`（fetch & push 同一地址） |
| 最新 commit | `de3c415 fix: stabilize docker mvp local startup`（= `HEAD` = `tag v0.1.1-docker-mvp-local-verified` = `origin/main` = `origin/HEAD` = `main`） |
| 历史 | `5a5d017 chore: harden docker deployment config` / `1981bd7 (tag v0.1.0-mvp-baseline) chore: establish MVP integration baseline` |
| 未提交变更 | 0 |
| 被 git 跟踪的 .env 类文件 | 仅 `.env.example`、`deploy/docker.env.example`（均为 **模板**，非真实密钥） |
| .gitignore | 已忽略 `.env` / `.env.*` / `backend/.env` / `frontend/.env`（真实 .env 不会被跟踪） |
| 结论 | **线上干净、已 push、已打 tag、无 .env 泄露风险**；可安全作为权威版本 |

### 本地开发机仓库状态（已采集）

| 项目 | 值 |
| --- | --- |
| 路径 | `~/pet-ai-assistant` |
| 分支 | `main`（与 `origin/main` 同步，工作区干净） |
| remote | `origin → https://github.com/jiao13082913399-gif/claude-code-AI-.git`（**与线上是不同的 repo**） |
| 最新 commit | `73d3435 chore: initial commit — v0.1.0-beta MVP + staging deployment config` |
| 结论 | **本地 = 旧版、且属于另一个仓库（claude-code-AI-）**；与线上 codex 仓库无关，不能用于覆盖线上 |

---

## 6. 后续建议（仅建议，未执行）

1. **无需新建 tag**：线上 commit `de3c415` 已经打了 tag `v0.1.1-docker-mvp-local-verified` 并 push 到 `pet-doctor-ai-assistant-codex-`。该 tag **已足以作为线上固化版本**，直接沿用即可，**不必再造 `v0.1.1-beta-online`**（重复打 tag 只会增加噪音）。
   - 如确实想要带「online」语义的别名，可后续对同一 commit 追加一个**注解 tag**（如 `git tag -a v0.1.1-online de3c415`），但这是可选项、非必要。
2. **统一"权威仓库"认知**：明确线上权威仓库是 `pet-doctor-ai-assistant-codex-`（非 `claude-code-AI-`）。建议把 `claude-code-AI-` 标注为「早期 v0.1.0-beta 归档」，避免后续按错仓库部署。
3. **本地 SSH 直连**：如需用本地终端运维，需在腾讯云控制台把本机公钥（指纹 `SHA256:ZZasUcn+...`）写入服务器 `authorized_keys`。
4. **demo 口令统一（可选）**：若希望对外统一用 `demo123456`，可在网页终端用 scrypt 格式（同线上算法）重置 demo_doctor 密码；当前 `demo_password` 已可正常登录，非阻断项。

---

## 7. 一句话结论

Demo 已正式上线、外部浏览器可访问（http://43.129.231.8:8080），8 项验收标准全部通过。线上代码**已**在 GitHub（仓库 `pet-doctor-ai-assistant-codex-`，commit `de3c415`，tag `v0.1.1-docker-mvp-local-verified`），干净、已 push、无 .env 泄露风险——**版本已固化，无需新建 tag，沿用现有 tag 即可**。唯一需澄清的是：线上权威仓库是 codex 仓库，而非 Goal 最初指定的 `claude-code-AI-`。
