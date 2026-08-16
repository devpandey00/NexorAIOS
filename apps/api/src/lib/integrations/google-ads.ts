interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export class GoogleAdsClient {
  private async accessToken(): Promise<string> {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Google Ads OAuth credentials are not configured');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description ?? data.error ?? `Google OAuth failed (${response.status})`);
    }
    return data.access_token;
  }

  async search<T = unknown>(query: string): Promise<T> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '');
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, '');

    if (!developerToken || !customerId) {
      throw new Error('Google Ads developer token/customer ID are not configured');
    }

    const token = await this.accessToken();
    const response = await fetch(
      `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
          ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
        },
        body: JSON.stringify({ query }),
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message ?? `Google Ads request failed (${response.status})`);
    }
    return data as T;
  }
}
