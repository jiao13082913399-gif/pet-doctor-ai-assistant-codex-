# T28 真实 AI / 转写 Provider 接入前评估

更新时间：2026-06-07

## 阶段结论

当前项目已经具备真实 AI / 转写 provider 接入的基础抽象层，但尚未实现任何真实 provider 客户端。

本阶段不建议直接切换真实 provider。应先补齐 provider 实现、密钥管理、超时与重试、费用控制、日志脱敏和本地验证，再进入预发环境灰度。

推荐顺序：先接 LLM，再接转写。

原因：

- LLM 链路主要处理文本输入与结构化输出，现有 `generateWithLLM`、PromptVersion、`generation_results`、`ai_call_logs` 已经比较完整。
- 转写链路涉及音频文件读取、上传厂商、音频格式兼容、长音频耗时、异步任务或轮询、隐私和成本，接入复杂度更高。
- 可以先用 mock 转写文本或人工 transcript 验证真实 LLM 的生成质量、延迟、token 和费用，再接真实转写。

## 当前 mock provider 位置与实现方式

### Provider 工厂

文件：`backend/src/services/ai/providers.ts`

当前实现：

- `MockTranscriptionProvider`
  - provider 名称：`mock`
  - 返回固定 mock 转写文本。
  - 支持 `forceFailure` 用于验证失败重试。
- `MockLLMProvider`
  - provider 名称：`mock`
  - 通过 `createMockGenerationData(generationType)` 返回固定结构化结果。
  - token 使用字符长度估算。
- `UnsupportedTranscriptionProvider`
  - 除 `mock` 外的转写 provider 均返回 `501 TRANSCRIPTION_PROVIDER_NOT_IMPLEMENTED`。
- `UnsupportedLLMProvider`
  - 除 `mock` 外的 LLM provider 均返回 `501 LLM_PROVIDER_NOT_IMPLEMENTED`。

### 调用服务

文件：

- `backend/src/services/ai/transcription-service.ts`
- `backend/src/services/ai/llm-service.ts`

当前能力：

- 根据 env 创建 provider。
- 统一记录 `ai_call_logs`。
- 成功时记录 provider、model、latency、token 等信息。
- 失败时记录 provider、model、latency、errorMessage。

### 业务调用链

文件：

- `backend/src/routes/recordings.ts`
- `backend/src/services/recordings/default-generation.ts`
- `backend/src/routes/ai.ts`

当前链路：

- 上传音频后创建 `recordings`。
- `POST /api/recordings/:id/transcribe` 调用 `transcribeAudio`。
- `POST /api/recordings/:id/generate-default-results` 调用 `generateWithLLM`，默认生成 6 个模块。
- 医疗风险防控、团队经验共享通过主动生成接口调用 `generateWithLLM`。
- `/api/ai/transcriptions` 和 `/api/ai/generations` 是 provider 抽象层调试接口。

## 当前真实 provider 占位情况

### 转写 provider 占位

类型定义：`backend/src/types/domain.ts`

```text
mock
dingtalk
feishu
aliyun
tencent
manual
other
```

当前除 `mock` 外均未实现真实服务调用。

### LLM provider 占位

类型定义：`backend/src/types/domain.ts`

```text
mock
deepseek
qwen
```

当前除 `mock` 外均未实现真实服务调用。

## Env 占位项

文件：

- `.env.example`
- `deploy/docker.env.example`

已预留：

```bash
TRANSCRIPTION_PROVIDER=mock
TRANSCRIPTION_MODEL_NAME=mock-transcription-v1
DINGTALK_TRANSCRIPTION_API_KEY=
FEISHU_TRANSCRIPTION_APP_ID=
FEISHU_TRANSCRIPTION_APP_SECRET=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
TENCENT_SECRET_ID=
TENCENT_SECRET_KEY=

LLM_PROVIDER=mock
LLM_MODEL_NAME=mock-llm-v1
DEEPSEEK_API_KEY=
QWEN_API_KEY=
```

注意：`backend/src/config/env.ts` 当前只读取 provider 名称和 model name，尚未把具体 key 暴露到 typed env 对象中。

## 接入真实 provider 前需要补的代码

### 通用基础

