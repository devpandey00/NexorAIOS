import { PrismaClient } from '@prisma/client';

export type MemoryKind = 'FACT' | 'PREFERENCE' | 'DECISION' | 'CONTEXT' | 'OUTCOME';

export interface MemoryRecord {
  key: string;
  kind: MemoryKind;
  value: unknown;
  source?: string;
  confidence?: number;
}

export class MemoryService {
  constructor(private readonly db: PrismaClient) {}

  async upsert(record: MemoryRecord) {
    const confidence = Math.max(0, Math.min(100, record.confidence ?? 100));
    return this.db.memoryItem.upsert({
      where: { key_kind: { key: record.key, kind: record.kind } },
      create: {
        key: record.key,
        kind: record.kind,
        value: record.value as object,
        source: record.source,
        confidence,
      },
      update: {
        value: record.value as object,
        source: record.source,
        confidence,
      },
    });
  }

  async get(key: string, kind?: MemoryKind) {
    if (kind) {
      return this.db.memoryItem.findUnique({ where: { key_kind: { key, kind } } });
    }
    return this.db.memoryItem.findMany({ where: { key }, orderBy: { updatedAt: 'desc' } });
  }

  async recent(limit = 20) {
    return this.db.memoryItem.findMany({
      orderBy: { updatedAt: 'desc' },
      take: Math.max(1, Math.min(limit, 100)),
    });
  }

  async markUsed(id: string) {
    return this.db.memoryItem.update({ where: { id }, data: { lastUsedAt: new Date() } });
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
