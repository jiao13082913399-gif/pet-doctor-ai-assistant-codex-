# API 文档

## 通用约定

API 基础路径：`/api`

认证方式：受保护接口使用 `Authorization: Bearer <JWT token>`。

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
    "code": "UNAUTHORIZED",
    "message": "请先登录"
  },
  "requestId": "request-id",
  "timestamp": "2026-05-29T00:00:00.000Z"
}
```

## GET /api/health

用途：后端服务健康检查。

认证：不需要。

## POST /api/auth/login

用途：Web 端账号密码登录。

认证：不需要。

请求体：

```json
{
  "username": "demo_doctor",
  "password": "demo_password"
}
```

成功响应 `data`：

```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "demo_doctor",
    "phone": "18800000000",
    "nickname": "测试医生",
    "avatar": null,
    "role": "doctor",
    "position": "主治医生",
    "city": "宁波",
    "currentStoreId": "store-id",
    "isDirector": false,
    "lastLoginAt": "2026-05-29T00:00:00.000Z",
    "status": "active",
    "createdAt": "2026-05-29T00:00:00.000Z",
    "updatedAt": "2026-05-29T00:00:00.000Z"
  }
}
```

错误：

- `400 INVALID_LOGIN_PAYLOAD`：用户名或密码为空。
- `401 INVALID_CREDENTIALS`：用户名或密码错误。

## POST /api/auth/logout

用途：退出登录。当前第一版使用无状态 JWT，不做服务端 token 黑名单。

认证：需要。

成功响应 `data`：

```json
{
  "loggedOut": true
}
```

## GET /api/auth/me

用途：返回当前登录用户信息。

认证：需要。

成功响应 `data`：同 `POST /api/auth/login` 中的 `user`。

错误：

- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。

## POST /api/auth/wechat-login

用途：小程序微信登录 mock。第一版直接接收 `openid` / `unionid`，优先查找已绑定用户；如传入 `userId`，则将该微信身份绑定到指定用户；如未传 `userId` 且未绑定，则创建一个微信 mock 用户。

认证：不需要。

请求体：

```json
{
  "openid": "mock-openid",
  "unionid": "mock-unionid",
  "userId": "optional-user-id",
  "nickname": "微信用户昵称",
  "avatar": "https://example.com/avatar.png"
}
```

成功响应 `data`：同 `POST /api/auth/login`。

错误：

- `400 INVALID_WECHAT_PAYLOAD`：`openid` 为空。
- `401 WECHAT_USER_DISABLED`：微信身份绑定的用户已停用。
- `404 USER_NOT_FOUND`：传入的 `userId` 不存在或已停用。

## POST /api/auth/bind-wechat

用途：给当前登录用户绑定微信 mock 身份。

认证：需要。

请求体：

```json
{
  "openid": "mock-openid",
  "unionid": "mock-unionid"
}
```

成功响应 `data`：

```json
{
  "id": "binding-id",
  "userId": "user-id",
  "authType": "wechat",
  "provider": "wechat_mock",
  "providerUserId": "mock-openid",
  "unionId": "mock-unionid",
  "status": "active",
  "createdAt": "2026-05-29T00:00:00.000Z",
  "updatedAt": "2026-05-29T00:00:00.000Z"
}
```

错误：

- `400 INVALID_WECHAT_PAYLOAD`：`openid` 为空。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `409 WECHAT_ALREADY_BOUND`：该微信身份已绑定其他用户。

## POST /api/recordings/upload

用途：上传 MP3 / WAV / M4A 音频并创建录音记录。

认证：需要。

支持请求：

- `multipart/form-data`：文件字段名为 `file`。
- `audio/*` 原始请求体：可通过 query 或 header `x-file-name` 传文件名。
- `application/json`：使用 `audioBase64` / `audio_base64` 传 Base64 音频。

可选字段：

```json
{
  "durationSeconds": 128,
  "uploadType": "web_upload",
  "petOwnerName": "王女士",
  "petName": "豆豆"
}
```

兼容 snake_case 字段：`duration_seconds`、`upload_type`、`pet_owner_name`、`pet_name`。

成功响应 `data`：

```json
{
  "id": "recording-id",
  "userId": "user-id",
  "storeId": "store-id",
  "audioUrl": "internal://recordings/user-id/2026-05-31/file.wav",
  "audioFormat": "wav",
  "audioDuration": 128,
  "uploadType": "web_upload",
  "transcriptText": null,
  "aiDetectedScene": null,
  "processingStatus": "uploaded",
  "petOwnerName": "王女士",
  "petName": "豆豆",
  "errorMessage": null,
  "createdAt": "2026-05-31T00:00:00.000Z",
  "updatedAt": "2026-05-31T00:00:00.000Z",
  "deletedAt": null
}
```

说明：

- 支持格式：MP3 / WAV / M4A。
- 不支持视频文件。
- 最大文件大小由 `MAX_AUDIO_SIZE_MB` 控制。
- 最长音频时长由 `MAX_AUDIO_DURATION_SECONDS` 控制；WAV 可从文件头推断，MP3 / M4A 第一版建议客户端传入 `durationSeconds`。
- `audioUrl` 为受权限保护设计的内部路径，不是公开永久 URL。

错误：

- `400 INVALID_AUDIO_UPLOAD_PAYLOAD`：缺少音频文件。
- `400 EMPTY_AUDIO_FILE`：音频文件为空。
- `400 INVALID_AUDIO_DURATION`：音频时长不是正数。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `413 AUDIO_FILE_TOO_LARGE`：音频文件超过大小限制。
- `413 AUDIO_DURATION_TOO_LONG`：音频时长超过限制。
- `415 VIDEO_FILE_NOT_SUPPORTED`：上传了视频文件。
- `415 UNSUPPORTED_AUDIO_FORMAT`：不是 MP3 / WAV / M4A。

## POST /api/recordings/start

用途：创建录音开始占位记录，初始状态为 `uploading`。

认证：需要。

请求体：

```json
{
  "uploadType": "web_recording",
  "petOwnerName": "李先生",
  "petName": "球球"
}
```

成功响应 `data`：同 `POST /api/recordings/upload`，其中 `processingStatus = uploading`。

## POST /api/recordings/finish

用途：结束录音。可携带音频文件并将录音状态更新为 `uploaded`；也可在已有私有音频路径的情况下只提交 `recordingId` 和时长。

认证：需要。

携带音频时字段同 `POST /api/recordings/upload`，并额外传入：

```json
{
  "recordingId": "recording-id"
}
```

只更新状态时请求体：

```json
{
  "recordingId": "recording-id",
  "durationSeconds": 128
}
```

错误：

- `400 INVALID_RECORDING_FINISH_PAYLOAD`：`recordingId` 为空。
- `400 AUDIO_FILE_REQUIRED`：该录音仍是 pending 内部路径，finish 时必须携带音频文件。
- `404 RECORDING_NOT_FOUND`：录音不存在或无权访问。

## GET /api/recordings

用途：返回当前用户自己的未删除录音列表。

认证：需要。

成功响应 `data`：录音数组，按 `createdAt` 倒序，最多返回 100 条。

## GET /api/recordings/{id}

用途：返回录音详情，包括基础信息、转写文本、宠主 / 宠物绑定信息、生成结果列表。

认证：需要。

成功响应 `data`：

```json
{
  "recording": {
    "id": "recording-id",
    "audioUrl": "internal://recordings/user-id/2026-05-31/file.wav",
    "processingStatus": "uploaded"
  },
  "transcriptText": "医生：...",
  "petBinding": {
    "petOwnerName": "王女士",
    "petName": "豆豆",
    "memories": []
  },
  "generationResults": []
}
```

错误：

- `404 RECORDING_NOT_FOUND`：录音不存在、已删除或无权访问。

## PUT /api/recordings/{id}

用途：编辑并保存当前用户录音的宠主姓名和宠物姓名。

认证：需要。

请求体：

```json
{
  "petOwnerName": "王女士",
  "petName": "豆豆"
}
```

兼容 snake_case 字段：`pet_owner_name`、`pet_name`。

成功响应 `data`：

```json
{
  "recording": {
    "id": "recording-id",
    "petOwnerName": "王女士",
    "petName": "豆豆"
  },
  "petBinding": {
    "petOwnerName": "王女士",
    "petName": "豆豆"
  }
}
```

错误：

- `400 INVALID_RECORDING_BINDING_PAYLOAD`：宠主姓名或宠物姓名不是字符串。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 RECORDING_NOT_FOUND`：录音不存在、已删除或无权访问。

## DELETE /api/recordings/{id}

用途：软删除当前用户录音，并写入审计日志。

认证：需要。

副作用：

- 写入 `recordings.deleted_at`。
- 写入 `audit_logs`，`action = recording.delete`、`target_type = recording`。

成功响应 `data`：

```json
{
  "recording": {
    "id": "recording-id",
    "deletedAt": "2026-05-31T00:00:00.000Z"
  },
  "auditLogId": "audit-log-id"
}
```

## POST /api/recordings/{id}/retry

用途：将当前用户录音重置为 `uploaded`，并清空 `errorMessage`，供后续转写或生成流程重试。

认证：需要。

错误：

- `404 RECORDING_NOT_FOUND`：录音不存在、已删除或无权访问。

## POST /api/recordings/{id}/transcribe

用途：对已上传音频的录音发起转写。第一版不做实时转写，录音完成后统一转写；当前实现为请求内完成编排，后续可替换为真正异步任务。

认证：需要。

可选请求体：

```json
{
  "forceFail": true
}
```

说明：`forceFail` 仅用于 mock provider 验证失败重试流程，正常业务不传。

成功响应 `data`：

```json
{
  "recording": {
    "id": "recording-id",
    "processingStatus": "uploaded",
    "transcriptText": "医生：..."
  },
  "transcript": {
    "recordingId": "recording-id",
    "transcriptText": "医生：...",
    "processingStatus": "uploaded",
    "errorMessage": null,
    "updatedAt": "2026-05-31T00:00:00.000Z"
  },
  "provider": "mock",
  "modelName": "mock-transcription-v1",
  "detectedSpeakers": ["医生", "宠主"],
  "duration": 128
}
```

副作用：

- 转写开始前更新 `recordings.processing_status = transcribing`，并清空旧 `error_message`。
- 调用 `TranscriptionProvider`，每次调用都会写入 `ai_call_logs`，`call_type = transcription`。
- 转写成功后写入 `recordings.transcript_text`，必要时更新 `audio_duration`，并将状态更新为可继续生成的 `uploaded`。
- 转写失败后状态更新为 `failed`，写入 `error_message`，保留原 `audio_url` 以便重新转写。

错误：

- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 RECORDING_NOT_FOUND`：录音不存在、已删除或无权访问。
- `409 RECORDING_AUDIO_NOT_READY`：录音音频尚未上传完成。
- `409 RECORDING_TRANSCRIPTION_IN_PROGRESS`：录音正在转写中。
- `501 TRANSCRIPTION_PROVIDER_NOT_IMPLEMENTED`：当前配置的非 mock provider 尚未接入真实服务。

## GET /api/recordings/{id}/transcript

用途：读取录音转写文本、处理状态和错误信息，供前端轮询或刷新状态使用。

认证：需要。

成功响应 `data`：

```json
{
  "recordingId": "recording-id",
  "transcriptText": "医生：...",
  "processingStatus": "uploaded",
  "errorMessage": null,
  "updatedAt": "2026-05-31T00:00:00.000Z"
}
```

错误：

- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 RECORDING_NOT_FOUND`：录音不存在、已删除或无权访问。

## PUT /api/recordings/{id}/transcript

用途：手动编辑并保存录音转写文本。保存后状态更新为可继续生成的 `uploaded`，并清空旧错误信息。

认证：需要。

请求体：

```json
{
  "transcriptText": "医生：请问小布这几天精神食欲怎么样？\n宠主：精神还可以。"
}
```

兼容 snake_case 字段：`transcript_text`。

成功响应 `data`：同 `GET /api/recordings/{id}/transcript`。

错误：

- `400 INVALID_TRANSCRIPT_PAYLOAD`：`transcriptText` 不是字符串。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 RECORDING_NOT_FOUND`：录音不存在、已删除或无权访问。

## POST /api/recordings/{id}/generate-default-results

用途：对已有转写文本的录音生成默认 AI 结果，并写入 `generation_results`。

认证：需要。

默认生成 `resultType`：

```text
summary
medical_record
communication_review
customer_profile
upsell_opportunities
smart_followup
```

说明：

- PRD 中“前五项默认生成”指五个业务模块；总摘要也会生成，所以一次成功触发会创建 6 条 `generation_results`。
- `medical_risk_control` 和 `team_knowledge` 不在默认生成范围内。
- 每个模块独立调用 LLM Provider、独立更新 `moduleStatus`，允许部分成功、部分失败。
- 每次 LLM 调用都会写入 `ai_call_logs`，并关联对应 `generation_result_id`。
- 生成结束后会尝试从结构化内容和展示文本中识别 `petOwnerName` / `petName` 并回写录音；识别不到时保持为空。
- 至少 `summary` 和一个业务模块成功时，`recordings.processing_status = completed`；全部失败或未达到完成条件时为 `failed`。

成功响应 `data`：

```json
{
  "recording": {
    "id": "recording-id",
    "processingStatus": "completed",
    "petOwnerName": "王女士",
    "petName": "小布"
  },
  "generationResults": [
    {
      "id": "generation-result-id",
      "recordingId": "recording-id",
      "resultType": "summary",
      "title": "总摘要",
      "contentJson": {},
      "contentText": "本次沟通围绕...",
      "moduleStatus": "completed",
      "status": "draft",
      "isDefaultGenerated": true,
      "version": 1,
      "confirmedByUser": false,
      "confirmedAt": null,
      "createdAt": "2026-05-31T00:00:00.000Z",
      "updatedAt": "2026-05-31T00:00:00.000Z"
    }
  ],
  "moduleResults": [
    {
      "generationResultId": "generation-result-id",
      "resultType": "summary",
      "moduleStatus": "completed",
      "errorMessage": null
    }
  ],
  "succeededTypes": ["summary", "medical_record"],
  "failedTypes": [],
  "petBinding": {
    "petOwnerName": "王女士",
    "petName": "小布"
  }
}
```

错误：

- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 RECORDING_NOT_FOUND`：录音不存在、已删除或无权访问。
- `409 RECORDING_TRANSCRIPT_REQUIRED`：录音还没有转写文本。
- `409 RECORDING_TRANSCRIPTION_IN_PROGRESS`：录音正在转写中。
- `409 RECORDING_GENERATION_IN_PROGRESS`：录音正在生成中。
- `501 LLM_PROVIDER_NOT_IMPLEMENTED`：当前配置的非 mock provider 尚未接入真实服务。

## POST /api/recordings/{id}/generate-risk-control

用途：主动生成医疗风险防控模块，并写入 `generation_results`。

认证：需要。

说明：

- 不在默认生成范围内，用户点击对应 Tab 并确认后调用。
- 重复调用会按 `medical_risk_control` 的最大版本号递增创建新结果，支持重新生成。
- 生成失败只影响本模块，返回的 `moduleResult.moduleStatus = failed`，不会删除或覆盖其他模块。
- 展示侧必须提示医生人工确认；内容只能表达为 AI 辅助识别和提醒，不能表达为 AI 已完成风险判断。

生成内容覆盖：

```text
麻醉风险
手术风险
重症风险
输血风险
侵入性检查风险
费用争议风险
宠主未充分理解的风险
风险告知是否完整
需要补充确认的内容
```

成功响应 `data`：

```json
{
  "generationResult": {
    "id": "generation-result-id",
    "recordingId": "recording-id",
    "resultType": "medical_risk_control",
    "title": "医疗风险防控",
    "contentJson": {},
    "contentText": "人工确认提示：以下内容仅为 AI 辅助识别和提醒...",
    "moduleStatus": "completed",
    "status": "draft",
    "isDefaultGenerated": false,
    "version": 1,
    "confirmedByUser": false,
    "confirmedAt": null,
    "createdAt": "2026-05-31T00:00:00.000Z",
    "updatedAt": "2026-05-31T00:00:00.000Z"
  },
  "moduleResult": {
    "generationResultId": "generation-result-id",
    "resultType": "medical_risk_control",
    "moduleStatus": "completed",
    "errorMessage": null
  }
}
```

## POST /api/recordings/{id}/generate-team-knowledge

用途：主动生成团队经验共享模块，并写入 `generation_results`。

认证：需要。

说明：

- 不在默认生成范围内，用户点击对应 Tab 并确认后调用。
- 重复调用会按 `team_knowledge` 的最大版本号递增创建新结果，支持重新生成。
- 生成失败只影响本模块，不影响其他模块。

生成内容覆盖：

```text
典型病例摘要
优秀话术
处置路径
沟通技巧
可沉淀经验
脱敏建议
```

成功响应结构同 `generate-risk-control`，其中 `resultType = team_knowledge`、`title = 团队经验共享`。

## PUT /api/generation-results/{id}

用途：编辑并保存某条生成结果正文和结构化 JSON。

认证：需要。

请求体：

```json
{
  "title": "医疗风险防控",
  "contentText": "编辑后的展示文本",
  "contentJson": {},
  "confirmedByUser": true,
  "confirmedAt": "2026-06-01T10:00:00.000Z"
}
```

兼容 snake_case 字段：`content_text`、`content_json`、`confirmed_by_user`、`confirmed_at`。

说明：

- `contentText` 和 `contentJson` 均可编辑；未传字段保持原值。
- 保存后 `generation_results.status = saved`。
- 医疗相关结果可通过 `confirmedByUser` / `confirmedAt` 写入人工确认状态。
- 写入 `audit_logs.action = generation_result.update`，记录 `before_data` 与 `after_data`。

## POST /api/generation-results/{id}/save

用途：保存某条生成结果，行为同 `PUT /api/generation-results/{id}`。

认证：需要。

## POST /api/generation-results/{id}/adopt

用途：采纳生成结果，写入 `generation_feedback`，并标记 `confirmedByUser = true`。

认证：需要。

副作用：

- `generation_results.status = adopted`
- `generation_results.confirmed_by_user = true`
- `generation_results.confirmed_at = 当前时间`
- 新增 `generation_feedback.action = adopt`
- 新增 `audit_logs.action = generation_result.adopt`，记录 `before_data` 与 `after_data`

## POST /api/generation-results/{id}/reject

用途：不采纳生成结果，写入 `generation_feedback`，并标记 `status = rejected`。

认证：需要。

请求体：

```json
{
  "reason": "内容不准确",
  "customReason": "体温记录和沟通原文不一致"
}
```

`reason` 必须是以下选项之一：

```text
内容不准确
信息不完整
表达不符合医院习惯
医疗判断不可靠
话术不适合客户
格式不符合预期
其他
```

错误：

- `400 GENERATION_REJECT_REASON_REQUIRED`：不采纳时未提交有效 `reason`。

副作用：

- `generation_results.status = rejected`
- 新增 `generation_feedback.action = reject`
- 新增 `audit_logs.action = generation_result.reject`，记录 `before_data` 与 `after_data`

## POST /api/generation-results/{id}/regenerate

用途：基于该生成结果所属录音重新调用 LLM Provider，覆盖当前结果内容并递增版本。

认证：需要。

请求体：

```json
{
  "reason": "重新生成",
  "customReason": "希望换一种更贴近门店习惯的表达"
}
```

副作用：

- 调用当前 `LLMProvider`，并继续写入 `ai_call_logs`。
- `generation_results.version = version + 1`
- `generation_results.status = regenerated`
- 成功后 `generation_results.module_status = completed`
- 新增 `generation_feedback.action = regenerate`
- 新增 `audit_logs.action = generation_result.regenerate`，记录 `before_data` 与 `after_data`
- 不删除该结果已有的旧反馈记录。

错误：

- `409 RECORDING_TRANSCRIPT_REQUIRED`：所属录音还没有转写文本。
- `501 LLM_PROVIDER_NOT_IMPLEMENTED`：当前配置的非 mock provider 尚未接入真实服务。

## DELETE /api/generation-results/{id}

用途：软删除当前用户生成结果。第一版普通前端不暴露删除入口，接口用于需要删除生成结果时保留审计记录。

认证：需要。

副作用：

- 写入 `generation_results.deleted_at`
- 写入 `audit_logs.action = generation_result.delete`，记录 `before_data` 与 `after_data`

错误：

- `404 GENERATION_RESULT_NOT_FOUND`：生成结果不存在、已删除或无权访问。

## 兼容接口：录音嵌套生成结果反馈

以下 T08 嵌套路由仍保留兼容，建议新前端使用顶层 `/api/generation-results/{id}`：

```text
PUT /api/recordings/{id}/generation-results/{resultId}
POST /api/recordings/{id}/generation-results/{resultId}/adopt
POST /api/recordings/{id}/generation-results/{resultId}/reject
```

## POST /api/todos

用途：创建当前用户待办。智能回访结果一键转待办时传入 `generationResultId`，服务端会校验该生成结果属于当前用户，并自动补齐对应 `recordingId`。

认证：需要。

请求体：

```json
{
  "title": "回访 王女士 / 小布",
  "description": "回访原因：确认皮肤抓挠变化、用药执行和异常信号。",
  "petOwnerName": "王女士",
  "petName": "小布",
  "dueTime": "2026-06-04T10:00:00.000Z",
  "recordingId": "recording-id",
  "generationResultId": "generation-result-id",
  "status": "pending"
}
```

兼容 snake_case 字段：`pet_owner_name`、`pet_name`、`due_time`、`recording_id`、`generation_result_id`。

成功响应 `data`：

```json
{
  "id": "todo-id",
  "userId": "user-id",
  "recordingId": "recording-id",
  "generationResultId": "generation-result-id",
  "title": "回访 王女士 / 小布",
  "description": "回访原因：确认皮肤抓挠变化、用药执行和异常信号。",
  "petOwnerName": "王女士",
  "petName": "小布",
  "dueTime": "2026-06-04T10:00:00.000Z",
  "status": "pending",
  "createdAt": "2026-06-01T00:00:00.000Z",
  "updatedAt": "2026-06-01T00:00:00.000Z"
}
```

错误：

- `400 INVALID_TODO_PAYLOAD`：`title` 为空或 `dueTime` 不是有效时间。
- `400 TODO_RELATION_MISMATCH`：`recordingId` 与 `generationResultId` 不属于同一条录音。
- `404 RECORDING_NOT_FOUND`：录音不存在或无权访问。
- `404 GENERATION_RESULT_NOT_FOUND`：生成结果不存在或无权访问。

## GET /api/todos

用途：返回当前用户自己的待办列表。

认证：需要。

说明：按当前登录用户 `user_id` 过滤，不返回其他用户待办。

## PUT /api/todos/{id}

用途：编辑当前用户待办。

认证：需要。

请求体字段同 `POST /api/todos`，未传字段保持原值。

错误：

- `404 TODO_NOT_FOUND`：待办不存在或无权访问。

## POST /api/todos/{id}/complete

用途：将当前用户待办标记为完成。

认证：需要。

副作用：

- `todos.status = completed`

## DELETE /api/todos/{id}

用途：删除当前用户待办。

认证：需要。

副作用：

- 删除对应 `todos` 记录。
- 写入 `audit_logs.action = todo.delete`、`target_type = todo`。

## GET /api/audit-logs

用途：读取审计日志。第一版仅保留受限接口和 TODO，不向普通前端暴露。

认证：需要。

访问控制：

- 开发环境 `NODE_ENV=development` 可访问。
- 正式环境仅 `role = admin` 或 `isDirector = true` 的用户可访问。
- 普通用户访问返回 `403 AUDIT_LOGS_FORBIDDEN`。

Query：

```text
limit=100
```

成功响应 `data`：按 `createdAt` 倒序返回审计日志数组，每条包含 `id`、`userId`、`action`、`targetType`、`targetId`、`beforeData`、`afterData`、`createdAt`、`ip`、`userAgent`。

## POST /api/ai/transcriptions

用途：调用转写 Provider 抽象层。默认 `TRANSCRIPTION_PROVIDER=mock` 时返回示例转写内容，用于前端联调；调用会写入 `ai_call_logs`。真实钉钉、飞书、阿里云、腾讯等 provider 当前仅预留结构，尚未接入。

认证：需要。

请求体：

```json
{
  "recordingId": "recording-id",
  "audioFilePath": "/private/path/audio.wav",
  "audioFormat": "wav"
}
```

兼容 snake_case 字段：`recording_id`、`audio_file_path`、`audio_format`。

成功响应 `data`：

```json
{
  "provider": "mock",
  "modelName": "mock-transcription-v1",
  "recordingId": "recording-id",
  "transcriptText": "【Mock 转写】录音 recording-id 已完成转写。\n医生：...",
  "detectedSpeakers": ["医生", "宠主"],
  "duration": 128
}
```

副作用：

- 写入 `ai_call_logs`，`call_type = transcription`。
- mock 成功后回填 `recordings.transcript_text`、`recordings.audio_duration`，并将 `recordings.processing_status` 更新为 `completed`。

错误：

- `400 INVALID_TRANSCRIPTION_PAYLOAD`：`recordingId`、`audioFilePath` 或 `audioFormat` 为空。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 RECORDING_NOT_FOUND`：录音不存在或无权访问。
- `501 TRANSCRIPTION_PROVIDER_NOT_IMPLEMENTED`：当前配置的非 mock provider 尚未接入真实服务。

## POST /api/ai/generations

用途：调用 LLM Provider 抽象层。默认 `LLM_PROVIDER=mock` 时根据 `generationType` 返回结构化示例数据，用于前端联调；调用会写入 `ai_call_logs`。

认证：需要。

请求体：

```json
{
  "prompt": "请根据转写生成病历草稿",
  "context": {
    "transcriptText": "医生和宠主围绕皮肤复诊沟通"
  },
  "modelName": "mock-llm-v1",
  "generationType": "medical_record",
  "recordingId": "optional-recording-id",
  "generationResultId": "optional-generation-result-id"
}
```

兼容 snake_case 字段：`generation_type`、`model_name`、`recording_id`、`generation_result_id`。

`generationType` 可选值：

```text
summary
medical_record
communication_review
customer_profile
upsell_opportunities
smart_followup
medical_risk_control
team_knowledge
```

成功响应 `data`：

```json
{
  "provider": "mock",
  "modelName": "mock-llm-v1",
  "generationType": "medical_record",
  "promptVersion": "v1-medical-record",
  "contentJson": {
    "chiefComplaint": "近两天偶发抓挠，宠主担心皮肤问题反复。",
    "history": "既往有皮肤敏感史，近期按医嘱用药后症状减轻。",
    "assessment": "目前倾向轻度皮肤刺激或恢复期反应，暂未见明显急性恶化信息。",
    "plan": ["继续按原方案用药", "保持皮肤干燥清洁", "若红肿、渗出或精神食欲异常，及时复诊"]
  },
  "contentText": "主诉：近两天偶发抓挠。病史：既往有皮肤敏感史...",
  "tokens": {
    "input": 23,
    "output": 34,
    "total": 57
  },
  "latency": 1
}
```

副作用：

- 写入 `ai_call_logs`，`call_type = generation`，并记录 `prompt_version`、token 和耗时。

PromptVersion 映射：

```text
summary -> v1-summary
medical_record -> v1-medical-record
communication_review -> v1-communication-review
customer_profile -> v1-customer-profile
upsell_opportunities -> v1-upsell-opportunities
smart_followup -> v1-smart-followup
medical_risk_control -> v1-medical-risk-control
team_knowledge -> v1-team-knowledge
```

错误：

- `400 INVALID_GENERATION_PAYLOAD`：`prompt` 为空或 `generationType` 不在支持列表中。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 RECORDING_NOT_FOUND`：传入的录音不存在或无权访问。
- `404 GENERATION_RESULT_NOT_FOUND`：传入的生成结果不存在或无权访问。
- `501 LLM_PROVIDER_NOT_IMPLEMENTED`：当前配置的非 mock provider 尚未接入真实服务。

## GET /api/memory

用途：读取当前用户的个人 Memory 和待处理建议。

认证：需要。

成功响应 `data`：

```json
{
  "memory": {
    "id": "memory-id",
    "userId": "user-id",
    "storeId": "store-id",
    "memoryType": "personal_memory",
    "title": "个人 Memory",
    "contentJson": {},
    "contentText": "# 个人 Memory\n\n## 基础信息\n...",
    "status": "active",
    "createdAt": "2026-05-31T00:00:00.000Z",
    "updatedAt": "2026-05-31T00:00:00.000Z"
  },
  "pendingSuggestions": []
}
```

如果当前用户尚未初始化 Memory，`memory` 返回 `null`。

## POST /api/memory/init

用途：首次初始化当前用户个人 Memory，并生成 Markdown 模板。

认证：需要。

请求体：

```json
{
  "city": "宁波",
  "store": "宠一科技测试门店",
  "position": "主治医生",
  "personalBackground": "擅长皮肤病复诊、慢病沟通和宠主教育",
  "workScenarios": ["门诊复诊沟通", "电话回访"],
  "commonTasks": ["生成病历草稿", "整理回访重点"],
  "preferences": "输出简洁，先结论后依据"
}
```

兼容 snake_case 字段：`personal_background`、`work_scenarios`、`common_tasks`。

生成的 Markdown 固定包含：

```markdown
# 个人 Memory

## 基础信息

## 工作背景

## 常见任务

## 沟通偏好

## 长期有效信息
```

错误：

- `400 INVALID_MEMORY_INIT_PAYLOAD`：初始化字段不完整。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `409 MEMORY_ALREADY_EXISTS`：当前用户已存在个人 Memory。

## PUT /api/memory

用途：编辑并保存当前用户个人 Memory 的 Markdown 内容。

认证：需要。

请求体：

```json
{
  "contentText": "# 个人 Memory\n\n## 基础信息\n..."
}
```

兼容 snake_case 字段：`content_text`。

错误：

- `400 INVALID_MEMORY_PAYLOAD`：`contentText` 为空。
- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 MEMORY_NOT_FOUND`：当前用户尚未初始化个人 Memory。

## POST /api/memory/suggestions

用途：读取待处理建议；当请求体包含明确长期有效信息时，创建待确认的个人 Memory 更新建议。普通客户聊天、普通接诊沟通不默认触发 Memory 更新。

认证：需要。

创建建议请求体：

```json
{
  "longTermInfo": "长期偏好先给宠主明确结论，再列风险提醒。",
  "reason": "识别到长期有效的沟通偏好"
}
```

也可传入 `sourceText` / `chatText`，后端只在文本包含长期有效信号时创建 suggestion。

成功响应 `data`：

```json
{
  "created": true,
  "suggestion": {
    "id": "suggestion-id",
    "memoryId": "memory-id",
    "userId": "user-id",
    "suggestionType": "personal_memory_update",
    "beforeData": {
      "contentText": "旧 Memory"
    },
    "afterData": {
      "contentText": "新 Memory",
      "longTermInfo": "长期偏好先给宠主明确结论，再列风险提醒。"
    },
    "reason": "识别到长期有效的沟通偏好",
    "status": "pending",
    "createdAt": "2026-05-31T00:00:00.000Z",
    "updatedAt": "2026-05-31T00:00:00.000Z"
  },
  "pendingSuggestions": []
}
```

副作用：

- 只写入 `memory_update_suggestions`。
- 不直接修改 `memories.content_text`。

## POST /api/memory/suggestions/{id}/accept

用途：接受待处理建议，并将建议中的 `afterData.contentText` 写入当前用户个人 Memory。

认证：需要。

错误：

- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 MEMORY_SUGGESTION_NOT_FOUND`：建议不存在、无权访问或已处理。
- `400 INVALID_MEMORY_SUGGESTION`：建议内容为空，无法写入 Memory。

## POST /api/memory/suggestions/{id}/reject

用途：拒绝待处理建议，不修改个人 Memory。

认证：需要。

错误：

- `401 UNAUTHORIZED`：未登录、token 无效、token 过期或用户已停用。
- `404 MEMORY_SUGGESTION_NOT_FOUND`：建议不存在、无权访问或已处理。

## GET /api/resources

用途：资源库占位接口，返回当前用户资源列表结构、占位状态和未来资源类型。

认证：需要。

成功响应 `data`：

```json
{
  "status": "placeholder",
  "message": "资源库暂未开放，未来用于存放工具生成内容。",
  "futureTypes": ["copywriting", "image", "report", "tool_generated_asset", "skill_package_output"],
  "resources": []
}
```

说明：T18 只保留 `resources` 数据结构与入口，不提供真实业务功能。

## GET /api/projects

用途：返回当前登录用户自己的项目列表。

认证：需要。

成功响应 `data`：`ProjectResponse[]`。

## POST /api/projects

用途：创建当前登录用户项目结构。

认证：需要。

请求体：

```json
{
  "name": "复诊回访项目",
  "description": "用于沉淀复诊回访相关资料"
}
```

兼容字段：`title` 可作为 `name` 的别名。

错误：

- `400 INVALID_PROJECT_PAYLOAD`：`name` 为空。

## GET /api/projects/{id}

用途：返回当前登录用户项目详情、项目条目和未来关联能力提示。

认证：需要。

成功响应 `data`：

```json
{
  "project": {},
  "items": [],
  "futureAssociations": ["recording", "conversation", "file", "resource", "todo", "memory"]
}
```

错误：

- `404 PROJECT_NOT_FOUND`：项目不存在或无权访问。

## PUT /api/projects/{id}

用途：编辑当前登录用户项目基础信息。

认证：需要。

可编辑字段：`name`、`description`、`status`。

## POST /api/projects/{id}/items

用途：给当前登录用户项目新增条目结构。

认证：需要。

请求体：

```json
{
  "title": "一次复诊录音",
  "description": "后续可关联真实录音或生成物",
  "itemType": "recording",
  "sortOrder": 0
}
```

兼容 snake_case 字段：`item_type`、`sort_order`。

预留条目类型：`note`、`recording`、`conversation`、`file`、`resource`、`todo`、`memory`、`tool_output`。

错误：

- `400 INVALID_PROJECT_ITEM_PAYLOAD`：`title` 为空或 `sortOrder` 不合法。
- `400 INVALID_PROJECT_ITEM_TYPE`：条目类型不在预留白名单内。
- `404 PROJECT_NOT_FOUND`：项目不存在或无权访问。

## GET /api/projects/{id}/items

用途：返回当前登录用户项目下的条目列表。

认证：需要。

## GET /api/director-dashboard

用途：院长看板占位接口，返回六个指标卡结构和“数据统计能力即将上线”提示。

认证：需要。

成功响应 `data`：

```json
{
  "status": "placeholder",
  "message": "数据统计能力即将上线",
  "metrics": [
    {
      "key": "recordingCount",
      "label": "录音次数",
      "value": null,
      "placeholder": true
    }
  ]
}
```

说明：T18 不展示真实统计数据。
