import { z } from 'zod';
import { analyzerService } from './analyzer.service.js';

export const ReplyClassificationSchema = z.object({
  intent: z.enum([
    'INTERESTED',
    'QUESTION',
    'MEETING_REQUEST',
    'PRICE_REQUEST',
    'NOT_INTERESTED',
    'NOT_NOW',
    'WRONG_PERSON',
    'OUT_OF_OFFICE',
    'UNCLEAR',
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(500),
  nextAction: z.enum([
    'REPLY_NOW',
    'BOOK_MEETING',
    'SEND_PRICING',
    'FOLLOW_UP_LATER',
    'STOP_OUTREACH',
    'ASK_CLARIFYING_QUESTION',
    'MANUAL_REVIEW',
  ]),
  suggestedReply: z.string().max(3000),
});

export type ReplyClassification = z.infer<typeof ReplyClassificationSchema>;

export class ReplyClassifierService {
  async classify(input: {
    businessName: string;
    leadContext?: unknown;
    recentMessages: Array<{ direction: string; content: string }>;
    incomingMessage: string;
  }): Promise<ReplyClassification> {
    const prompt = `You are Nexor Media's sales reply classifier. Classify the incoming business reply using ONLY the supplied conversation and lead context. Never invent facts, pricing, services, or commitments. Return JSON only matching the requested schema.\n\nBusiness: ${input.businessName}\nLead context: ${JSON.stringify(input.leadContext ?? {})}\nRecent conversation: ${JSON.stringify(input.recentMessages)}\nIncoming message: ${input.incomingMessage}\n\nRules:\n- MEETING_REQUEST when they want to talk, call, demo, or schedule.\n- PRICE_REQUEST when they explicitly ask cost/pricing.\n- INTERESTED when positive buying intent exists without a specific meeting/pricing request.\n- QUESTION when they ask a business/service question without clear buying intent.\n- NOT_INTERESTED when they reject the offer.\n- NOT_NOW when they defer to a later time.\n- WRONG_PERSON when they say they are not responsible / wrong contact.\n- OUT_OF_OFFICE for automated absence messages.\n- UNCLEAR when intent cannot be determined reliably.\n- Confidence must reflect evidence, not optimism.\n- suggestedReply must be concise and based only on known facts.`;

    return analyzerService.analyze({
      prompt,
      schema: ReplyClassificationSchema,
    });
  }
}

export const replyClassifierService = new ReplyClassifierService();
