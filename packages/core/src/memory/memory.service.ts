import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export type MemoryKind = 'FACT' | 'PREFERENCE' | 'DECISION' | 'CONTEXT' | 'OUTCOME';

export interface MemoryRecord {
  id: string;
  key: string;
  kind: MemoryKind;
  value: unknown;
  source?: string | null;
  confidence: number;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RememberInput {
  key: string;
  kind: MemoryKind;
  value: unknown;
  source?: string;
  confidence?: number;
}

export class MemoryService {
  constructor(private readonly db: PrismaClient) {}

  async remember(input: RememberInput): Promise<MemoryRecord> {
    const id = randomUUID();
    const confidence = Math.max(0, Math.min(100, input.confidence ?? 100));
    const rows = await this.db.$queryRawUnsafe<MemoryRecord[]>(
      `INSERT INTO "public"."memory_items"
       ("id","key","kind","value","source","confidence","created_at","updated_at")
       VALUES ($1::uuid,$2,$3,$4::jsonb,$5,$6,NOW(),NOW())
       ON CONFLICT ("key","kind") DO UPDATE SET
         "value" = EXCLUDED."value",
         "source" = EXCLUDED."source",
         "confidence" = EXCLUDED."confidence",
         "updated_at" = NOW()
       RETURNING "id","key","kind","value","source","confidence","last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"`,
      id, input.key, input.kind, JSON.stringify(input.value), input.source ?? null, confidence,
    );
    const record = rows[0];
    if (!record) throw new Error('Failed to upsert memory item');
    return record;
  }

  async recall(kind?: MemoryKind, limit = 20): Promise<MemoryRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    if (kind) {
      return this.db.$queryRawUnsafe<MemoryRecord[]>(
        `SELECT "id","key","kind","value","source","confidence","last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"
         FROM "public"."memory_items" WHERE "kind" = $1
         ORDER BY "confidence" DESC, "updated_at" DESC LIMIT $2`, kind, safeLimit,
      );
    }
    return this.db.$queryRawUnsafe<MemoryRecord[]>(
      `SELECT "id","key","kind","value","source","confidence","last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"
       FROM "public"."memory_items"
       ORDER BY "confidence" DESC, "updated_at" DESC LIMIT $1`, safeLimit,
    );
  }

  async recallByKey(key: string, kind?: MemoryKind): Promise<MemoryRecord | null> {
    const rows = kind
      ? await this.db.$queryRawUnsafe<MemoryRecord[]>(
          `SELECT "id","key","kind","value","source","confidence","last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"
           FROM "public"."memory_items" WHERE "key" = $1 AND "kind" = $2 LIMIT 1`, key, kind,
        )
      : await this.db.$queryRawUnsafe<MemoryRecord[]>(
          `SELECT "id","key","kind","value","source","confidence","last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"
           FROM "public"."memory_items" WHERE "key" = $1 ORDER BY "confidence" DESC LIMIT 1`, key,
        );
    const record = rows[0];
    if (!record) return null;
    await this.db.$executeRawUnsafe(
      `UPDATE "public"."memory_items" SET "last_used_at" = NOW() WHERE "id" = $1::uuid`, record.id,
    );
    return record;
  }

  async buildContext(limit = 20): Promise<Record<string, unknown>> {
    const memories = await this.recall(undefined, limit);
    return memories.reduce<Record<string, unknown>>((context, memory) => {
      context[`${memory.kind.toLowerCase()}:${memory.key}`] = memory.value;
      return context;
    }, {});
  }
}
