import { getDatabaseClients } from '@nexor/database';

export type SocialContentPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'YOUTUBE' | 'X' | 'TIKTOK';
export type SocialContentStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export interface SocialContentRecord {
  id: string;
  platform: SocialContentPlatform;
  status: SocialContentStatus;
  title: string;
  caption: string;
  hashtags: string[];
  mediaUrl: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const prisma = getDatabaseClients().write;

export async function listSocialContent(input?: {
  platform?: string;
  status?: string;
  limit?: number;
}): Promise<SocialContentRecord[]> {
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
  const platform = input?.platform?.trim() || null;
  const status = input?.status?.trim() || null;

  const rows = await prisma.$queryRaw<SocialContentRecord[]>`
    SELECT
      id,
      platform,
      status,
      title,
      caption,
      hashtags,
      media_url AS "mediaUrl",
      scheduled_at AS "scheduledAt",
      published_at AS "publishedAt",
      external_id AS "externalId",
      error,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.content_posts
    WHERE (${platform}::text IS NULL OR platform = ${platform})
      AND (${status}::text IS NULL OR status = ${status})
    ORDER BY COALESCE(scheduled_at, created_at) DESC
    LIMIT ${limit}
  `;

  return rows.map(normalizeRow);
}

export async function createSocialContent(input: {
  platform: SocialContentPlatform;
  status?: SocialContentStatus;
  title: string;
  caption: string;
  hashtags?: string[];
  mediaUrl?: string | null;
  scheduledAt?: string | null;
}): Promise<SocialContentRecord> {
  const rows = await prisma.$queryRaw<SocialContentRecord[]>`
    INSERT INTO public.content_posts
      (platform, status, title, caption, hashtags, media_url, scheduled_at)
    VALUES
      (${input.platform}, ${input.status ?? 'DRAFT'}, ${input.title}, ${input.caption}, ${JSON.stringify(input.hashtags ?? [])}::jsonb, ${input.mediaUrl ?? null}, ${input.scheduledAt ? new Date(input.scheduledAt) : null})
    RETURNING
      id,
      platform,
      status,
      title,
      caption,
      hashtags,
      media_url AS "mediaUrl",
      scheduled_at AS "scheduledAt",
      published_at AS "publishedAt",
      external_id AS "externalId",
      error,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const row = rows[0];
  if (!row) throw new Error('Failed to create social content');
  return normalizeRow(row);
}

export async function updateSocialContent(id: string, input: {
  status?: SocialContentStatus;
  title?: string;
  caption?: string;
  hashtags?: string[];
  mediaUrl?: string | null;
  scheduledAt?: string | null;
  error?: string | null;
}): Promise<SocialContentRecord> {
  const rows = await prisma.$queryRaw<SocialContentRecord[]>`
    UPDATE public.content_posts
    SET
      status = COALESCE(${input.status ?? null}, status),
      title = COALESCE(${input.title ?? null}, title),
      caption = COALESCE(${input.caption ?? null}, caption),
      hashtags = COALESCE(${input.hashtags ? JSON.stringify(input.hashtags) : null}::jsonb, hashtags),
      media_url = COALESCE(${input.mediaUrl ?? null}, media_url),
      scheduled_at = ${input.scheduledAt === undefined ? null : input.scheduledAt ? new Date(input.scheduledAt) : null},
      error = ${input.error === undefined ? null : input.error},
      published_at = CASE WHEN ${input.status ?? null} = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE published_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}::uuid
    RETURNING
      id,
      platform,
      status,
      title,
      caption,
      hashtags,
      media_url AS "mediaUrl",
      scheduled_at AS "scheduledAt",
      published_at AS "publishedAt",
      external_id AS "externalId",
      error,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const row = rows[0];
  if (!row) throw new Error('Social content not found');
  return normalizeRow(row);
}

function normalizeRow(row: SocialContentRecord): SocialContentRecord {
  return {
    ...row,
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : null,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
  };
}
