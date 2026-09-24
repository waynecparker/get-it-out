// Configurable, not hard-coded through the app — this is the single place
// the safety-support panel's contacts and order live. Order matters:
// Lifeline first (trained human conversation is the preferred first step),
// then 13YARN, then Triple Zero last (visible, but not positioned as the
// automatic first response).

export interface SafetyContact {
  key: string;
  name: string;
  number: string;
  /** Digits only, for the tel: URI. */
  dialNumber: string;
  label: string;
}

export const SAFETY_CONTACTS: SafetyContact[] = [
  {
    key: 'lifeline',
    name: 'Talk to Lifeline',
    number: '13 11 14',
    dialNumber: '131114',
    label: 'Talk with a trained crisis supporter',
  },
  {
    key: '13yarn',
    name: 'Call 13YARN',
    number: '13 92 76',
    dialNumber: '139276',
    label: 'Aboriginal and Torres Strait Islander crisis support',
  },
  {
    key: 'triple-zero',
    name: 'Call Triple Zero',
    number: '000',
    dialNumber: '000',
    label: 'If life is in immediate danger',
  },
];
