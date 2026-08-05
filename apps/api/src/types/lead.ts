export interface Lead {
  id: string;
  businessName: string;
  ownerName: string | null;
  website: string | null;
  niche: string;
  country: string;
  status: string;
  auditScore: number | null;
  createdAt: string;
}
