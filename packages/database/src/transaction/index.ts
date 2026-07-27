import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { getDatabaseClients } from '../client/index.js';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

const DEFAULT_TRANSACTION_OPTIONS: Required<
  Pick<TransactionOptions, 'maxWait' | 'timeout' | 'isolationLevel'>
> = {
  maxWait: 5000,
  timeout: 30000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
};

export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const { write } = getDatabaseClients();
  const merged = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };

  return write.$transaction(fn, merged);
}

export async function withReadAfterWriteTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  return withTransaction(fn, options);
}

export function getWriteClient(): PrismaClient {
  return getDatabaseClients().write;
}

export function getReadClient(): PrismaClient {
  return getDatabaseClients().read;
}

export type { TransactionClient as NexorTransactionClient };
