import { createPublicKey, createVerify } from 'node:crypto';

type GitHubOidcClaims = {
  iss?: string;
  aud?: string | string[];
  repository?: string;
  ref?: string;
  exp?: number;
  nbf?: number;
};

type Jwk = {
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
  kid?: string;
};

type Jwks = { keys: Jwk[] };

const GITHUB_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_AUDIENCE = 'nexoraios-production';
const GITHUB_REPOSITORY = 'devpandey00/NexorAIOS';
const GITHUB_MAIN_REF = 'refs/heads/main';
const JWKS_URL = `${GITHUB_ISSUER}/.well-known/jwks`;
const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_MS = 10 * 60 * 1000;

let jwksCache: { expiresAt: number; keys: Jwk[] } | null = null;

function base64UrlJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

async function getGitHubKeys(forceRefresh = false): Promise<Jwk[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;

  const response = await fetch(JWKS_URL, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`GitHub OIDC JWKS request failed (${response.status})`);

  const body = (await response.json()) as Jwks;
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) throw new Error('GitHub OIDC JWKS response contained no keys');

  jwksCache = { keys, expiresAt: now + JWKS_CACHE_MS };
  return keys;
}

function authWarning(reason: string) {
  console.warn(`[MACHINE AUTH] GitHub OIDC rejected: ${reason}`);
}

async function verifyGitHubOidc(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    authWarning('invalid-jwt-shape');
    return false;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = base64UrlJson<{ alg?: string; kid?: string }>(encodedHeader);
  const claims = base64UrlJson<GitHubOidcClaims>(encodedPayload);

  if (!header || header.alg !== 'RS256' || !header.kid || !claims) {
    authWarning('invalid-header-or-claims');
    return false;
  }

  if (claims.iss !== GITHUB_ISSUER) {
    authWarning('issuer-mismatch');
    return false;
  }
  if (claims.repository !== GITHUB_REPOSITORY) {
    authWarning(`repository-mismatch:${claims.repository ?? 'missing'}`);
    return false;
  }
  if (claims.ref !== GITHUB_MAIN_REF) {
    authWarning(`ref-mismatch:${claims.ref ?? 'missing'}`);
    return false;
  }

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(GITHUB_AUDIENCE)) {
    authWarning('audience-mismatch');
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < now - CLOCK_SKEW_SECONDS) {
    authWarning('expired-or-missing-exp');
    return false;
  }
  if (typeof claims.nbf === 'number' && claims.nbf > now + CLOCK_SKEW_SECONDS) {
    authWarning('not-before-in-future');
    return false;
  }

  let keys = await getGitHubKeys();
  let key = keys.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA');
  if (!key) {
    keys = await getGitHubKeys(true);
    key = keys.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA');
  }
  if (!key) {
    authWarning(`kid-not-found:${header.kid}`);
    return false;
  }

  try {
    const publicKey = createPublicKey({ key: { kty: 'RSA', n: key.n, e: key.e }, format: 'jwk' });
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    const valid = verifier.verify(publicKey, Buffer.from(encodedSignature, 'base64url'));
    if (!valid) authWarning('signature-invalid');
    return valid;
  } catch (error) {
    authWarning(`signature-verification-error:${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export async function authorizeMachineRequest(request: Request): Promise<boolean> {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const bearer = authorization.replace(/^Bearer\s+/i, '');

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && bearer === cronSecret) return true;

  const outreachSecret = process.env.OUTREACH_API_SECRET?.trim();
  if (outreachSecret && bearer === outreachSecret) return true;

  if (!bearer || !bearer.includes('.')) {
    authWarning('missing-or-non-jwt-authorization');
    return false;
  }

  try {
    return await verifyGitHubOidc(bearer);
  } catch (error) {
    authWarning(`verification-exception:${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
