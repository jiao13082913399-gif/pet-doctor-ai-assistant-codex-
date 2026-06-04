# 数据库 Schema

## T01 第一版模型

数据源：Prisma + SQLite，本地开发优先，字段命名映射为数据库 snake_case。Prisma 模型使用 PascalCase 和 camelCase，实际表名通过 `@@map` 固定为 PRD 要求的表名。

## 表清单

- `users`：系统用户，含账号、密码 hash、手机号、角色、岗位、当前门店、主管标记、登录时间与状态。T02 起 seed 用户密码使用 `scrypt` hash 保存，接口不会返回 `password_hash`。
- `user_auth_bindings`：用户第三方登录或账号绑定，保留 provider 与 provider_user_id 唯一约束。T02 微信登录 mock 使用 `provider = wechat_mock`、`auth_type = wechat` 保存 `openid` / `unionid` 绑定。
- `stores`：门店基础信息，含门店编码、城市、地址、电话、状态与软删除。
- `user_store_relations`：用户与门店关系，支持多门店、默认门店、门店内角色与岗位。
- `memories`：客户 / 宠物 / 团队经验等长期记忆，支持来源录音、结构化 JSON、文本与软删除。T04 起个人 Memory 使用 `memory_type = personal_memory` 与 `user_id` 绑定。
- `memory_update_suggestions`：AI 对 Memory 的更新建议，支持待确认、接受、拒绝状态。T04 起个人 Memory 建议使用 `suggestion_type = personal_memory_update`，只有用户接受后才写入 `memories`。
- `recordings`：录音或音频上传记录，保存内部音频地址、转写文本、AI 识别场景、处理状态、宠主和宠物信息。T05 起 `audio_url` 使用 `internal://...` 私有路径，不保存公开永久 URL。
- `generation_results`：AI 生成结果，按录音和结果类型保存结构化内容、文本内容、模块状态、采纳状态与版本。
- `generation_feedback`：用户对生成结果的采纳、不采纳、重新生成反馈。
- `todos`：智能回访和人工跟进待办，关联用户、录音和生成结果。
- `custom_tool_requirements`：自建工具需求草稿和 AI 生成需求文档记录。
- `projects`：项目集合，用于承载后续项目化资料和事项。
- `project_items`：项目条目，支持排序、状态与软删除。
- `resources`：资源资料，支持用户、门店、项目维度归属。
- `audit_logs`：审计日志，记录操作人、动作、目标、前后数据、IP 和 User-Agent。
- `ai_call_logs`：AI 调用日志，记录 provider、模型、token、耗时、状态、错误和预估成本。T03 起转写 Provider 和 LLM Provider 的 mock / 占位调用都会写入该表。

## 必填字段覆盖

T01 已覆盖任务卡指定字段：

- `users`：`id`、`username`、`password_hash`、`phone`、`nickname`、`avatar`、`role`、`position`、`city`、`current_store_id`、`is_director`、`created_at`、`updated_at`、`last_login_at`、`status`。
- `recordings`：`id`、`user_id`、`store_id`、`audio_url`、`audio_format`、`audio_duration`、`upload_type`、`transcript_text`、`ai_detected_scene`、`processing_status`、`pet_owner_name`、`pet_name`、`error_message`、`created_at`、`updated_at`、`deleted_at`。
- `generation_results`：`id`、`recording_id`、`user_id`、`result_type`、`title`、`content_json`、`content_text`、`module_status`、`status`、`is_default_generated`、`version`、`confirmed_by_user`、`confirmed_at`、`created_at`、`updated_at`、`deleted_at`。
- `generation_feedback`：`id`、`generation_result_id`、`user_id`、`action`、`reason`、`custom_reason`、`created_at`，并按统一业务表约定增加 `updated_at`。
- `todos`：`id`、`user_id`、`recording_id`、`generation_result_id`、`title`、`description`、`pet_owner_name`、`pet_name`、`due_time`、`status`、`created_at`、`updated_at`。
- `audit_logs`：`id`、`user_id`、`action`、`target_type`、`target_id`、`before_data`、`after_data`、`created_at`、`ip`、`user_agent`。
- `ai_call_logs`：`id`、`user_id`、`recording_id`、`generation_result_id`、`call_type`、`provider`、`model_name`、`prompt_version`、`input_tokens`、`output_tokens`、`latency_ms`、`status`、`error_message`、`estimated_cost`、`created_at`。

## 枚举

