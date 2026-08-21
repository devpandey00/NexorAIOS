import crypto from 'node:crypto';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key, token_uri: parsed.token_uri };
  } catch {
    return null;
  }
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const account = readServiceAccount();
  if (!account) {
    const token = process.env.GOOGLE_ACCESS_TOKEN?.trim();
    if (token) return token;
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_ACCESS_TOKEN is not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: account.client_email,
    scope: scopes.join(' '),
    aud: account.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(account.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed (${response.status})`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error('Google OAuth response did not contain an access token');
  return data.access_token;
}

export function googleIntegrationConfigured() {
  return Boolean(process.env.GOOGLE_ACCESS_TOKEN?.trim() || process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
}
