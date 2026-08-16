export class WordPressClient {
  private readonly baseUrl: string;
  private readonly authorization: string;

  constructor() {
    const url = process.env.WORDPRESS_URL?.replace(/\/$/, '');
    const username = process.env.WORDPRESS_USERNAME;
    const appPassword = process.env.WORDPRESS_APP_PASSWORD;
    if (!url || !username || !appPassword) {
      throw new Error('WordPress credentials are not configured');
    }
    this.baseUrl = `${url}/wp-json/wp/v2`;
    this.authorization = `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`;
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async put<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path.replace(/^\//, '')}`, {
      ...init,
      headers: {
        Authorization: this.authorization,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data?.message === 'string' ? data.message : `WordPress request failed (${response.status})`;
      throw new Error(message);
    }
    return data as T;
  }
}
