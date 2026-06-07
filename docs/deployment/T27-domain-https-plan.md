# T27 域名 + HTTPS 准备与实施前方案

更新时间：2026-06-07

## 阶段结论

建议使用域名 + HTTPS。

原因：当前预发地址为 `http://43.129.231.8:8080`，HTTP 属于非安全上下文，现代浏览器会限制麦克风等敏感能力，导致“开始录音”不可用。上传本地音频可以通过 T26 的文件上传入口继续验证，但真实录音能力需要 HTTPS 后再完整复测。

推荐访问形式：

```text
https://子域名
```

示例：

```text
https://ai.example.com
```

## 当前状态

- 当前 H5：`http://43.129.231.8:8080`
- 当前 API health：`http://43.129.231.8:8080/api/health`
- 当前 Docker Compose 暴露端口：`8080:80`
- 当前 H5 API 配置：`VITE_API_BASE_URL=/api`
- 当前后端 CORS 配置：`CORS_ORIGIN` 来自 `deploy/docker.env`
- 当前 provider：mock AI / mock 转写
- 当前数据库：SQLite
- 当前账号：demo seed

## 需要用户提供或授权的信息

实施 HTTPS 前，需要确认：

- 域名：计划使用哪个主域名或子域名。
- DNS 管理平台：腾讯云 DNS、阿里云 DNS、Cloudflare 或其他。
- 备案状态：域名是否已完成中国大陆服务器访问所需备案。
- DNS 解析授权：是否允许将子域名 A 记录解析到 `43.129.231.8`。
- 端口授权：是否允许在腾讯云防火墙 / 安全组开放 80 和 443。
- 服务器访问授权：SSH root 密码或 SSH key。
- HTTPS 方案授权：是否使用服务器层 Nginx + Let's Encrypt。
- 部署窗口：是否允许在预发环境短暂重启 Nginx 或 Docker Compose。

未获得以上信息和授权前，不执行 DNS 修改、证书申请、80/443 开放或线上配置变更。

## 推荐方案

### 方案 A：服务器层 Nginx 反代到 `localhost:8080`

推荐优先采用该方案。

结构：

```text
用户浏览器
  -> https://子域名
  -> 服务器 Nginx 80/443
  -> http://127.0.0.1:8080
  -> Docker Compose frontend Nginx
  -> /api 反代到 backend:3000
```

优点：

- 保持现有 Docker Compose 改动最小。
- 当前 compose 继续使用 `8080:80`。
- 证书、HTTPS、80/443、域名跳转集中在服务器层 Nginx 管理。
- 后续可继续在服务器层增加访问日志、限流、basic auth、IP 白名单或灰度策略。

需要调整：

- DNS：子域名 A 记录指向 `43.129.231.8`。
- 云防火墙：开放 80 / 443。
- 服务器：安装或启用 Nginx。
- 证书：使用 Let's Encrypt / Certbot 申请证书。
- Nginx：配置 80 跳转 443，443 反代到 `http://127.0.0.1:8080`。
- 后端 env：`CORS_ORIGIN=https://子域名`。
- 前端 build：继续保持 `VITE_API_BASE_URL=/api`。

### 方案 B：调整 Docker Compose 直接暴露 80/443

结构：

```text
用户浏览器
  -> https://子域名
  -> Docker Compose frontend / Nginx 80/443
  -> /api 反代到 backend:3000
```

优点：

- HTTPS 配置可以随项目 Docker 化。
- 本地和服务器配置更接近。

缺点：

- 需要改造 compose、Nginx 配置、证书挂载和续期策略。
- 证书文件和私钥挂载必须非常谨慎，不能进入 Git。
- 对当前已跑通的 `8080:80` 预发链路改动更大。

当前阶段不建议优先采用该方案，除非后续明确要把网关层完全容器化。

## 推荐实施步骤

以下步骤需要服务器访问权限、域名和端口授权后才能执行。

1. 确认域名、备案和 DNS 管理权限。
2. 在 DNS 平台添加子域名 A 记录，指向 `43.129.231.8`。
3. 在腾讯云防火墙 / 安全组开放 80 和 443。
4. SSH 登录服务器，确认当前 Docker Compose 服务健康：

```bash
docker compose ps
curl http://127.0.0.1:8080/api/health
```

5. 备份 SQLite volume 与 `private-storage` 上传文件。
6. 安装或确认服务器层 Nginx 可用。
7. 配置 Nginx 反代：

```text
server {
  listen 80;
  server_name 子域名;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

8. 使用 Let's Encrypt / Certbot 申请 HTTPS 证书。
9. 启用 80 到 443 跳转。
10. 更新服务器 `deploy/docker.env`：

```bash
CORS_ORIGIN=https://子域名
VITE_API_BASE_URL=/api
```

11. 重新构建并启动 Docker Compose。
12. 验证：

```bash
curl https://子域名/api/health
```

13. 浏览器打开 `https://子域名`，验证登录、上传录音、开始录音、转写和默认生成。

## 关键配置说明

### `CORS_ORIGIN`

HTTPS 上线后必须改为真实访问源：

```bash
CORS_ORIGIN=https://子域名
```

如果继续保留 `http://43.129.231.8:8080`，HTTPS 域名访问 API 时可能触发 CORS 错误。

### `VITE_API_BASE_URL`

推荐继续保持：

```bash
VITE_API_BASE_URL=/api
```

这样 H5 页面和 API 在同一个 HTTPS 域名下，减少跨域和 mixed content 风险。

### 微信 / 小程序合法域名

如果后续要进入微信小程序真实联调，需要将 HTTPS API 域名加入微信公众平台 / 小程序后台的合法域名配置。HTTP IP + 8080 不适合作为正式小程序 API 域名。

## 风险与注意事项

### P0

- 不得提交证书、私钥、服务器 `.env`、pem、key、crt 文件到 Git。
- 未备份 SQLite volume 和 `private-storage` 前，不执行可能影响数据的部署动作。
- DNS 或证书配置错误可能导致预发 H5 无法访问，需要保留回滚路径。

### P1

- 证书续期需要验证自动续期任务是否生效。
- 中国大陆服务器访问域名可能受备案状态影响。
- `CORS_ORIGIN` 未同步到 HTTPS 域名会导致浏览器 API 请求失败。
- 如果 H5 内仍引用 HTTP API，会触发 mixed content 或安全上下文问题。
- 云防火墙未开放 80 / 443 会导致证书申请或 HTTPS 访问失败。

### P2

- 80/443 上线后，8080 是否继续对外开放需要后续决策。
- 服务器层 Nginx 与容器内 Nginx 会形成两层代理，后续日志字段和真实 IP 需要统一。
- 后续接入真实 provider 后，还需要额外关注请求超时、费用和脱敏日志。

## 暂停点

当前未提供域名、DNS 授权、80/443 开放授权和服务器 SSH 信息，因此 T27 只完成方案文档。

如需继续实施 HTTPS，请先提供：

- 要使用的域名或子域名。
- DNS 管理平台和操作授权方式。
- 是否已备案。
- 是否允许解析到 `43.129.231.8`。
- 是否允许开放 80 / 443。
- 是否使用服务器层 Nginx + Let's Encrypt。
- 服务器 SSH root 密码或 SSH key。
