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
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenResponse {
  token: string;
  user: UserProfile;
}

export interface MemoryResponse {
  id: string;
  userId: string;
  storeId: string | null;
  memoryType: string;
  title: string | null;
  contentText: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryDetailResponse {
  memory: MemoryResponse | null;
  pendingSuggestions: Array<{
    id: string;
    reason: string | null;
    status: string;
    createdAt: string;
  }>;
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
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  generationResults: GenerationResultResponse[];
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
