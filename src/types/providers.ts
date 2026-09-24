import { Message, ResponseMode } from '@/types/conversation';

export interface TranscriptionProvider {
  transcribe(audioUri: string): Promise<string>;
}

export interface AIResponseContext {
  transcript: string;
  history: Message[];
  // 'stepdown' is a request-time-only tone hint for the post-crisis
  // handover flow — never persisted on a Message (that stays ResponseMode).
  responseMode?: ResponseMode | 'stepdown';
  /** True once this conversation has previously reached "immediate" risk and hasn't been resolved yet. */
  crisisModeActive?: boolean;
}

export type SafetyRiskLevel = 'none' | 'concerning' | 'immediate';
export type SafetyRiskType = 'self_harm' | 'harm_to_others' | 'medical' | 'intoxication_risk';

export interface AIReply {
  content: string;
  riskLevel: SafetyRiskLevel;
  riskType?: SafetyRiskType;
  /** Only meaningful when the request was sent with crisisModeActive: true. */
  crisisResolved?: boolean;
  /** True when this reply itself asks the means-check yes/no question. */
  awaitingMeansCheck?: boolean;
}

export interface AIResponseProvider {
  generateReply(context: AIResponseContext): Promise<AIReply>;
}
