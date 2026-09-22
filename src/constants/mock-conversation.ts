import { ResponseMode } from '@/types/conversation';

// Checkpoint 4 replaces these with the real transcription + AI-response
// providers behind the same interface. Kept here so the whole loop is
// testable before either provider exists.

export const MOCK_TRANSCRIPTS = [
  "Fuck me, Jerry pissed me off at work today. I nearly lost it.",
  "My son was supposed to call today but didn't. I messaged him five times and it bloody hurts.",
  "That made me want to drink, smoke or punch something.",
  "Got home two hours ago and I still can't switch my brain off.",
];

export const MOCK_INITIAL_REPLIES = [
  "Yeah, mate. I can hear how much that's wound you up. Get it out — what happened next?",
  "That's a rough one to sit with. I'm here — keep going if you want to.",
  "Sounds like it really landed hard. Take your time, I'm listening.",
];

export const RESPONSE_MODE_LABELS: Record<ResponseMode, string> = {
  vent: 'Let me vent',
  unpack: 'Help me unpack it',
  action: 'What can I do?',
};

export const MOCK_FOLLOWUPS: Record<ResponseMode, string> = {
  vent: "Fair enough. Keep talking, I'm not going anywhere.",
  unpack: 'Alright — when did you first notice it building up today?',
  action: 'Okay. One small thing you could do in the next hour — what feels doable?',
};

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