- `recordings.processing_status`：`uploading`、`uploaded`、`transcribing`、`generating`、`completed`、`failed`。
- `generation_results.result_type`：`summary`、`medical_record`、`communication_review`、`customer_profile`、`upsell_opportunities`、`smart_followup`、`medical_risk_control`、`team_knowledge`。
- `generation_results.module_status`：`pending`、`generating`、`completed`、`failed`、`regenerated`。
- `generation_results.status`：`draft`、`saved`、`adopted`、`rejected`、`regenerated`、`confirmed`。
- `generation_feedback.action`：`adopt`、`reject`、`regenerate`。
- `todos.status`：`pending`、`completed`、`cancelled`。
- `memory_update_suggestions.status`：`pending`、`accepted`、`rejected`。
- `custom_tool_requirements.status`：`draft`、`generated`、`archived`。

SQLite 中枚举以文本字段落库，由 Prisma Client 在写入侧进行枚举值约束。

## 索引与删除

已按任务卡为核心查询字段建立索引：`user_id`、`recording_id`、`store_id`、`status`、`created_at`。部分表根据实际字段名补充了 `processing_status`、`module_status`、`result_type`、`generation_result_id`、`deleted_at`、`target_type + target_id` 等索引。

软删除字段：

- `stores.deleted_at`
- `memories.deleted_at`
- `recordings.deleted_at`
- `generation_results.deleted_at`
- `custom_tool_requirements.deleted_at`
- `projects.deleted_at`
- `project_items.deleted_at`
- `resources.deleted_at`

日志表 `audit_logs`、`ai_call_logs` 作为追加型记录，只保留 `created_at`。

## T03 AI 调用日志约定

T03 未新增数据表和迁移，沿用 T01 已创建的 `ai_call_logs`。

转写调用：

- `call_type`：`transcription`
- `provider`：来自 `TRANSCRIPTION_PROVIDER`
- `model_name`：来自 `TRANSCRIPTION_MODEL_NAME`
- `recording_id`：当前被转写的录音 ID
- `prompt_version`：为空
- `status`：`success` 或 `failed`

生成调用：

- `call_type`：`generation`
- `provider`：来自 `LLM_PROVIDER`
- `model_name`：请求传入的 `modelName`，未传时使用 `LLM_MODEL_NAME`
- `prompt_version`：按 `generationType` 映射，例如 `medical_record -> v1-medical-record`
- `input_tokens` / `output_tokens`：mock provider 使用字符长度估算，真实 provider 后续替换为实际 token
- `status`：`success` 或 `failed`

当前 provider 配置白名单：

- 转写：`mock`、`dingtalk`、`feishu`、`aliyun`、`tencent`、`manual`、`other`
- LLM：`mock`、`deepseek`、`qwen`

## T04 Memory 约定

T04 未新增数据表和迁移，沿用 T01 已创建的 `memories` 与 `memory_update_suggestions`。

个人 Memory：

- `memories.user_id`：当前用户 ID，所有读写都按当前登录用户过滤。
- `memories.store_id`：初始化时使用当前用户 `current_store_id`。
- `memories.memory_type`：固定为 `personal_memory`。
- `memories.title`：固定为 `个人 Memory`。
- `memories.content_text`：保存 Markdown 内容。
- `memories.content_json`：保存初始化字段快照。

Memory 更新建议：

- `memory_update_suggestions.user_id`：当前用户 ID。
- `memory_update_suggestions.memory_id`：关联个人 Memory；无 Memory 时可为空，接受建议时会创建 Memory。
- `memory_update_suggestions.suggestion_type`：固定为 `personal_memory_update`。
- `memory_update_suggestions.before_data`：写入建议创建前的 Memory 文本。
- `memory_update_suggestions.after_data`：写入建议接受后应保存的 Memory 文本和长期有效信息。
- `memory_update_suggestions.status`：`pending`、`accepted`、`rejected`。

## T05 录音上传约定

T05 未新增数据表和迁移，沿用 T01 已创建的 `recordings` 与 `audit_logs`。

录音音频：

- 支持格式：MP3 / WAV / M4A。
- 不支持视频文件，`video/*` MIME 或常见视频扩展名会被拒绝。
- `MAX_AUDIO_SIZE_MB` 控制最大文件大小。
- `MAX_AUDIO_DURATION_SECONDS` 控制最长音频时长；上传时传入 `durationSeconds` / `duration_seconds` 会校验，WAV 可从文件头推断时长。
- `recordings.audio_url`：保存 `internal://recordings/{userId}/{date}/{file}` 内部路径，实际文件写入 `LOCAL_STORAGE_DIR`。
- `recordings.processing_status`：`start` 创建时为 `uploading`，上传完成后为 `uploaded`。

