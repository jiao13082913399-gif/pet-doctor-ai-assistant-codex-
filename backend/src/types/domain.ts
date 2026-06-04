export const recordingProcessingStatuses = [
  'uploading',
  'uploaded',
  'transcribing',
  'generating',
  'completed',
  'failed',
] as const;

export type RecordingProcessingStatus = (typeof recordingProcessingStatuses)[number];

export const generationResultTypes = [
  'summary',
  'medical_record',
  'communication_review',
  'customer_profile',
  'upsell_opportunities',
  'smart_followup',
  'medical_risk_control',
  'team_knowledge',
] as const;

export type GenerationResultType = (typeof generationResultTypes)[number];

export const generationModuleStatuses = [
  'pending',
  'generating',
  'completed',
  'failed',
  'regenerated',
] as const;

export type GenerationModuleStatus = (typeof generationModuleStatuses)[number];

export const generationStatuses = [
  'draft',
  'saved',
  'adopted',
  'rejected',
  'regenerated',
  'confirmed',
] as const;

export type GenerationStatus = (typeof generationStatuses)[number];

export const generationFeedbackActions = ['adopt', 'reject', 'regenerate'] as const;

export type GenerationFeedbackAction = (typeof generationFeedbackActions)[number];

export const generationRejectReasons = [
  '内容不准确',
  '信息不完整',
  '表达不符合医院习惯',
  '医疗判断不可靠',
  '话术不适合客户',
  '格式不符合预期',
  '其他',
] as const;

export type GenerationRejectReason = (typeof generationRejectReasons)[number];

export const todoStatuses = ['pending', 'completed', 'cancelled'] as const;

export type TodoStatus = (typeof todoStatuses)[number];

export const memoryUpdateSuggestionStatuses = ['pending', 'accepted', 'rejected'] as const;

export type MemoryUpdateSuggestionStatus = (typeof memoryUpdateSuggestionStatuses)[number];

export const customToolRequirementStatuses = ['draft', 'generated', 'archived'] as const;

export type CustomToolRequirementStatus = (typeof customToolRequirementStatuses)[number];

export const transcriptionProviders = [
  'mock',
  'dingtalk',
  'feishu',
  'aliyun',
  'tencent',
  'manual',
  'other',
] as const;

export type TranscriptionProviderName = (typeof transcriptionProviders)[number];

export const llmProviders = ['mock', 'deepseek', 'qwen'] as const;

export type LLMProviderName = (typeof llmProviders)[number];

export const promptVersions = {
  summary: 'v1-summary',
  medical_record: 'v1-medical-record',
  communication_review: 'v1-communication-review',
  customer_profile: 'v1-customer-profile',
  upsell_opportunities: 'v1-upsell-opportunities',
  smart_followup: 'v1-smart-followup',
  medical_risk_control: 'v1-medical-risk-control',
  team_knowledge: 'v1-team-knowledge',
} as const satisfies Record<GenerationResultType, string>;

export type PromptVersion = (typeof promptVersions)[GenerationResultType];
