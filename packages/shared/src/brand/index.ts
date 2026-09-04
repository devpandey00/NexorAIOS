export type NexorBrandConfig = {
  name: string;
  shortName: string;
  founder: string;
  website: string;
  contactEmail: string;
  whatsapp: string;
  instagram: string;
  linkedin: string;
  primaryColor: string;
  accentColor: string;
  font: string;
  tone: string;
  services: string[];
  defaultHashtags: string[];
};

const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

export const NEXOR_BRAND: NexorBrandConfig = {
  name: env('NEXOR_BRAND_NAME', 'Nexor Media'),
  shortName: env('NEXOR_BRAND_SHORT_NAME', 'Nexor'),
  founder: env('NEXOR_FOUNDER_NAME', 'Dev Pandey'),
  website: env('NEXOR_WEBSITE', ''),
  contactEmail: env('NEXOR_CONTACT_EMAIL', ''),
  whatsapp: env('NEXOR_WHATSAPP', ''),
  instagram: env('NEXOR_INSTAGRAM', ''),
  linkedin: env('NEXOR_LINKEDIN', ''),
  primaryColor: env('NEXOR_PRIMARY_COLOR', '#111111'),
  accentColor: env('NEXOR_ACCENT_COLOR', '#7C3AED'),
  font: env('NEXOR_FONT', 'Inter'),
  tone: env('NEXOR_TONE', 'confident, concise, professional, helpful'),
  services: ['Digital Marketing', 'Lead Generation', 'Google Ads', 'Meta Ads', 'Social Media', 'AI Automation', 'Web Development'],
  defaultHashtags: ['#NexorMedia', '#DigitalMarketing', '#LeadGeneration', '#MarketingStrategy', '#AIAutomation'],
};

export function nexorShortName() { return NEXOR_BRAND.shortName; }

export function nexorOutreachSignature() {
  return `Best,\n${NEXOR_BRAND.founder}\n${NEXOR_BRAND.name}`;
}
