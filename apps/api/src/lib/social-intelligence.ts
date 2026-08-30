import { getDatabaseClients } from '@nexor/database';

export type TrendReference = {
  id: string;
  source: string;
  url: string;
  platform: string;
  topic: string;
  category: string | null;
  relevance: number;
  contentOpportunity: string | null;
  creativeDirection: string | null;
  sourcePublishedAt: string | null;
  fetchedAt: string;
};

export type SocialAnalyticsSnapshot = {
  id: string;
  platform: string;
  postId: string | null;
  externalId: string | null;
  snapshotAt: string;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  views: number | null;
  followers: number | null;
  engagementRate: number | null;
  raw: Record<string, unknown>;
};

function prisma() {
  return getDatabaseClients().write;
}

function iso(value: unknown): string | null {
  return value ? new Date(String(value)).toISOString() : null;
}

function trendRow(row: Record<string, unknown>): TrendReference {
  return {
    id: String(row.id), source: String(row.source), url: String(row.url), platform: String(row.platform),
    topic: String(row.topic), category: row.category ? String(row.category) : null, relevance: Number(row.relevance ?? 0),
    contentOpportunity: row.contentOpportunity ? String(row.contentOpportunity) : null,
    creativeDirection: row.creativeDirection ? String(row.creativeDirection) : null,
    sourcePublishedAt: iso(row.sourcePublishedAt), fetchedAt: new Date(String(row.fetchedAt)).toISOString(),
  };
}

function analyticsRow(row: Record<string, unknown>): SocialAnalyticsSnapshot {
  return {
    id: String(row.id), platform: String(row.platform), postId: row.postId ? String(row.postId) : null,
    externalId: row.externalId ? String(row.externalId) : null, snapshotAt: new Date(String(row.snapshotAt)).toISOString(),
    reach: row.reach == null ? null : Number(row.reach), impressions: row.impressions == null ? null : Number(row.impressions),
    likes: row.likes == null ? null : Number(row.likes), comments: row.comments == null ? null : Number(row.comments),
    shares: row.shares == null ? null : Number(row.shares), saves: row.saves == null ? null : Number(row.saves),
    clicks: row.clicks == null ? null : Number(row.clicks), views: row.views == null ? null : Number(row.views),
    followers: row.followers == null ? null : Number(row.followers),
    engagementRate: row.engagementRate == null ? null : Number(row.engagementRate),
    raw: row.raw && typeof row.raw === 'object' ? row.raw as Record<string, unknown> : {},
  };
}

export async function listTrends(limit = 50) {
  const rows = await prisma().$queryRaw<Record<string, unknown>[]>`
    SELECT id, source, url, platform, topic, category, relevance,
      content_opportunity AS "contentOpportunity", creative_direction AS "creativeDirection",
      source_published_at AS "sourcePublishedAt", fetched_at AS "fetchedAt"
    FROM public.trend_references
    ORDER BY relevance DESC, fetched_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 200)}`;
  return rows.map(trendRow);
}

export async function upsertTrend(input: Omit<TrendReference, 'id' | 'fetchedAt'>) {
  const rows = await prisma().$queryRaw<Record<string, unknown>[]>`
    INSERT INTO public.trend_references
      (source, url, platform, topic, category, relevance, content_opportunity, creative_direction, source_published_at)
    VALUES (${input.source}, ${input.url}, ${input.platform}, ${input.topic}, ${input.category}, ${input.relevance},
      ${input.contentOpportunity}, ${input.creativeDirection}, ${input.sourcePublishedAt ? new Date(input.sourcePublishedAt) : null})
    ON CONFLICT (source, url) DO UPDATE SET
      topic = EXCLUDED.topic, platform = EXCLUDED.platform, category = EXCLUDED.category,
      relevance = EXCLUDED.relevance, content_opportunity = EXCLUDED.content_opportunity,
      creative_direction = EXCLUDED.creative_direction, source_published_at = EXCLUDED.source_published_at,
      fetched_at = CURRENT_TIMESTAMP
    RETURNING id, source, url, platform, topic, category, relevance,
      content_opportunity AS "contentOpportunity", creative_direction AS "creativeDirection",
      source_published_at AS "sourcePublishedAt", fetched_at AS "fetchedAt"`;
  if (!rows[0]) throw new Error('Failed to persist trend reference');
  return trendRow(rows[0]);
}

