# T25 服务器 Docker Compose 预发部署收口

更新时间：2026-06-07

## 阶段结论

服务器 Docker Compose 预发部署基础链路已打通。

本结论限定为“基础上线成功”：代码已在服务器以 Docker Compose 方式启动，前端 H5 与后端 API 通过公网 8080 端口可访问，后端健康检查返回 200 OK。该结论不等于“业务完整验收通过”，预发 H5 上传录音、HTTP 录音权限、真实 AI / 转写 provider、账号体系、数据库和备份策略仍需后续阶段继续收口。

## 当前版本信息

- GitHub 仓库：`https://github.com/jiao13082913399-gif/pet-doctor-ai-assistant-codex-.git`
- 当前稳定 tag：`v0.1.1-docker-mvp-local-verified`
- 当前稳定 commit：`de3c415 fix: stabilize docker mvp local startup`
- 部署方式：Docker Compose
- 前端：H5 静态构建，由 Nginx 托管并反代 `/api`
- 后端：Node.js + Express API，容器内健康检查
- AI provider：`mock`
- 转写 provider：`mock`
- 数据库：SQLite，Docker volume 持久化
- 演示账号：启用 demo seed，默认账号 `demo_doctor / demo_password`

## 服务器信息

- 服务器系统：Ubuntu 22.04
- Docker / Compose：已安装
- 云厂商防火墙：腾讯云防火墙已放行 8080
- H5 访问地址：`http://43.129.231.8:8080`
- API health 地址：`http://43.129.231.8:8080/api/health`

## 已完成部署步骤

1. 在服务器安装 Docker 与 Docker Compose。
2. 从 GitHub 仓库拉取项目代码。
3. checkout 到稳定版本 `v0.1.1-docker-mvp-local-verified / de3c415`。
4. 配置服务器私有环境变量，当前为 mock AI、mock 转写、SQLite、demo seed。
5. 使用 Docker Compose 构建并启动 backend / frontend。
6. 确认 backend 健康状态为 healthy。
7. 确认 frontend 容器处于 running。
8. 在腾讯云侧放行 8080 端口。
9. 通过公网访问 H5 与 API health。

## 验证结果

| 验证项        | 结果 | 说明                                                                        |
| ------------- | ---- | --------------------------------------------------------------------------- |
| backend 容器  | 通过 | 已知服务器状态为 healthy                                                    |
| frontend 容器 | 通过 | 已知服务器状态为 running                                                    |
| API health    | 通过 | 2026-06-07 非沙箱实测 `GET http://43.129.231.8:8080/api/health` 返回 200 OK |
| H5 访问       | 通过 | 已知 `http://43.129.231.8:8080` 可访问                                      |
| 服务停止      | 通过 | 已知 Docker Compose 服务可停止                                              |
| 服务重启      | 通过 | 已知 Docker Compose 服务可重启                                              |

本次公网 health 响应摘要：

```text
HTTP/1.1 200 OK
server: nginx/1.27.5
access-control-allow-origin: http://43.129.231.8:8080
{"success":true,"data":{"status":"ok","service":"pet-doctor-ai-assistant-api"}}
```

## 当前已知问题

- HTTP 非安全上下文会导致浏览器录音能力不可用，“开始录音不可用”不在 T26 内硬修，后续 T27 配 HTTPS 后再验证。
- “上传录音按钮无反应”尚未收口，归入 T26 预发 H5 功能调试。
- 当前仍为 mock AI provider，不能代表真实大模型效果、延迟、费用和错误处理。
- 当前仍为 mock 转写 provider，不能代表真实转写准确率、耗时和音频兼容性。
- 当前仍使用 demo 账号，不适合作为正式业务账号体系。
- 当前仍使用 SQLite，适合 MVP / 预发，不适合多人长期生产使用。
- 上传录音文件保留、备份、恢复和清理策略尚未正式固化。

## 风险分级

### P0

- 若公网 API health 不可达、backend 非 healthy 或 frontend 未 running，应优先恢复基础访问链路。
- 若 Docker volume、SQLite 数据文件或上传文件被误删，会影响预发数据与验收样本，禁止未经授权清理。

### P1

- HTTP 环境导致录音不可用，需要 T27 通过域名 + HTTPS 解决。
- 上传录音按钮无反应会阻断 H5 上传链路，需要 T26 单独排查。
- demo seed 与 demo 账号不能进入正式业务使用状态。
- mock provider 不能用于真实诊疗辅助评估。
- SQLite 与上传文件缺少正式备份策略，部署更新前需要先备份。

### P2

- 8080 端口直出适合预发基础验收，后续建议通过域名 + HTTPS + 80/443 统一访问。
- 日志、证书续期、监控告警、访问限流和异常审计仍需要后续完善。
- CORS、`VITE_API_BASE_URL`、微信 / 小程序合法域名需要在域名确定后统一校准。

## 常用运维命令

以下命令需在服务器项目目录执行。

查看 Git 版本：

```bash
git status --short
git rev-parse --short HEAD
git describe --tags --always
```

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

持续查看日志：

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

健康检查：

```bash
curl http://127.0.0.1:8080/api/health
curl http://43.129.231.8:8080/api/health
```

停止服务：

```bash
docker compose down
```

重启服务：

```bash
docker compose up -d
docker compose ps
curl http://127.0.0.1:8080/api/health
```

重新构建并启动：

```bash
docker compose build
docker compose up -d
docker compose ps
```

## 备份建议

当前预发涉及两类需要重点保护的数据：

- SQLite volume：保存用户、录音记录、转写文本、AI 生成结果、待办、审计日志等数据库数据。
- `private-storage` 上传文件 volume：保存录音音频等私有文件。

建议在每次预发部署更新前执行：

1. 确认当前 Git 版本与容器状态。
2. 备份 SQLite volume 对应的数据文件。
3. 备份 `private-storage` 上传文件目录或 volume。
4. 记录备份时间、服务器路径、备份文件名和对应 commit。
5. 完成部署后执行 health check 和上传链路最小验证。

禁止在未授权情况下执行 `docker compose down -v`、删除 Docker volume、清空 SQLite 或删除上传文件。

## 后续阶段

- T26：预发 H5 功能调试，只排查和修复“上传录音按钮无反应”，不硬修 HTTP 录音限制。
- T27：域名 + HTTPS 准备与实施前方案，用于解决 HTTP 非安全上下文导致的录音不可用问题。
- T28：真实 AI / 转写 provider 接入前评估，先评估代码、env、接口、成本、日志和风险，不直接切真实 provider。
