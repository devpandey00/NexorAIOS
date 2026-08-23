export type IntegrationCategory = 'ai' | 'crm' | 'automation' | 'browser' | 'communications' | 'email' | 'calendar' | 'video' | 'content' | 'analytics' | 'ads' | 'seo' | 'storage' | 'jobs';

export interface NexorIntegration {
  id: string;
  name: string;
  category: IntegrationCategory;
  env: readonly string[];
  capabilities: readonly string[];
  optional: boolean;
}

export const NEXOR_INTEGRATIONS: readonly NexorIntegration[] = [
  { id: 'postgres', name: 'PostgreSQL', category: 'crm', env: ['DATABASE_URL'], capabilities: ['crm', 'projects', 'finance', 'audit'], optional: false },
  { id: 'redis', name: 'Redis', category: 'automation', env: ['REDIS_URL'], capabilities: ['queues', 'cache', 'rate-limit'], optional: true },
  { id: 's3', name: 'S3-compatible storage', category: 'storage', env: ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'], capabilities: ['uploads', 'media', 'backups'], optional: true },
  { id: 'openai', name: 'OpenAI', category: 'ai', env: ['OPENAI_API_KEY'], capabilities: ['reasoning', 'structured-output', 'agents'], optional: true },
  { id: 'anthropic', name: 'Anthropic', category: 'ai', env: ['ANTHROPIC_API_KEY'], capabilities: ['reasoning', 'agents'], optional: true },
  { id: 'gemini', name: 'Google Gemini', category: 'ai', env: ['GEMINI_API_KEY'], capabilities: ['vision', 'multimodal', 'content'], optional: true },
  { id: 'search', name: 'Web Search', category: 'seo', env: ['SERPER_API_KEY'], capabilities: ['research', 'competitor-analysis', 'lead-enrichment'], optional: true },
  { id: 'whatsapp', name: 'WhatsApp Cloud API', category: 'communications', env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'], capabilities: ['messages', 'media', 'webhooks'], optional: true },
  { id: 'email', name: 'Resend', category: 'email', env: ['RESEND_API_KEY'], capabilities: ['transactional-email', 'outreach', 'reports'], optional: true },
  { id: 'meta', name: 'Meta Graph API', category: 'ads', env: ['META_ACCESS_TOKEN', 'META_APP_ID', 'META_APP_SECRET'], capabilities: ['instagram', 'facebook', 'pages', 'ads'], optional: true },
  { id: 'google-ads', name: 'Google Ads', category: 'ads', env: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'], capabilities: ['campaigns', 'keywords', 'ads', 'reporting'], optional: true },
  { id: 'google-analytics', name: 'Google Analytics', category: 'analytics', env: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID'], capabilities: ['analytics', 'events', 'reports'], optional: true },
  { id: 'search-console', name: 'Search Console', category: 'seo', env: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GSC_SITE_URL'], capabilities: ['seo', 'search-performance', 'indexing'], optional: true },
  { id: 'wordpress', name: 'WordPress', category: 'content', env: ['WORDPRESS_URL', 'WORDPRESS_USERNAME', 'WORDPRESS_APP_PASSWORD'], capabilities: ['posts', 'pages', 'media', 'publishing'], optional: true },
  { id: 'openchatcut', name: 'OpenChatCut', category: 'video', env: ['OPENCHATCUT_MCP_URL', 'OPENCHATCUT_MCP_TOKEN', 'OPENCHATCUT_EDITOR_URL'], capabilities: ['timeline', 'captions', 'effects', 'shorts', 'rendering'], optional: true },
  { id: 'browser', name: 'Browser Automation', category: 'browser', env: [], capabilities: ['research', 'forms', 'screenshots', 'testing'], optional: true },
  { id: 'job-agent', name: 'Job Agent', category: 'jobs', env: [], capabilities: ['job-discovery', 'matching', 'application-tracking'], optional: true },
] as const;

export function getIntegration(id: string): NexorIntegration | undefined {
  return NEXOR_INTEGRATIONS.find((integration) => integration.id === id);
}

export function getConfiguredIntegrations(env: Record<string, string | undefined>): NexorIntegration[] {
  return NEXOR_INTEGRATIONS.filter((integration) => integration.env.length === 0 || integration.env.every((key) => Boolean(env[key]?.trim())));
}
