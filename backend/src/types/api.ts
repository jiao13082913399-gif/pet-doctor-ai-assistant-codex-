export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface UserProfile {
  id: string;
  username: string;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  role: string;
  position: string | null;
  city: string | null;
  currentStoreId: string | null;
  isDirector: boolean;
  lastLoginAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenResponse {
  token: string;
  user: UserProfile;
}

export interface MockTranscriptionResponse {
  provider: string;
  modelName: string;
  recordingId: string;
  transcriptText: string;
  detectedSpeakers: string[];
  duration: number | null;
}

export interface LLMTokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface MockGenerationResponse {
  provider: string;
  modelName: string;
  generationType: string;
  promptVersion: string;
  contentJson: unknown;
  contentText: string;
  tokens: LLMTokenUsage;
  latency: number;
}

export interface MemoryResponse {
  id: string;
  userId: string;
  storeId: string | null;
  memoryType: string;
  title: string | null;
  contentJson: unknown;
  contentText: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySuggestionResponse {
  id: string;
  memoryId: string | null;
  userId: string;
  recordingId: string | null;
  generationResultId: string | null;
  suggestionType: string;
  beforeData: unknown;
  afterData: unknown;
  reason: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryDetailResponse {
  memory: MemoryResponse | null;
  pendingSuggestions: MemorySuggestionResponse[];
}

export interface MemorySuggestionsResponse {
  created: boolean;
  suggestion: MemorySuggestionResponse | null;
  pendingSuggestions: MemorySuggestionResponse[];
}

export interface RecordingResponse {
  id: string;
  userId: string;
  storeId: string | null;
  audioUrl: string;
  audioFormat: string | null;
  audioDuration: number | null;
  uploadType: string;
  transcriptText: string | null;
  aiDetectedScene: string | null;
  processingStatus: string;
  petOwnerName: string | null;
  petName: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type RecordingListItemResponse = RecordingResponse;

export interface RecordingDetailResponse {
  recording: RecordingResponse;
  transcriptText: string | null;
  petBinding: {
    petOwnerName: string | null;
    petName: string | null;
    memories: Array<{
      id: string;
      memoryType: string;
      title: string | null;
      petOwnerName: string | null;
      petName: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  generationResults: Array<{
    id: string;
    recordingId: string;
    userId: string;
    resultType: string;
    title: string;
    contentJson: unknown;
    contentText: string | null;
    moduleStatus: string;
    status: string;
    isDefaultGenerated: boolean;
    version: number;
    confirmedByUser: boolean;
    confirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface GenerationResultResponse {
  id: string;
  recordingId: string;
  userId: string;
  resultType: string;
  title: string;
  contentJson: unknown;
  contentText: string | null;
  moduleStatus: string;
  status: string;
  isDefaultGenerated: boolean;
  version: number;
  confirmedByUser: boolean;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodoResponse {
  id: string;
  userId: string;
  recordingId: string | null;
  generationResultId: string | null;
  title: string;
  description: string | null;
  petOwnerName: string | null;
  petName: string | null;
  dueTime: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogResponse {
  id: string;
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  beforeData: unknown;
  afterData: unknown;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
}

export interface CustomToolConversationMessageResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CustomToolConversationResponse {
  id: string;
  userId: string;
  messages: CustomToolConversationMessageResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomToolMessageResponse {
  conversationId: string;
  userMessage: CustomToolConversationMessageResponse;
  assistantMessage: CustomToolConversationMessageResponse;
  messages: CustomToolConversationMessageResponse[];
}

export interface CustomToolRequirementResponse {
  id: string;
  userId: string;
  recordingId: string | null;
  generationResultId: string | null;
  title: string;
  description: string | null;
  requirementJson: unknown;
  requirementText: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ResourceResponse {
  id: string;
  userId: string | null;
  storeId: string | null;
  projectId: string | null;
  title: string;
  resourceType: string;
  url: string | null;
  contentText: string | null;
  metadataJson: unknown;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ResourcesPlaceholderResponse {
  status: 'placeholder';
  message: string;
  futureTypes: string[];
  resources: ResourceResponse[];
}

export interface ProjectResponse {
  id: string;
  userId: string;
  storeId: string | null;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectItemResponse {
  id: string;
  projectId: string;
  userId: string | null;
  title: string;
  description: string | null;
  itemType: string;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectDetailResponse {
  project: ProjectResponse;
  items: ProjectItemResponse[];
  futureAssociations: string[];
}

export interface DirectorMetricPlaceholder {
  key: string;
  label: string;
  value: number | null;
  placeholder: boolean;
}

export interface DirectorDashboardPlaceholderResponse {
  status: 'placeholder';
  message: string;
  metrics: DirectorMetricPlaceholder[];
}

export interface RecordingDefaultGenerationResponse {
  recording: RecordingResponse;
  generationResults: GenerationResultResponse[];
  moduleResults: Array<{
    generationResultId: string;
    resultType: string;
    moduleStatus: string;
    errorMessage: string | null;
  }>;
  succeededTypes: string[];
  failedTypes: string[];
  petBinding: {
    petOwnerName: string | null;
    petName: string | null;
  };
}

export interface RecordingProactiveGenerationResponse {
  generationResult: GenerationResultResponse;
  moduleResult: {
    generationResultId: string;
    resultType: string;
    moduleStatus: string;
    errorMessage: string | null;
  };
}

export interface RecordingTranscriptResponse {
  recordingId: string;
  transcriptText: string | null;
  processingStatus: string;
  errorMessage: string | null;
  updatedAt: string;
}

export interface RecordingBindingUpdateResponse {
  recording: RecordingResponse;
  petBinding: {
    petOwnerName: string | null;
    petName: string | null;
  };
}

export interface RecordingTranscriptionResponse {
  recording: RecordingResponse;
  transcript: RecordingTranscriptResponse;
  provider: string;
  modelName: string;
  detectedSpeakers: string[];
  duration: number | null;
}