- 在 `backend/src/config/env.ts` 中读取真实 provider 所需 key、endpoint、timeout、重试次数、并发限制和费用阈值。
- 增加 provider 客户端文件，避免把厂商逻辑全部塞进 `providers.ts`。
- 为每个真实 provider 实现响应标准化：
  - 转写输出统一映射为 `TranscriptionOutput`。
  - LLM 输出统一映射为 `LLMGenerationOutput`。
- 为真实 provider 增加超时控制。
- 为可重试错误增加有限重试和退避。
- 为不可重试错误保留清晰错误码。
- 为日志增加脱敏，禁止把完整音频 URL、密钥、完整 prompt、完整 transcript 或敏感个人信息写入普通日志。
- 为费用控制补充 token、音频时长、单次调用成本和每日预算阈值。

### LLM provider

需要补：

- DeepSeek client：
  - 读取 `DEEPSEEK_API_KEY`。
  - 配置模型名，例如 `deepseek-chat` 或项目确认的模型。
  - 调用 chat/completions 类接口。
  - 解析文本输出、token usage、latency。
  - 将模型输出稳定转换为 `contentJson` 与 `contentText`。
- Qwen client：
  - 读取 `QWEN_API_KEY`。
  - 配置通义千问模型名。
  - 处理服务端返回格式、token usage 和错误码。
- 结构化输出保护：
  - 要求模型输出 JSON。
  - JSON parse 失败时进入兜底清洗或返回可读错误。
  - 单模块失败不得影响其他模块已成功结果。

### 转写 provider

需要补：

- 钉钉转写：
  - 明确 API 形态、鉴权方式、音频上传方式、回调或轮询机制。
  - 读取 `DINGTALK_TRANSCRIPTION_API_KEY` 或实际所需 app credential。
- 飞书转写：
  - 读取 `FEISHU_TRANSCRIPTION_APP_ID` / `FEISHU_TRANSCRIPTION_APP_SECRET`。
  - 处理 tenant access token、音频上传、任务查询。
- 阿里云转写：
  - 读取 `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET`。
  - 明确使用一句话识别、录音文件识别或其他服务。
  - 处理长音频异步任务与结果轮询。
- 腾讯转写：
  - 读取 `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY`。
  - 明确使用具体 ASR 服务形态。
  - 处理签名、任务状态、结果格式。
- 本地文件读取：
  - 当前 `TranscriptionInput.audioFilePath` 已传入存储路径。
  - 真实 provider 需要安全读取文件，不暴露 `internal://` 路径。
  - 长音频需确认大小、时长、格式和转码策略。

## 接入后必须测试的链路

### 转写

- MP3 / WAV / M4A 均可上传并转写。
- 超过大小或时长限制时返回明确错误。
- provider 超时、鉴权失败、额度不足时状态进入 `failed`，并保留原始音频。
- `POST /api/recordings/:id/retry` 可重新转写。
- 转写文本可手动编辑保存。

### AI 病历生成

- 默认 6 个模块可生成。
- 主动生成 2 个模块可生成。
- 病历、医疗风险等模块保留人工确认提示。
- 结构化 JSON 可被前端七大 Tab 正常展示。

### 结果保存

- 编辑保存生成结果后 `status = saved`。
- 采纳 / 不采纳 / 重新生成能写入反馈和审计日志。
- 智能回访可一键转待办。

### 错误重试

- 转写失败后可重试。
- 单个生成模块失败不清空其他成功模块。
- 重新生成只影响当前模块版本。

### 超时

- LLM 单次调用超时。
- 转写任务提交超时。
- 转写任务轮询超时。
- 前端应看到明确失败状态，不长期卡在 loading。

### 费用控制

- 记录每次 LLM token。
- 记录每次转写音频时长。
- 估算并写入 `ai_call_logs.estimated_cost`。
- 设置单次最大 token、单音频最大时长、每日预算或人工开关。

### 日志脱敏

- 不记录真实 API key。
- 不记录完整 Authorization header。
- 不记录完整音频文件路径。
- 普通日志不输出完整 transcript 和完整 prompt。
- 团队经验共享内容必须脱敏后再外发或沉淀。

## 需要用户提供的 key 或账号

### LLM

- DeepSeek：
  - `DEEPSEEK_API_KEY`
  - 模型名
  - 预算上限
  - 是否允许发送真实接诊文本
