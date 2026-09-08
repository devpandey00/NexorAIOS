import { getDatabaseClients } from '@nexor/database';

export const AUTOMATION_KEYS = [
  'master_autopilot',
  'outbound_enabled',
  'campaign_discovery',
  'scheduler',
  'job_autopilot',
  'autopilot',
  'whatsapp_generation',
  'whatsapp_sending',
  'followups',
  'outreach',
  'social_publishing',
  'daily_reports',
  'growth_reports',
] as const;
export type AutomationKey = (typeof AUTOMATION_KEYS)[number];

export const AUTOMATION_LABELS: Record<AutomationKey, string> = {
  master_autopilot: 'MASTER AUTOPILOT',
  outbound_enabled: 'Outbound communications',
  campaign_discovery: 'Automatic lead discovery',
  scheduler: 'Durable automation scheduler',
  job_autopilot: 'AI job autopilot',
  autopilot: 'Daily business autopilot',
  whatsapp_generation: 'WhatsApp draft generation',
  whatsapp_sending: 'Approved WhatsApp sending',
  followups: 'Automatic follow-ups',
  outreach: 'Automatic outreach queue',
  social_publishing: 'Automatic social publishing',
  daily_reports: 'Daily email reports',
  growth_reports: '3-hour growth + milestone reports',
};

export async function isAutomationEnabled(key: AutomationKey): Promise<boolean> {
  try {
    const db = getDatabaseClients().write;
    const setting = await db.automationSetting.findUnique({ where: { key } });
    if (setting) return setting.enabled;
    await db.automationSetting.create({ data: { key, enabled: true } });
    return true;
  } catch (error) {
    console.error(`[AUTOMATION SETTING] ${key}`, error);
    return true;
  }
}

export async function isOutboundEnabled(): Promise<boolean> {
  return (await isAutomationEnabled('master_autopilot')) && (await isAutomationEnabled('outbound_enabled'));
}

export async function getAutomationSettings() {
  try {
    const db = getDatabaseClients().write;
    await Promise.all(
      AUTOMATION_KEYS.map((key) =>
        db.automationSetting.upsert({ where: { key }, create: { key, enabled: true }, update: {} }),
      ),
    );
    const rows = await db.automationSetting.findMany({ where: { key: { in: [...AUTOMATION_KEYS] } } });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return AUTOMATION_KEYS.map((key) => ({
      key,
      label: AUTOMATION_LABELS[key],
      enabled: byKey.get(key)?.enabled ?? true,
      updatedAt: byKey.get(key)?.updatedAt?.toISOString() ?? null,
    }));
  } catch (error) {
    console.error('[AUTOMATION SETTINGS READ]', error);
    return AUTOMATION_KEYS.map((key) => ({ key, label: AUTOMATION_LABELS[key], enabled: true, updatedAt: null }));
  }
}

export async function setAutomationSetting(key: string, enabled: boolean) {
  if (!AUTOMATION_KEYS.includes(key as AutomationKey)) throw new Error(`Unknown automation capability: ${key}`);
  const db = getDatabaseClients().write;
  return db.automationSetting.upsert({ where: { key }, create: { key, enabled }, update: { enabled } });
}
