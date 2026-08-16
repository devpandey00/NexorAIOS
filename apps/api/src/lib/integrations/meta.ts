export interface MetaRequestOptions {
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export class MetaGraphClient {
  private readonly token: string;
  private readonly version: string;

  constructor() {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) throw new Error('META_ACCESS_TOKEN is not configured');
    this.token = token;
    this.version = process.env.WHATSAPP_API_VERSION ?? 'v23.0';
  }

  async get<T = unknown>({ path, params }: MetaRequestOptions): Promise<T> {
    const url = new URL(`https://graph.facebook.com/${this.version}/${path.replace(/^\//, '')}`);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    url.searchParams.set('access_token', this.token);

    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!response.ok || data?.error) {
      throw new Error(data?.error?.message ?? `Meta Graph request failed (${response.status})`);
    }
    return data;
  }
}

export function getMetaAdAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) throw new Error('META_AD_ACCOUNT_ID is not configured');
  return id.startsWith('act_') ? id : `act_${id}`;
}