- Qwen：
  - `QWEN_API_KEY`
  - 模型名
  - 预算上限
  - 是否允许发送真实接诊文本

### 转写

- 钉钉：
  - 转写服务账号或 API key
  - 可用接口文档或控制台服务名称
- 飞书：
  - `FEISHU_TRANSCRIPTION_APP_ID`
  - `FEISHU_TRANSCRIPTION_APP_SECRET`
  - 应用权限范围
- 阿里云：
  - `ALIYUN_ACCESS_KEY_ID`
  - `ALIYUN_ACCESS_KEY_SECRET`
  - 开通的语音识别服务类型
  - 地域 / endpoint
- 腾讯云：
  - `TENCENT_SECRET_ID`
  - `TENCENT_SECRET_KEY`
  - 开通的 ASR 服务类型
  - 地域 / endpoint

## 不能进入 Git 的内容

以下内容只能放在本地 `.env`、服务器 `deploy/docker.env`、云厂商密钥管理或 CI Secret 中，不能提交到 Git：

- `DEEPSEEK_API_KEY`
- `QWEN_API_KEY`
- `DINGTALK_TRANSCRIPTION_API_KEY`
- `FEISHU_TRANSCRIPTION_APP_SECRET`
- `ALIYUN_ACCESS_KEY_ID`
- `ALIYUN_ACCESS_KEY_SECRET`
- `TENCENT_SECRET_ID`
- `TENCENT_SECRET_KEY`
- 服务器 `deploy/docker.env`
- HTTPS 证书、私钥、pem、key、crt 文件
- 真实客户音频、真实 transcript、真实病历内容样本

## 建议接入顺序

1. 本地接入一个 LLM provider，建议 DeepSeek 或 Qwen 二选一。
2. 使用 mock transcript 或手工 transcript 跑默认生成和主动生成。
3. 验证 JSON 结构、前端展示、token、延迟、错误处理和费用记录。
4. 推到预发，继续使用少量脱敏测试样本验证。
5. 再接入一个转写 provider，优先选择已有账号、文档清晰、支持长音频异步任务的厂商。
6. 转写 provider 通过后，再联动完整链路：上传音频 -> 转写 -> 默认生成 -> 保存 / 采纳 / 回访待办。

## 是否建议先本地测，再上预发

建议先本地测，再上预发。

本地验证通过条件：

- `.env` 使用真实 key，但不提交。
- 单 provider 单链路能跑通。
- 错误场景可复现。
- 不把真实客户样本写入 Git 或文档。
- `ai_call_logs` 有成功与失败记录。
- 构建、typecheck、smoke 通过。

预发验证通过条件：

- 服务器 `deploy/docker.env` 使用真实 key。
- 预发域名 HTTPS 可访问。
- 少量脱敏样本跑通。
- 费用和调用次数可控。
- 日志无密钥和敏感明文泄漏。
- 失败后可回滚到 mock provider。

## 风险分级

### P0

- 真实 API key 泄漏到 Git、日志或前端产物。
- 未经授权发送真实客户音频、转写文本或病历内容到第三方。
- provider 切换后全链路不可用且无法快速回滚到 mock。
- 转写或生成错误被前端展示为可靠医疗结论。

### P1

- LLM 输出不是稳定 JSON，导致七大 Tab 展示异常。
- 单模块失败导致整条录音处理失败。
- 转写长音频超时或费用失控。
- `ai_call_logs` 未记录成本、token、耗时和失败原因。
- 错误日志包含完整 transcript、prompt 或客户隐私。
- CORS / HTTPS 未完成时直接上真实 provider，导致前端验证不完整。

### P2

- 只接一个 LLM provider，缺少备用 provider。
- 不同 provider 的模型名和输出格式没有文档化。
- 费用估算先粗略，后续需要按真实账单校准。
- 对多说话人识别、时间戳、说话人分离等高级转写能力暂未设计。

## T28 后续动作建议

在用户提供 key 和明确授权前，不切换真实 provider。

下一步建议：

1. 先完成 T27 HTTPS 实施，让浏览器录音具备真实验证环境。
2. 选择一个 LLM provider 作为第一接入对象。
3. 明确可使用的测试数据：优先使用脱敏文本或 mock transcript。
4. 增加 provider 客户端、timeout、重试、成本记录和日志脱敏。
5. 本地验证通过后再推预发。
