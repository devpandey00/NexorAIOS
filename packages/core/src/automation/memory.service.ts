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

export class MemoryService {
  constructor(private readonly db: PrismaClient) {}

  async upsert(record: Omit<MemoryRecord, 'id' | 'confidence'> & { confidence?: number }) {
    const id = randomUUID();
    const confidence = Math.max(0, Math.min(100, record.confidence ?? 100));
    const rows = await this.db.$queryRawUnsafe<MemoryRecord[]>(
      `INSERT INTO "public"."memory_items"
       ("id","key","kind","value","source","confidence","created_at","updated_at")
       VALUES ($1::uuid,$2,$3,$4::jsonb,$5,$6,NOW(),NOW())
       ON CONFLICT ("key","kind") DO UPDATE SET
         "value" = EXCLUDED."value",
         "source" = EXCLUDED."source",
         "confidence" = EXCLUDED."confidence",
         "updated_at" = NOW()
       RETURNING "id","key","kind","value","source","confidence",
                 "last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"`,
      id,
      record.key,
      record.kind,
      JSON.stringify(record.value),
      record.source ?? null,
      confidence,
    );
    return rows[0];
  }

  async get(key: string, kind?: MemoryKind): Promise<MemoryRecord | MemoryRecord[] | null> {
    if (kind) {
      const rows = await this.db.$queryRawUnsafe<MemoryRecord[]>(
        `SELECT "id","key","kind","value","source","confidence",
                "last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"
         FROM "public"."memory_items" WHERE "key" = $1 AND "kind" = $2 LIMIT 1`,
        key,
        kind,
      );
      return rows[0] ?? null;
    }
    return this.db.$queryRawUnsafe<MemoryRecord[]>(
      `SELECT "id","key","kind","value","source","confidence",
              "last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"
       FROM "public"."memory_items" WHERE "key" = $1 ORDER BY "updated_at" DESC`,
      key,
    );
  }

  async recent(limit = 20): Promise<MemoryRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    return this.db.$queryRawUnsafe<MemoryRecord[]>(
      `SELECT "id","key","kind","value","source","confidence",
              "last_used_at" AS "lastUsedAt","created_at" AS "createdAt","updated_at" AS "updatedAt"
       FROM "public"."memory_items"
       ORDER BY "updated_at" DESC LIMIT $1`,
      safeLimit,
    );
  }

  async markUsed(id: string) {
    await this.db.$executeRawUnsafe(
      `UPDATE "public"."memory_items" SET "last_used_at" = NOW() WHERE "id" = $1::uuid`,
      id,
    );
  }

  async context(limit = 20) {
    const records = await this.recent(limit);
    return records.map((record) => ({
      key: record.key,
      kind: record.kind,
      value: record.value,
      confidence: record.confidence,
    }));
  }
}
