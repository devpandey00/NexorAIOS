import { buildWhatsAppPrompt, type PersonalizationInput } from './personalizer.js';

export interface WhatsAppDraft {
  prompt: string;
  generatedMessage?: string;
}

export class WhatsAppDraftService {
  createPrompt(input: PersonalizationInput): string {
    return buildWhatsAppPrompt(input);
  }

  createDraft(input: PersonalizationInput): WhatsAppDraft {
    return {
      prompt: this.createPrompt(input),
    };
  }
}

export const whatsappDraftService = new WhatsAppDraftService();
