import {
  Prisma,
  type GenerationResult,
  type Memory,
  type Recording,
  type User,
} from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { getPromptVersion } from '../ai/prompt-version.js';
import { generateWithLLM } from '../ai/llm-service.js';
import type { GenerationResultType } from '../../types/domain.js';

export const defaultGenerationTypes = [
  'summary',
  'medical_record',
  'communication_review',
  'customer_profile',
  'upsell_opportunities',
  'smart_followup',
] as const satisfies GenerationResultType[];

export const proactiveGenerationTypes = [
  'medical_risk_control',
  'team_knowledge',
] as const satisfies GenerationResultType[];

const businessGenerationTypes = defaultGenerationTypes.filter(
  (generationType) => generationType !== 'summary',
);

export const generationTitleMap = {
  summary: '总摘要',
  medical_record: '病历草稿',
  communication_review: '沟通复盘',
  customer_profile: '客户画像',
  upsell_opportunities: '服务机会',
  smart_followup: '智能回访',
  medical_risk_control: '医疗风险防控',
  team_knowledge: '团队经验共享',
} as const satisfies Record<GenerationResultType, string>;

const generationRequirementMap = {
  summary: ['输出本次接诊沟通的总摘要。', '覆盖主要问题、医生建议、宠主关注点、后续动作。'],
  medical_record: [
    '输出字段：主诉、现病史、既往史、体格检查、初步判断、检查建议、治疗建议、医嘱、复诊建议、待医生确认事项。',
    '不能替代医生诊断，缺失信息请明确标注待确认。',
  ],
  communication_review: [
    '输出字段：沟通完整度、是否充分追问、宠主疑虑点、价格敏感点、风险告知是否充分、异议处理、表达清晰度、可改进话术。',
  ],
  customer_profile: [
    '输出字段：宠主姓名、宠物姓名、品种、年龄、主要病史、用药禁忌、养护理念、价格敏感度、检查接受度、沟通偏好、潜在需求、回访关注点。',
  ],
  upsell_opportunities: [
    '输出字段：机会名称、触发依据、推荐理由、推荐话术、注意事项、是否需要医生确认。',
    '推荐必须基于医疗服务价值，避免过度销售。',
  ],
  smart_followup: [
    '输出字段：回访对象、宠物名、回访节点、回访原因、建议回访时间、回访话术、注意事项、是否需要复诊提醒。',
  ],
  medical_risk_control: [
    '输出字段：麻醉风险、手术风险、重症风险、输血风险、侵入性检查风险、费用争议风险、宠主未充分理解的风险、风险告知是否完整、需要补充确认的内容。',
    '必须明确这是 AI 辅助识别和提醒，不得表达为 AI 已完成风险判断。',
    '必须提示医生人工确认，并指出缺失信息需由医生补充核实。',
  ],
  team_knowledge: [
    '输出字段：典型病例摘要、优秀话术、处置路径、沟通技巧、可沉淀经验、脱敏建议。',
    '团队共享内容必须脱敏，不能包含手机号、完整地址、身份证号、支付信息等隐私信息。',
  ],
} as const satisfies Record<GenerationResultType, string[]>;

export interface DefaultGenerationModuleResult {
  generationResult: GenerationResult;
  resultType: GenerationResultType;
  moduleStatus: 'completed' | 'failed';
  errorMessage: string | null;
}

export interface DefaultGenerationRunResult {
  recording: Recording;
  generationResults: GenerationResult[];
  moduleResults: DefaultGenerationModuleResult[];
  succeededTypes: GenerationResultType[];
  failedTypes: GenerationResultType[];
  petOwnerName: string | null;
  petName: string | null;
}

function isDefaultGenerationType(
  generationType: GenerationResultType,
): generationType is (typeof defaultGenerationTypes)[number] {
  return defaultGenerationTypes.includes(generationType as (typeof defaultGenerationTypes)[number]);
}

export function buildGenerationPrompt(generationType: GenerationResultType): string {
  return [
    `你是宠物医院一线接诊场景的 AI 医助，请生成 ${generationTitleMap[generationType]}。`,
    '请严格输出结构化 JSON 和可展示文本，内容要能直接支撑前端模块展示。',
    ...generationRequirementMap[generationType],
  ].join('\n');
}

