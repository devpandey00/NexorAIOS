import { z } from 'zod';

export const CreateLeadSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().optional(),
  niche: z.string().min(2),
  country: z.string().min(2),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
});

export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;
