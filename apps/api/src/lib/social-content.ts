import { getDatabaseClients } from '@nexor/database';

export type SocialContentPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'YOUTUBE' | 'X' | 'TIKTOK';
export type SocialContentStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface SocialContentRecord {
  id: string; platform: SocialContentPlatform; status: SocialContentStatus; title: string; caption: string; hashtags: string[];
  mediaUrl: string | null; scheduledAt: string | null; publishedAt: string | null; externalId: string | null; error: string | null;
  createdAt: string; updatedAt: string;
}

function getPrisma() {
  return getDatabaseClients().write;
}

const SELECT = `SELECT id, platform, status, title, caption, hashtags, media_url AS "mediaUrl", scheduled_at AS "scheduledAt", published_at AS "publishedAt", external_id AS "externalId", error, created_at AS "createdAt", updated_at AS "updatedAt" FROM public.content_posts`;

export async function getSocialContent(id: string): Promise<SocialContentRecord | null> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRawUnsafe<SocialContentRecord[]>(`${SELECT} WHERE id = $1::uuid LIMIT 1`, id);
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export async function listSocialContent(input?: { platform?: string; status?: string; limit?: number }): Promise<SocialContentRecord[]> {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
  const platform = input?.platform?.trim() || null;
  const status = input?.status?.trim() || null;
  const rows = await prisma.$queryRaw<SocialContentRecord[]>`
    SELECT id, platform, status, title, caption, hashtags, media_url AS "mediaUrl", scheduled_at AS "scheduledAt",
      published_at AS "publishedAt", external_id AS "externalId", error, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM public.content_posts
    WHERE (${platform}::text IS NULL OR platform = ${platform}) AND (${status}::text IS NULL OR status = ${status})
    ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT ${limit}`;
  return rows.map(normalizeRow);
}

/**
 * Atomically claims due, SCHEDULED posts for publishing so that overlapping
 * cron invocations (e.g. a slow run still in flight when the next tick fires)
 * can never publish the same post twice. Uses SELECT ... FOR UPDATE SKIP
 * LOCKED so concurrent callers each get a disjoint set of rows, then flips
 * status to PUBLISHING in the same statement. Only rows this call actually
 * claimed are returned; any post already claimed/published by another
 * invocation is left untouched.
 */
export async function claimScheduledSocialContent(limit = 20): Promise<SocialContentRecord[]> {
  const prisma = getPrisma();
  const capped = Math.min(Math.max(limit, 1), 50);
  const rows = await prisma.$queryRaw<SocialContentRecord[]>`
    UPDATE public.content_posts SET status = 'PUBLISHING', updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
      SELECT id FROM public.content_posts
      WHERE status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND scheduled_at <= CURRENT_TIMESTAMP
      ORDER BY scheduled_at ASC
      LIMIT ${capped}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, platform, status, title, caption, hashtags, media_url AS "mediaUrl", scheduled_at AS "scheduledAt",
      published_at AS "publishedAt", external_id AS "externalId", error, created_at AS "createdAt", updated_at AS "updatedAt"`;
  return rows.map(normalizeRow);
}

export async function createSocialContent(input: { platform: SocialContentPlatform; status?: SocialContentStatus; title: string; caption: string; hashtags?: string[]; mediaUrl?: string | null; scheduledAt?: string | null; externalId?: string | null; }): Promise<SocialContentRecord> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<SocialContentRecord[]>`
    INSERT INTO public.content_posts (platform, status, title, caption, hashtags, media_url, scheduled_at, external_id)
    VALUES (${input.platform}, ${input.status ?? 'DRAFT'}, ${input.title}, ${input.caption}, ${JSON.stringify(input.hashtags ?? [])}::jsonb,
      ${input.mediaUrl ?? null}, ${input.scheduledAt ? new Date(input.scheduledAt) : null}, ${input.externalId ?? null})
    RETURNING id, platform, status, title, caption, hashtags, media_url AS "mediaUrl", scheduled_at AS "scheduledAt",
      published_at AS "publishedAt", external_id AS "externalId", error, created_at AS "createdAt", updated_at AS "updatedAt"`;
  const row = rows[0];
  if (!row) throw new Error('Failed to create social content');
  return normalizeRow(row);
}

export async function updateSocialContent(id: string, input: { status?: SocialContentStatus; title?: string; caption?: string; hashtags?: string[]; mediaUrl?: string | null; scheduledAt?: string | null; externalId?: string | null; error?: string | null; }): Promise<SocialContentRecord> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<SocialContentRecord[]>`
    UPDATE public.content_posts SET
      status = COALESCE(${input.status ?? null}, status), title = COALESCE(${input.title ?? null}, title), caption = COALESCE(${input.caption ?? null}, caption),
      hashtags = CASE WHEN ${input.hashtags !== undefined} THEN ${JSON.stringify(input.hashtags ?? [])}::jsonb ELSE hashtags END,
      media_url = CASE WHEN ${input.mediaUrl !== undefined} THEN ${input.mediaUrl ?? null} ELSE media_url END,
      scheduled_at = CASE WHEN ${input.scheduledAt !== undefined} THEN ${input.scheduledAt ? new Date(input.scheduledAt) : null} ELSE scheduled_at END,
      external_id = CASE WHEN ${input.externalId !== undefined} THEN ${input.externalId ?? null} ELSE external_id END,
      error = CASE WHEN ${input.error !== undefined} THEN ${input.error ?? null} ELSE error END,
      published_at = CASE WHEN ${input.status ?? null} = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE published_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}::uuid
    RETURNING id, platform, status, title, caption, hashtags, media_url AS "mediaUrl", scheduled_at AS "scheduledAt",
      published_at AS "publishedAt", external_id AS "externalId", error, created_at AS "createdAt", updated_at AS "updatedAt"`;
  const row = rows[0];
  if (!row) throw new Error('Social content not found');
  return normalizeRow(row);
}

function normalizeRow(row: SocialContentRecord): SocialContentRecord {
  return { ...row, hashtags: Array.isArray(row.hashtags) ? row.hashtags : [], createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(), scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : null,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null };
}
