export type IntegrationStatus = 'configured' | 'available' | 'missing_config' | 'disabled';

export type IntegrationCategory =
  | 'crm'
  | 'automation'
  | 'browser'
  | 'communications'
  | 'email'
  | 'calendar'
  | 'video'
  | 'content'
  | 'analytics'
  | 'ads'
  | 'seo'
  | 'storage'
  | 'ai'
  | 'jobs';

export interface IntegrationDefinition {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  env: string[];
  capabilities: string[];
  optional?: boolean;
}

export const integrations: IntegrationDefinition[] = [
  { id: 'postgres', name: 'PostgreSQL', category: 'crm', description: 'Primary Nexor data store', env: ['DATABASE_URL'], capabilities: ['database', 'crm', 'projects', 'finance'] },
  { id: 'redis', name: 'Redis', category: 'automation', description: 'Queues, caching and rate limiting', env: ['REDIS_URL'], capabilities: ['queue', 'cache', 'rate-limit'], optional: true },
  { id: 's3', name: 'S3-compatible storage', category: 'storage', description: 'Files, media and generated assets', env: ['S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'], capabilities: ['uploads', 'assets', 'backups'], optional: true },
  { id: 'openai', name: 'OpenAI', category: 'ai', description: 'LLM and AI workloads', env: ['OPENAI_API_KEY'], capabilities: ['reasoning', 'structured-output', 'agents'], optional: true },
  { id: 'anthropic', name: 'Anthropic', category: 'ai', description: 'LLM and agent workloads', env: ['ANTHROPIC_API_KEY'], capabilities: ['reasoning', 'agents'], optional: true },
  { id: 'gemini', name: 'Google Gemini', category: 'ai', description: 'Multimodal AI workloads', env: ['GEMINI_API_KEY'], capabilities: ['vision', 'reasoning', 'content'], optional: true },
  { id: 'serper', name: 'Serper', category: 'seo', description: 'Web search and research', env: ['SERPER_API_KEY'], capabilities: ['search', 'research', 'competitor-analysis'], optional: true },
  { id: 'whatsapp', name: 'WhatsApp Cloud API', category: 'communications', description: 'WhatsApp messaging and inbound webhooks', env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'], capabilities: ['messages', 'webhooks', 'media'], optional: true },
  { id: 'resend', name: 'Resend', category: 'email', description: 'Transactional and outreach email', env: ['RESEND_API_KEY'], capabilities: ['email', 'templates', 'delivery'], optional: true },
  { id: 'meta', name: 'Meta Graph API', category: 'ads', description: 'Facebook, Instagram and Meta Ads', env: ['META_ACCESS_TOKEN', 'META_APP_ID', 'META_APP_SECRET'], capabilities: ['instagram', 'facebook', 'ads', 'pages'], optional: true },
  { id: 'google-ads', name: 'Google Ads', category: 'ads', description: 'Google Ads management', env: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'], capabilities: ['campaigns', 'keywords', 'ads', 'reporting'], optional: true },
  { id: 'google-analytics', name: 'Google Analytics', category: 'analytics', description: 'GA4 analytics', env: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID'], capabilities: ['analytics', 'events', 'reporting'], optional: true },
  { id: 'search-console', name: 'Google Search Console', category: 'seo', description: 'Search performance and indexing', env: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GSC_SITE_URL'], capabilities: ['search-performance', 'indexing', 'seo'], optional: true },
  { id: 'wordpress', name: 'WordPress', category: 'content', description: 'Website publishing and content automation', env: ['WORDPRESS_URL', 'WORDPRESS_USERNAME', 'WORDPRESS_APP_PASSWORD'], capabilities: ['posts', 'pages', 'media', 'publishing'], optional: true },
  { id: 'openchatcut', name: 'OpenChatCut', category: 'video', description: 'Agent-controlled professional video editing', env: ['OPENCHATCUT_MCP_URL', 'OPENCHATCUT_MCP_TOKEN', 'OPENCHATCUT_EDITOR_URL'], capabilities: ['timeline', 'captions', 'shorts', 'rendering', 'effects'], optional: true },
  { id: 'remotion', name: 'Remotion', category: 'video', description: 'Programmatic video rendering', env: [], capabilities: ['video-generation', 'templates', 'batch-rendering'], optional: true },
  { id: 'browser', name: 'Browser automation', category: 'browser', description: 'Web research, testing and workflow execution', env: [], capabilities: ['navigation', 'forms', 'screenshots', 'pdf', 'testing'], optional: true },
  { id: 'job-autopilot', name: 'Job Autopilot', category: 'jobs', description: 'Job discovery and application workflows', env: ['JOB_APPLICANT_NAME', 'JOB_APPLICANT_EMAIL'], capabilities: ['job-search', 'matching', 'resume-customization', 'tracking'], optional: true },
];

export function getIntegration(id: string): IntegrationDefinition | undefined {
  return integrations.find((integration) => integration.id === id);
}

export function getIntegrationStatus(integration: IntegrationDefinition, env: NodeJS.ProcessEnv = process.env): IntegrationStatus {
  if (integration.env.length === 0) return 'available';
  const configured = integration.env.every((key) => Boolean(env[key]?.trim()));
  if (configured) return 'configured';
  return integration.optional ? 'missing_config' : 'disabled';
}

export function getIntegrationMatrix(env: NodeJS.ProcessEnv = process.env) {
  return integrations.map((integration) => ({
    ...integration,
    status: getIntegrationStatus(integration, env),
  }));
}
