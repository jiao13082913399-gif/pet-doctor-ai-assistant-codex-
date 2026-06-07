# T26 预发 H5 上传录音功能调试

更新时间：2026-06-07

## 问题现象

预发 H5 中“上传录音”按钮点击后无明显反应，用户无法稳定打开本地音频文件选择器。

本阶段只处理“上传录音按钮无反应”和上传链路，不处理 HTTP 非安全上下文导致的“开始录音不可用”。录音权限问题归入 T27 域名 + HTTPS 后再验证。

## 根因判断

本次排查结论：问题主要属于 H5 文件选择入口实现不稳定。

原实现为：

- 页面显示一个“上传录音”按钮。
- 真实 `<input type="file">` 使用 `display: none` 隐藏。
- 点击按钮后通过 `audioFileInputRef.value?.click()` 程序化触发文件选择。

该写法在部分移动浏览器、WebView、uni-app H5 编译产物或安全策略较严格的环境中可能被拦截。表现就是用户点击按钮后没有文件选择器弹出，看起来像“按钮无反应”。

排除项：

- 前端上传处理函数存在，`handleAudioFileSelected`、`handleLocalAudioUpload`、`uploadAudioFile` 均已绑定。
- `/api` 代理链路可用，公网 health 返回 200。
- 后端 `/api/recordings/upload` multipart 上传接口可用。
- mock 转写 provider 可用。
- mock LLM provider 默认生成链路可用。
- 本问题不同于 HTTP 下浏览器不允许麦克风录音的限制。

## 修改文件

- `frontend/src/pages/index/index.vue`

## 修改内容

- 将“上传录音”从“按钮点击后程序化触发隐藏 input”改为“可见上传控件内嵌透明 file input”。
- 真实 file input 不再使用 `display: none`，而是 `position: absolute` 覆盖在上传控件上，并通过 `opacity: 0` 视觉隐藏。
- 用户点击“上传录音”时，点击目标实际落在原生 file input 上，减少移动浏览器 / WebView 对程序化 `input.click()` 的拦截风险。
- 保留既有 `openAudioFilePicker`，用于错误重试按钮继续触发文件选择。
- 未修改后端上传接口、转写接口、默认生成接口、录音权限逻辑或 HTTPS 相关配置。

## 验证结果

### 代码与构建验证

| 验证项         | 结果 | 命令 / 说明                                                                   |
| -------------- | ---- | ----------------------------------------------------------------------------- |
| 后端 typecheck | 通过 | `node node_modules/typescript/bin/tsc -p backend/tsconfig.json --noEmit`      |
| 前端 typecheck | 通过 | `node node_modules/vue-tsc/bin/vue-tsc.js -p frontend/tsconfig.json --noEmit` |
| 后端 build     | 通过 | `node node_modules/typescript/bin/tsc -p backend/tsconfig.json`               |
| H5 build       | 通过 | `node ../node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p h5`       |

H5 build 仍有 Dart Sass legacy JS API deprecation warning，为上游 warning，不影响本次构建结果。

### 预发 API 最小验证

2026-06-07 使用 demo 账号对公网预发 API 执行 multipart 上传、mock 转写、默认生成最小验证：

```json
{
  "recordingId": "cmq3hgm9y000001o2ri36ppms",
  "uploadStatus": "uploaded",
  "transcriptLength": 156,
  "generatedCount": 6,
  "succeededTypes": [
    "summary",
    "medical_record",
    "communication_review",
    "customer_profile",
    "upsell_opportunities",
    "smart_followup"
  ]
}
```

该验证说明后端上传接口、Nginx `/api` 代理、mock 转写和 mock 默认生成链路均可用。

### 当前未完成的预发页面验证

本地当前 shell 无 `docker` / `docker compose`，无法本机 Docker 复测。

当前未提供服务器 SSH root 密码或 SSH key，因此尚未在服务器执行以下动作：

- 备份 SQLite volume 与 `private-storage` 上传文件 volume。
- 服务器拉取最新 commit。
- 服务器重新构建并启动 Docker Compose。
- 在更新后的预发 H5 页面中手动点击“上传录音”确认文件选择器弹出。

## 手动测试步骤

服务器部署更新后，在浏览器中执行：

1. 打开 `http://43.129.231.8:8080`。
2. 使用 `demo_doctor / demo_password` 登录。
3. 进入“AI 录音 / 智能工牌”。
4. 点击“上传录音”。
5. 预期：系统弹出本地文件选择器。
6. 选择 `.mp3`、`.wav` 或 `.m4a` 音频文件。
7. 预期：页面显示“正在上传本地音频...”，随后进入“上传成功，正在转写...”。
8. 预期：最近录音列表新增记录，详情页可看到转写文本和默认生成结果。
9. 在 HTTP 环境下不要把“开始录音”不可用作为 T26 失败项，该问题等待 T27 HTTPS 后复测。

## 未解决问题

- 服务器预发 H5 尚未更新到本次修复 commit，需要服务器 SSH 信息或由人工执行部署。
- HTTP 非安全上下文导致浏览器录音不可用，归入 T27。
- 当前仍为 demo 账号、SQLite、mock AI 和 mock 转写。
- 上传文件保留与备份策略仍未正式固化。

## 是否影响 T27

不阻塞 T27。

T26 修复的是文件上传入口；T27 需要继续准备域名 + HTTPS，用于解决浏览器麦克风录音能力在 HTTP 下不可用的问题，并同步校准 `CORS_ORIGIN`、`VITE_API_BASE_URL`、80/443 端口和后续微信 / 小程序合法域名。
