import { z } from 'zod';

export const CreateLeadSchema = z.object({
  businessName: z.string().min(2).max(255),
  ownerName: z.string().max(255).optional(),
  niche: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
  website: z.string().url().max(500).optional(),
  email: z.string().email().max(255).optional(),
  whatsapp: z.string().max(30).optional(),
  linkedin: z.string().url().max(500).optional(),
  instagram: z.string().url().max(500).optional(),
  auditScore: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(10000).optional(),
});

export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;