export async function listAnalytics(input?: { platform?: string; postId?: string; limit?: number }) {
  const platform = input?.platform?.trim() || null;
  const postId = input?.postId?.trim() || null;
  const limit = Math.min(Math.max(input?.limit ?? 200, 1), 500);
  const rows = await prisma().$queryRaw<Record<string, unknown>[]>`
    SELECT id, platform, post_id AS "postId", external_id AS "externalId", snapshot_at AS "snapshotAt",
      reach, impressions, likes, comments, shares, saves, clicks, views, followers,
      engagement_rate AS "engagementRate", raw
    FROM public.social_analytics_snapshots
    WHERE (${platform}::text IS NULL OR platform = ${platform})
      AND (${postId}::uuid IS NULL OR post_id = ${postId}::uuid)
    ORDER BY snapshot_at DESC LIMIT ${limit}`;
  return rows.map(analyticsRow);
}

export async function recordAnalytics(input: {
  platform: string; postId?: string | null; externalId?: string | null; snapshotAt?: string;
  reach?: number | null; impressions?: number | null; likes?: number | null; comments?: number | null;
  shares?: number | null; saves?: number | null; clicks?: number | null; views?: number | null;
  followers?: number | null; engagementRate?: number | null; raw?: Record<string, unknown>;
}) {
  const rows = await prisma().$queryRaw<Record<string, unknown>[]>`
    INSERT INTO public.social_analytics_snapshots
      (platform, post_id, external_id, snapshot_at, reach, impressions, likes, comments, shares, saves, clicks, views, followers, engagement_rate, raw)
    VALUES (${input.platform}, ${input.postId || null}::uuid, ${input.externalId || null},
      ${input.snapshotAt ? new Date(input.snapshotAt) : new Date()}, ${input.reach ?? null}, ${input.impressions ?? null},
      ${input.likes ?? null}, ${input.comments ?? null}, ${input.shares ?? null}, ${input.saves ?? null},
      ${input.clicks ?? null}, ${input.views ?? null}, ${input.followers ?? null}, ${input.engagementRate ?? null},
      ${JSON.stringify(input.raw ?? {})}::jsonb)
    RETURNING id, platform, post_id AS "postId", external_id AS "externalId", snapshot_at AS "snapshotAt",
      reach, impressions, likes, comments, shares, saves, clicks, views, followers,
      engagement_rate AS "engagementRate", raw`;
  if (!rows[0]) throw new Error('Failed to record social analytics');
  return analyticsRow(rows[0]);
}

export async function getPerformanceLearning(limit = 10) {
  const rows = await prisma().$queryRaw<Record<string, unknown>[]>`
    SELECT platform,
      COUNT(*)::int AS snapshots,
      ROUND(AVG(engagement_rate)::numeric, 4) AS avg_engagement_rate,
      SUM(COALESCE(likes, 0))::bigint AS likes,
      SUM(COALESCE(comments, 0))::bigint AS comments,
      SUM(COALESCE(shares, 0))::bigint AS shares,
      SUM(COALESCE(saves, 0))::bigint AS saves,
      SUM(COALESCE(clicks, 0))::bigint AS clicks,
      SUM(COALESCE(views, 0))::bigint AS views
    FROM public.social_analytics_snapshots
    GROUP BY platform
    ORDER BY COALESCE(AVG(engagement_rate), 0) DESC
    LIMIT ${Math.min(Math.max(limit, 1), 50)}`;
  return rows.map((row) => ({
    platform: String(row.platform), snapshots: Number(row.snapshots), avgEngagementRate: Number(row.avg_engagement_rate ?? 0),
    likes: Number(row.likes ?? 0), comments: Number(row.comments ?? 0), shares: Number(row.shares ?? 0),
    saves: Number(row.saves ?? 0), clicks: Number(row.clicks ?? 0), views: Number(row.views ?? 0),
  }));
}
