export interface CreateLeadDto {
  businessName: string;
  ownerName?: string;
  niche: string;
  country: string;
  website?: string;
  email?: string;
  whatsapp?: string;
}