删除审计：

- `DELETE /api/recordings/{id}` 只更新 `recordings.deleted_at`。
- 同一事务写入 `audit_logs`，`action = recording.delete`、`target_type = recording`。

## T06 录音转写约定

T06 未新增数据表和迁移，沿用 T01 已创建的 `recordings` 与 `ai_call_logs`。

转写状态：

- 发起转写时：`recordings.processing_status = transcribing`，并清空旧 `error_message`。
- 转写成功时：写入 `recordings.transcript_text`，必要时更新 `audio_duration`，状态回到可继续生成的 `uploaded`。
- 转写失败时：`recordings.processing_status = failed`，`recordings.error_message` 写入 provider 错误；`audio_url` 保持不变，允许重新转写。
- 手动编辑转写文本时：更新 `recordings.transcript_text`，状态保持 / 回到 `uploaded`，清空旧 `error_message`。

AI 调用日志：

- 每次 `POST /api/recordings/{id}/transcribe` 调用 `TranscriptionProvider`，都会通过 `transcribeAudio` 写入 `ai_call_logs`。
- 成功日志：`call_type = transcription`、`status = success`、记录 provider、模型与耗时。
- 失败日志：`call_type = transcription`、`status = failed`、记录 provider、模型、耗时与 `error_message`。

## T07 默认生成约定

T07 未新增数据表和迁移，沿用 T01 已创建的 `recordings`、`generation_results` 与 `ai_call_logs`。

默认生成范围：

- `summary`
- `medical_record`
- `communication_review`
- `customer_profile`
- `upsell_opportunities`
- `smart_followup`

不在默认生成范围：

- `medical_risk_control`
- `team_knowledge`

生成结果：

- 一次默认生成会为 6 个默认 `result_type` 各创建 1 条 `generation_results`。
- 创建时 `module_status = generating`、`status = draft`、`is_default_generated = true`。
- 单个模块成功时写入 `content_json`、`content_text`，并更新 `module_status = completed`。
- 单个模块失败时保留该行，写入失败说明，更新 `module_status = failed`。
- 重复触发默认生成时不会覆盖旧结果，而是按同一 `recording_id + result_type` 的最大 `version` 递增创建新结果。

AI 调用日志：

- 每个默认模块都会调用一次 `LLMProvider`，并写入 1 条 `ai_call_logs`。
- `ai_call_logs.call_type = generation`。
- `ai_call_logs.generation_result_id` 关联本次模块对应的 `generation_results.id`。
- 成功日志记录 `prompt_version`、token 与耗时；失败日志记录 `error_message`。

录音状态：

- 默认生成开始时：`recordings.processing_status = generating`，并清空旧 `error_message`。
- 默认生成结束后：如果 `summary` 和至少一个业务模块成功，`recordings.processing_status = completed`。
- 如果全部失败或未达到完成条件，`recordings.processing_status = failed`，并写入 `error_message`。
- 生成结束后会尝试从结果内容识别 `pet_owner_name` 和 `pet_name` 并回写 `recordings`；识别不到则保持为空。

## T08 主动生成约定

T08 未新增数据表和迁移，沿用 T01 已创建的 `generation_results`、`generation_feedback` 与 `ai_call_logs`。

主动生成范围：

- `medical_risk_control`
- `team_knowledge`

约定：

- 两个模块不在 `POST /api/recordings/{id}/generate-default-results` 的默认生成范围内。
- 用户点击对应 Tab 并确认后，分别调用 `POST /api/recordings/{id}/generate-risk-control`、`POST /api/recordings/{id}/generate-team-knowledge`。
- 主动生成结果写入 `generation_results`，`is_default_generated = false`。
- 重复主动生成不覆盖旧结果，而是按同一 `recording_id + result_type` 的最大 `version` 递增创建新结果。
- 单个主动模块生成失败时，仅该模块 `module_status = failed`，不影响其他已生成模块。
- `medical_risk_control` 展示侧必须提示人工确认，内容口径只能是 AI 辅助识别和提醒。

## T09 结果反馈与版本约定

T09 未新增数据表和迁移，沿用 T01 已创建字段：

- `generation_results.content_text`
- `generation_results.content_json`
- `generation_results.status`
- `generation_results.module_status`
- `generation_results.version`
- `generation_results.confirmed_by_user`
- `generation_results.confirmed_at`
- `generation_feedback.action`
- `generation_feedback.reason`
- `generation_feedback.custom_reason`

约定：

