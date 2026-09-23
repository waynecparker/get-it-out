import { ResponseMode } from '@/types/conversation';

export const RESPONSE_MODE_LABELS: Record<ResponseMode, string> = {
  vent: 'Let me vent',
  unpack: 'Help me unpack it',
  action: 'What can I do?',
};
