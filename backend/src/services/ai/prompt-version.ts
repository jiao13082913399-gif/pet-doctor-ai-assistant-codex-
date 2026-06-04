import { promptVersions } from '../../types/domain.js';
import type { GenerationResultType, PromptVersion } from '../../types/domain.js';

export function getPromptVersion(generationType: GenerationResultType): PromptVersion {
  return promptVersions[generationType];
}