- 编辑保存使用 `PUT /api/generation-results/{id}` 或 `POST /api/generation-results/{id}/save`，保存后 `status = saved`。
- 保存接口支持同时编辑 `content_text` 和 `content_json`。
- 采纳使用 `POST /api/generation-results/{id}/adopt`，写入 `generation_feedback.action = adopt`，并将 `confirmed_by_user = true`、`confirmed_at = 当前时间`。
- 不采纳使用 `POST /api/generation-results/{id}/reject`，必须提交枚举 `reason`，可选 `custom_reason`。
- 不采纳原因枚举：`内容不准确`、`信息不完整`、`表达不符合医院习惯`、`医疗判断不可靠`、`话术不适合客户`、`格式不符合预期`、`其他`。
- 重新生成使用 `POST /api/generation-results/{id}/regenerate`，调用 LLM Provider 后覆盖当前结果内容，`version + 1`、`status = regenerated`，成功后 `module_status = completed`，并写入 `generation_feedback.action = regenerate`。
- 重新生成不会删除旧 `generation_feedback` 记录。
- `medical_record` 和 `medical_risk_control` 展示侧必须提示人工确认；病历、风险、用药相关内容通过 `confirmed_by_user` 与 `confirmed_at` 支撑人工确认记录。

## T10 智能回访转待办约定

T10 未新增数据表和迁移，沿用 T01 已创建的 `todos` 与 `audit_logs`。

待办字段：

- `todos.title`
- `todos.description`
- `todos.pet_owner_name`
- `todos.pet_name`
- `todos.due_time`
- `todos.recording_id`
- `todos.generation_result_id`
- `todos.status`

约定：

- 智能回访结果页通过 `POST /api/todos` 一键生成待办。
- 传入 `generation_result_id` 时，服务端校验该结果属于当前用户，并自动补齐对应 `recording_id`。
- `GET /api/todos` 只返回当前登录用户自己的待办。
- 完成待办使用 `POST /api/todos/{id}/complete`，写入 `status = completed`。
- 第一版不做定时推送，`due_time` 仅作为后续提醒调度的结构预留。
- 删除待办使用 `DELETE /api/todos/{id}`，删除 `todos` 记录并写入 `audit_logs.action = todo.delete`。

## T18 占位模块约定

T18 未新增数据表和迁移，沿用 T01 已创建的 `projects`、`project_items` 与 `resources`。

资源库：

- `resources` 表继续作为后续工具生成内容的结构预留。
- 未来资源类型包括文案、图片、报告、工具生成物、技能包输出结果。
- T18 只提供占位入口和列表结构，不提供真实资源创建、上传、编辑或检索能力。

项目空间：

- `projects.user_id`：项目归属当前登录用户。
- `projects.store_id`：创建时使用当前用户 `current_store_id`。
- `project_items.project_id`：条目归属项目。
- `project_items.user_id`：创建条目的当前用户。
- `project_items.item_type`：T18 预留 `note`、`recording`、`conversation`、`file`、`resource`、`todo`、`memory`、`tool_output`。
- 项目接口默认按当前用户和 `deleted_at = null` 过滤。

院长看板：

- T18 不读取真实统计数据，不新增统计表。
- 院长看板接口只返回指标卡结构，指标值使用 `null`，由前端展示为占位状态。

## T20 异常处理与审计加固约定

T20 不新增数据表和迁移，沿用 T01 已创建的 `audit_logs`。

审计日志：

- 删除录音继续使用软删除，写入 `audit_logs.action = recording.delete`，`target_type = recording`。
- 删除待办继续硬删除，写入 `audit_logs.action = todo.delete`，`target_type = todo`。
- 生成结果保存、采纳、不采纳、重新生成和软删除分别写入 `generation_result.update`、`generation_result.adopt`、`generation_result.reject`、`generation_result.regenerate`、`generation_result.delete`。
- 上述审计均记录 `before_data` 和 `after_data`，保留操作前后核心字段快照。
- `GET /api/audit-logs` 只允许管理员、院长或开发环境访问；第一版不向普通前端暴露。

异常处理：

- 录音失败、上传失败、格式不支持、转写失败、AI 生成失败、导出失败、网络中断和登录过期均需在前端展示明确中文提示。
- 失败状态不得删除已成功的录音、转写文本或已完成的生成结果；用户可重新处理。

安全提示：

- 所有 AI 结果展示通用“AI 生成内容仅供辅助，需人工确认”提示。
- 病历、医疗风险和用药相关内容展示强人工确认提示。
- 开始录音前需再次确认已取得沟通对象同意。
- 登录后首次隐私授权提示继续按用户维度本地保存，并保留后端字段扩展 TODO。
