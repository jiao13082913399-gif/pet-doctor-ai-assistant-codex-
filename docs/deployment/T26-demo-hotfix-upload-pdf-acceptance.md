# T26 演示前缺陷热修复与验收报告（录音上传 / PDF 导出）

修复时间：2026-06-08

## 基本信息

- 线上地址：http://43.129.231.8:8080
- demo 账号：demo_doctor
- 当前密码：demo_password
- 权威仓库：`pet-doctor-ai-assistant-codex-`（GitHub origin/main）
- 修改 commit：`2dee50b`

## 本次修复的问题

1. 录音无法上传：在「AI 录音 / 智能工牌」新建/上传录音时，点击「上传录音」无法弹出文件选择器，无法完成上传。
2. PDF 导出后打不开：PDF 可以触发导出，但导出的文件无法打开。

## 根因说明

### 问题 1：H5 文件上传入口问题

模板中使用的 `<input type="file">` 在 uni-app H5 编译产物中被编译为 uni-app 的 `<uni-input>` 文本输入组件，而不是原生 HTML 文件输入框。结果：

- 页面 DOM 中实际不存在 `input[type=file]`；
- 点击「上传录音」不会弹出系统文件选择器；
- `change` 事件回调拿到的 `event.target.files` 始终为 undefined。

后端 multipart 上传接口、本地存储写入、转写与默认生成链路经 curl 实测均正常，确认该问题为前端文件选择入口问题，非后端问题。

### 问题 2：PDF 下载 Blob 回收过早问题

前端 `downloadBlob` 在创建 `<a>` 后，`link.click()` 之后**同步**调用了 `URL.revokeObjectURL(url)`，且 `<a>` 元素未挂载到 DOM。在部分移动端 / 微信 H5 浏览器中，下载尚未开始读取 Blob，对象 URL 就被回收，导致保存下来的 PDF 为 0 字节 / 损坏文件，从而「打不开」。

PDF 字节本身经结构校验有效（`%PDF-1.4`、xref 偏移逐对象校验、`%%EOF`、catalog + image 齐全），因此问题出在下载环节而非 PDF 生成内容。

## 修复方式

- 前端改用原生 file input：移除模板中的 `<label>` + `<input type="file">`（会被编译成 uni-input），改为普通按钮；在 H5 通过 `document.createElement('input')` 创建真正的原生文件输入并在用户手势内触发，选中后复用既有上传逻辑。
- PDF 下载改为挂载 DOM 并延迟 revokeObjectURL：`<a>` 先 `appendChild` 到 `document.body`（隐藏样式），点击后通过 `setTimeout` 延迟约 1 秒再 `removeChild` 并 `URL.revokeObjectURL`，避免下载被提前截断。

仅修改一个文件：`frontend/src/pages/index/index.vue`。未改动后端、数据库 schema、构建/部署配置或业务逻辑。

## 部署动作

- 线上仓库由游离 HEAD（旧提交）切换到 `main`（= `2dee50b`）；
- 只重建 frontend 镜像并重建 frontend 容器（`docker compose build frontend` + `up -d --no-deps frontend`）；
- backend 未重启（本次仅前端改动，无需重启后端）；
- 数据卷（SQLite、私有录音存储）未改动，无数据删除；
- demo 账号密码未改动。

## 验收结果

本地验收（修复前置验证）：prettier、前后端 typecheck、后端 build、H5 build、`scripts/mvp-smoke-test.ts` 全部通过；preview 浏览器端到端验证上传与 PDF 导出通过。

线上自动化验证：

- `/api/health`：通过（HTTP 200）；
- demo 登录：通过；
- 录音上传（线上后端 multipart 实测）：通过，文件落盘、列表读回正常；
- 线上前端分包已包含两处修复代码（原生 file input + 延迟 revoke）。

线上人工复验：

- 登录：通过；
- 录音选择窗口：通过；
- 录音上传：通过；
- 上传后读回：通过；
- PDF 下载：通过；
- PDF 打开：通过；
- 无白屏、无报错、无卡顿。

## 安全收尾

- 部署期间临时加入服务器 `ubuntu` 用户的部署 SSH 公钥（标记 `claude-deploy-petai`）已移除；
- 已验证 `authorized_keys` 中不再包含该公钥，且该密钥已无法再登录服务器；
- 本机对应的临时部署密钥对亦已删除；
- 全程未输出 token、密钥、私钥或真实 `.env` 内容。

## 结论

T26 演示前两个阻断缺陷（录音无法上传、PDF 导出打不开）已修复并部署上线，线上人工复验全部通过，可正式关闭。
