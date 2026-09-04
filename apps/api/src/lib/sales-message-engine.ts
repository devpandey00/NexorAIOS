export type SalesMessageChannel = 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN';

export type SalesMessageInput = {
  businessName: string;
  country?: string | null;
  website?: string | null;
  service?: string | null;
  requirement?: string | null;
  findings?: string[] | null;
  channel: SalesMessageChannel;
  stage?: 'FIRST_TOUCH' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2' | 'BREAKUP';
  contactName?: string | null;
};

const clean = (value: string | null | undefined, fallback: string) => value?.replace(/\s+/g, ' ').trim() || fallback;

function proofPoint(input: SalesMessageInput) {
  const finding = input.findings?.find(Boolean);
  return finding ? `I noticed ${clean(finding, 'a few growth opportunities')}.` : 'I noticed a few practical opportunities to improve enquiries and conversion.';
}

export function buildSalesMessage(input: SalesMessageInput) {
  const name = clean(input.contactName, input.businessName);
  const service = clean(input.service, 'digital marketing and lead generation');
  const requirement = clean(input.requirement, service);
  const stage = input.stage ?? 'FIRST_TOUCH';
  const channel = input.channel;
  if (stage === 'FOLLOW_UP_1') return `Hi ${name}, just following up on my note. ${proofPoint(input)} If useful, I can send the 3 highest-priority actions for ${input.businessName}.`;
  if (stage === 'FOLLOW_UP_2') return `Hi ${name}, one last useful follow-up from me. I can map a simple ${requirement} plan for ${input.businessName} without any obligation. If you'd like it, just reply “send it”.`;
  if (stage === 'BREAKUP') return `Hi ${name}, I’ll close the loop here so I don’t crowd your inbox. If improving ${requirement} becomes a priority later, feel free to message me and I’ll pick it up from there.`;

  if (channel === 'EMAIL') {
    return `Subject: A quick growth observation for ${input.businessName}\n\nHi ${name},\n\n${proofPoint(input)} I work with businesses on ${service}, and I thought this might be useful for ${input.businessName}.\n\nIf you want, I can send a short 3-point action plan tailored to your business. No obligation.\n\nBest,\nDev Pandey\nNexor Media`;
  }
  return `Hi ${name}, I came across ${input.businessName}${input.country ? ` in ${input.country}` : ''}. ${proofPoint(input)} I help businesses improve ${service}.\n\nWould you like me to send 3 specific ideas for ${input.businessName}?`;
}

export function buildSalesSequence(input: Omit<SalesMessageInput, 'stage'>) {
  return (['FIRST_TOUCH', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'BREAKUP'] as const).map((stage, index) => ({
    step: index + 1,
    stage,
    recommendedDelayDays: [0, 3, 7, 14][index],
    message: buildSalesMessage({ ...input, stage }),
  }));
}
