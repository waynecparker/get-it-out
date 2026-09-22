import { Conversation } from '@/types/conversation';

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    title: 'Jerry doing my head in',
    createdAt: '2026-09-19T18:22:00.000Z',
    lastMessageAt: '2026-09-19T18:26:00.000Z',
    isPinned: true,
    messages: [
      {
        id: 'c1-m1',
        role: 'user',
        content: 'Fuck me, Jerry pissed me off at work today. I nearly lost it.',
        createdAt: '2026-09-19T18:22:00.000Z',
      },
      {
        id: 'c1-m2',
        role: 'assistant',
        content: "Yeah, mate. I can hear how much that's wound you up. Get it out — what happened next?",
        createdAt: '2026-09-19T18:22:30.000Z',
      },
      {
        id: 'c1-m3',
        role: 'user',
        content: "He took credit for the whole job again, right in front of the boss. Third time this year.",
        createdAt: '2026-09-19T18:24:00.000Z',
        responseMode: 'unpack',
      },
      {
        id: 'c1-m4',
        role: 'assistant',
        content: "Third time — that's not a one-off, that's a pattern. When it happened today, what did you do in the moment?",
        createdAt: '2026-09-19T18:24:20.000Z',
      },
    ],
  },
  {
    id: 'c2',
    title: "Son didn't call",
    createdAt: '2026-09-17T20:05:00.000Z',
    lastMessageAt: '2026-09-17T20:11:00.000Z',
    isPinned: false,
    messages: [
      {
        id: 'c2-m1',
        role: 'user',
        content: "My son was supposed to call today but didn't. I messaged him five times and it bloody hurts.",
        createdAt: '2026-09-17T20:05:00.000Z',
      },
      {
        id: 'c2-m2',
        role: 'assistant',
        content: "That's a hard kind of quiet to sit with. I'm here — keep going if you want to.",
        createdAt: '2026-09-17T20:05:25.000Z',
      },
      {
        id: 'c2-m3',
        role: 'user',
        content: "That made me want to drink, smoke or punch something.",
        createdAt: '2026-09-17T20:09:00.000Z',
        responseMode: 'vent',
      },
      {
        id: 'c2-m4',
        role: 'assistant',
        content: "Fair enough. Keep talking, I'm not going anywhere.",
        createdAt: '2026-09-17T20:09:15.000Z',
      },
    ],
  },
  {
    id: 'c3',
    title: 'Rough shift, couldn\'t switch off',
    createdAt: '2026-09-12T22:40:00.000Z',
    lastMessageAt: '2026-09-12T22:47:00.000Z',
    isPinned: false,
    messages: [
      {
        id: 'c3-m1',
        role: 'user',
        content: "Got home two hours ago and I still can't switch my brain off. Everything's just sitting there.",
        createdAt: '2026-09-12T22:40:00.000Z',
      },
      {
        id: 'c3-m2',
        role: 'assistant',
        content: 'Sounds like it really landed hard. Take your time, I\'m listening.',
        createdAt: '2026-09-12T22:40:20.000Z',
      },
    ],
  },
];
