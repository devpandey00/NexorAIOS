import { getDatabaseClients } from '@nexor/database';

export type InspirationSource = 'MANUAL' | 'PINTEREST';
export type InspirationStatus = 'NEW' | 'ANALYZED' | 'USED' | 'ARCHIVED';

export interface ContentInspirationRecord {
  id: string;
  source: InspirationSource;
  sourceUrl: string;
  title: string | null;
  inspirationType: string | null;
  detectedFormat: string | null;
  niche: string | null;
  topic: string | null;
  platform: string | null;
  contentType: string | null;
  visualPattern: string | null;
  hook: string | null;
  notes: string | null;
  status: InspirationStatus;
  linkedContentId: string | null;
  createdAt: string;
  updatedAt: string;
}

function getPrisma() {
  return getDatabaseClients().write;
}

const SELECT = `SELECT id, source, source_url AS "sourceUrl", title, inspiration_type AS "inspirationType",
  detected_format AS "detectedFormat", niche, topic, platform, content_type AS "contentType",
  visual_pattern AS "visualPattern", hook, notes, status, linked_content_id AS "linkedContentId",
  created_at AS "createdAt", updated_at AS "updatedAt" FROM public.content_inspirations`;

function normalizeRow(row: ContentInspirationRecord): ContentInspirationRecord {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listContentInspiration(input?: { niche?: string; topic?: string; status?: string; limit?: number }): Promise<ContentInspirationRecord[]> {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const niche = input?.niche?.trim() || null;
  const topic = input?.topic?.trim() || null;
  const status = input?.status?.trim() || null;
  const rows = await prisma.$queryRaw<ContentInspirationRecord[]>`
    SELECT id, source, source_url AS "sourceUrl", title, inspiration_type AS "inspirationType",
      detected_format AS "detectedFormat", niche, topic, platform, content_type AS "contentType",
      visual_pattern AS "visualPattern", hook, notes, status, linked_content_id AS "linkedContentId",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM public.content_inspirations
    WHERE (${niche}::text IS NULL OR niche = ${niche})
      AND (${topic}::text IS NULL OR topic = ${topic})
      AND (${status}::text IS NULL OR status = ${status})
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map(normalizeRow);
}

export async function getContentInspirationByUrl(sourceUrl: string): Promise<ContentInspirationRecord | null> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRawUnsafe<ContentInspirationRecord[]>(`${SELECT} WHERE source_url = $1 LIMIT 1`, sourceUrl);
  return rows[0] ? normalizeRow(rows[0]) : null;
}

export interface CreateInspirationInput {
  source: InspirationSource;
  sourceUrl: string;
  title?: string | null;
  inspirationType?: string | null;
  detectedFormat?: string | null;
  niche?: string | null;
  topic?: string | null;
  platform?: string | null;
  contentType?: string | null;
  visualPattern?: string | null;
  hook?: string | null;
  notes?: string | null;
}

export async function createContentInspiration(input: CreateInspirationInput): Promise<ContentInspirationRecord> {
  const existing = await getContentInspirationByUrl(input.sourceUrl);
  if (existing) return existing;

  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<ContentInspirationRecord[]>`
    INSERT INTO public.content_inspirations
      (source, source_url, title, inspiration_type, detected_format, niche, topic, platform, content_type, visual_pattern, hook, notes)
    VALUES (${input.source}, ${input.sourceUrl}, ${input.title ?? null}, ${input.inspirationType ?? null},
      ${input.detectedFormat ?? null}, ${input.niche ?? null}, ${input.topic ?? null}, ${input.platform ?? null},
      ${input.contentType ?? null}, ${input.visualPattern ?? null}, ${input.hook ?? null}, ${input.notes ?? null})
    ON CONFLICT (source_url) DO NOTHING
    RETURNING id, source, source_url AS "sourceUrl", title, inspiration_type AS "inspirationType",
      detected_format AS "detectedFormat", niche, topic, platform, content_type AS "contentType",
      visual_pattern AS "visualPattern", hook, notes, status, linked_content_id AS "linkedContentId",
      created_at AS "createdAt", updated_at AS "updatedAt"`;
  const row = rows[0] ?? (await getContentInspirationByUrl(input.sourceUrl));
  if (!row) throw new Error('Failed to create content inspiration');
  return normalizeRow(row);
}

export async function updateContentInspiration(id: string, input: Partial<Omit<CreateInspirationInput, 'source' | 'sourceUrl'>> & { status?: InspirationStatus; linkedContentId?: string | null }): Promise<ContentInspirationRecord> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<ContentInspirationRecord[]>`
    UPDATE public.content_inspirations SET
      title = COALESCE(${input.title ?? null}, title),
      inspiration_type = COALESCE(${input.inspirationType ?? null}, inspiration_type),
      detected_format = COALESCE(${input.detectedFormat ?? null}, detected_format),
      niche = COALESCE(${input.niche ?? null}, niche),
      topic = COALESCE(${input.topic ?? null}, topic),
      platform = COALESCE(${input.platform ?? null}, platform),
      content_type = COALESCE(${input.contentType ?? null}, content_type),
      visual_pattern = COALESCE(${input.visualPattern ?? null}, visual_pattern),
      hook = COALESCE(${input.hook ?? null}, hook),
      notes = COALESCE(${input.notes ?? null}, notes),
      status = COALESCE(${input.status ?? null}, status),
      linked_content_id = CASE WHEN ${input.linkedContentId !== undefined} THEN ${input.linkedContentId ?? null}::uuid ELSE linked_content_id END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}::uuid
    RETURNING id, source, source_url AS "sourceUrl", title, inspiration_type AS "inspirationType",
      detected_format AS "detectedFormat", niche, topic, platform, content_type AS "contentType",
      visual_pattern AS "visualPattern", hook, notes, status, linked_content_id AS "linkedContentId",
      created_at AS "createdAt", updated_at AS "updatedAt"`;
  const row = rows[0];
  if (!row) throw new Error('Content inspiration not found');
  return normalizeRow(row);
}