function buildContext(input: {
  recording: Recording;
  user: User;
  memories: Memory[];
}): Record<string, unknown> {
  const { recording, user, memories } = input;
  const personalMemory = memories.find((memory) => memory.memoryType === 'personal_memory');

  return {
    transcriptText: recording.transcriptText,
    recording: {
      id: recording.id,
      storeId: recording.storeId,
      audioFormat: recording.audioFormat,
      audioDuration: recording.audioDuration,
      uploadType: recording.uploadType,
      aiDetectedScene: recording.aiDetectedScene,
      petOwnerName: recording.petOwnerName,
      petName: recording.petName,
      createdAt: recording.createdAt.toISOString(),
    },
    user: {
      id: user.id,
      role: user.role,
      position: user.position,
      city: user.city,
      currentStoreId: user.currentStoreId,
      isDirector: user.isDirector,
    },
    memory: personalMemory
      ? {
          id: personalMemory.id,
          title: personalMemory.title,
          contentText: personalMemory.contentText,
          contentJson: personalMemory.contentJson,
        }
      : null,
    relatedMemories: memories
      .filter((memory) => memory.id !== personalMemory?.id)
      .map((memory) => ({
        id: memory.id,
        memoryType: memory.memoryType,
        title: memory.title,
        petOwnerName: memory.petOwnerName,
        petName: memory.petName,
        contentText: memory.contentText,
        contentJson: memory.contentJson,
      })),
  };
}

async function findGenerationVersion(
  recordingId: string,
  generationType: GenerationResultType,
): Promise<number> {
  const latest = await prisma.generationResult.findFirst({
    where: {
      recordingId,
      resultType: generationType,
      deletedAt: null,
    },
    orderBy: {
      version: 'desc',
    },
  });

  return (latest?.version ?? 0) + 1;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown generation error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNestedString(value: unknown, keys: string[]): string | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const directValue = readText(value[key]);
    if (directValue) {
      return directValue;
    }
  }

  for (const child of Object.values(value)) {
    const nestedValue = readNestedString(child, keys);
    if (nestedValue) {
      return nestedValue;
    }
  }

  return null;
}

function extractLabeledValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}[：:]\\s*([^\\n，,；;。]+)`));
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractPetBindingFromResults(results: GenerationResult[]): {
  petOwnerName: string | null;
  petName: string | null;
} {
  let petOwnerName: string | null = null;
  let petName: string | null = null;

  for (const result of results) {
    petOwnerName ??= readNestedString(result.contentJson, [
      'petOwnerName',
      'ownerName',
      'customerName',
      '宠主姓名',
      '宠主',
    ]);
    petName ??= readNestedString(result.contentJson, ['petName', '宠物姓名', '宠物名']);

    const contentText = result.contentText;
    if (contentText) {
      petOwnerName ??= extractLabeledValue(contentText, ['宠主姓名', '宠主名', '宠主']);
      petName ??= extractLabeledValue(contentText, ['宠物姓名', '宠物名', '宠物']);
    }

    if (petOwnerName && petName) {
      break;
    }
  }

  return { petOwnerName, petName };
}

async function createAndGenerateModule(input: {
  recording: Recording;
  user: User;
  context: Record<string, unknown>;
  generationType: GenerationResultType;
  isDefaultGenerated?: boolean;
}): Promise<DefaultGenerationModuleResult> {
  const { recording, user, context, generationType, isDefaultGenerated = true } = input;
  const version = await findGenerationVersion(recording.id, generationType);
  const generationResult = await prisma.generationResult.create({
    data: {
      recordingId: recording.id,
      userId: user.id,
      resultType: generationType,
      title: generationTitleMap[generationType],
      moduleStatus: 'generating',
      status: 'draft',
      isDefaultGenerated,
      version,
    },
  });

  try {
    const promptVersion = getPromptVersion(generationType);
    const generated = await generateWithLLM(
      {
        prompt: buildGenerationPrompt(generationType),
        context,
        generationType,
      },
      {
        userId: user.id,
        recordingId: recording.id,
        generationResultId: generationResult.id,
        promptVersion,
      },
    );

    const updatedGenerationResult = await prisma.generationResult.update({
      where: {
        id: generationResult.id,
      },
      data: {
        title: generationTitleMap[generationType],
        contentJson: generated.contentJson as Prisma.InputJsonValue,
        contentText: generated.contentText,
        moduleStatus: 'completed',
      },
    });

    return {
      generationResult: updatedGenerationResult,
      resultType: generationType,
      moduleStatus: 'completed',
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const updatedGenerationResult = await prisma.generationResult.update({
      where: {
        id: generationResult.id,
      },
      data: {
        contentJson: {
          error: {
            message: errorMessage,
          },
        },
        contentText: `生成失败：${errorMessage}`,
        moduleStatus: 'failed',
      },
    });

    return {
      generationResult: updatedGenerationResult,
      resultType: generationType,
      moduleStatus: 'failed',
      errorMessage,
    };
  }
}

export async function buildGenerationContext(input: {
  recording: Recording;
  user: User;
}): Promise<Record<string, unknown>> {
  const { recording, user } = input;
  const memoryFilters: Prisma.MemoryWhereInput[] = [
    {
      memoryType: 'personal_memory',
    },
    {
      sourceRecordingId: recording.id,
    },
  ];

  if (recording.petOwnerName) {
    memoryFilters.push({
      petOwnerName: recording.petOwnerName,
    });
  }

  if (recording.petName) {
    memoryFilters.push({
      petName: recording.petName,
    });
  }

  const memories = await prisma.memory.findMany({
    where: {
      userId: user.id,
      status: 'active',
      deletedAt: null,
      OR: memoryFilters,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 20,
  });

  return buildContext({ recording, user, memories });
}

export async function generateSingleProactiveResultForRecording(input: {
  recording: Recording;
  user: User;
  generationType: (typeof proactiveGenerationTypes)[number];
}): Promise<DefaultGenerationModuleResult> {
  const { recording, user, generationType } = input;
  const context = await buildGenerationContext({ recording, user });

  return createAndGenerateModule({
    recording,
    user,
    context,
    generationType,
    isDefaultGenerated: false,
  });
}

export async function generateDefaultResultsForRecording(input: {
  recording: Recording;
  user: User;
}): Promise<DefaultGenerationRunResult> {
  const { recording, user } = input;
  const context = await buildGenerationContext({ recording, user });

  await prisma.recording.update({
    where: {
      id: recording.id,
    },
    data: {
      processingStatus: 'generating',
      errorMessage: null,
    },
  });

  const moduleResults: DefaultGenerationModuleResult[] = [];
  for (const generationType of defaultGenerationTypes) {
    moduleResults.push(
      await createAndGenerateModule({
        recording,
        user,
        context,
        generationType,
      }),
    );
  }

  const generationResults = moduleResults.map((moduleResult) => moduleResult.generationResult);
  const succeededTypes = moduleResults
    .filter((moduleResult) => moduleResult.moduleStatus === 'completed')
    .map((moduleResult) => moduleResult.resultType)
    .filter(isDefaultGenerationType);
  const failedTypes = moduleResults
    .filter((moduleResult) => moduleResult.moduleStatus === 'failed')
    .map((moduleResult) => moduleResult.resultType)
    .filter(isDefaultGenerationType);
  const hasSummarySucceeded = succeededTypes.includes('summary');
  const hasBusinessModuleSucceeded = businessGenerationTypes.some((generationType) =>
    succeededTypes.includes(generationType),
  );
  const nextProcessingStatus =
    hasSummarySucceeded && hasBusinessModuleSucceeded ? 'completed' : 'failed';
  const nextErrorMessage =
    nextProcessingStatus === 'completed'
      ? null
      : succeededTypes.length === 0
        ? '默认生成全部失败'
        : '默认生成未达到完成条件：至少需要 summary 和一个业务模块成功';
  const generatedPetBinding = extractPetBindingFromResults(generationResults);
  const nextPetOwnerName = recording.petOwnerName ?? generatedPetBinding.petOwnerName;
  const nextPetName = recording.petName ?? generatedPetBinding.petName;

  const updatedRecording = await prisma.recording.update({
    where: {
      id: recording.id,
    },
    data: {
      processingStatus: nextProcessingStatus,
      errorMessage: nextErrorMessage,
      petOwnerName: nextPetOwnerName,
      petName: nextPetName,
    },
  });

  return {
    recording: updatedRecording,
    generationResults,
    moduleResults,
    succeededTypes,
    failedTypes,
    petOwnerName: updatedRecording.petOwnerName,
    petName: updatedRecording.petName,
  };
}
