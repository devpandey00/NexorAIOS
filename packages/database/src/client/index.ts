/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  PrismaClient,
  type Prisma,
  CampaignStatus,
  JobStatus,
  JobType,
  LeadStatus,
  MeetingStatus,
  OpportunityStage,
  OutreachChannel,
  OutreachStatus,
  ConversationChannel,
  MessageDirection,
  FollowUpStatus,
  ProposalStatus,
  TaskStatus,
  SocialPlatform,
} from '@prisma/client';
import { getLogger } from '@nexor/logger';

export interface DatabaseConfig {
  writeUrl: string;
  readUrl?: string;
  poolMin?: number;
  poolMax?: number;
  logQueries?: boolean;
}

export interface DatabaseClients {
  write: PrismaClient;
  read: PrismaClient;
}

let clients: DatabaseClients | undefined;

function createPrismaClient(url: string, logQueries = false): PrismaClient {
  const log: Prisma.LogLevel[] = logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'];
  return new PrismaClient({ datasources: { db: { url } }, log });
}

export function createDatabaseClients(config: DatabaseConfig): DatabaseClients {
  const write = createPrismaClient(config.writeUrl, config.logQueries);
  const read = createPrismaClient(config.readUrl ?? config.writeUrl, config.logQueries);
  return { write, read };
}

export function getDatabaseClients(): DatabaseClients {
  if (!clients) {
    const writeUrl = process.env['DATABASE_URL'];
    if (!writeUrl) throw new Error('DATABASE_URL environment variable is required');
    const databaseConfig: DatabaseConfig = { writeUrl, logQueries: process.env['NODE_ENV'] === 'development' };
    if (process.env['DATABASE_READ_URL']) databaseConfig.readUrl = process.env['DATABASE_READ_URL'];
    clients = createDatabaseClients(databaseConfig);
  }
  return clients;
}

export async function connectDatabase(): Promise<DatabaseClients> {
  const db = getDatabaseClients();
  const logger = getLogger();
  await db.write.$connect();
  if (db.read !== db.write) await db.read.$connect();
  logger.info({ component: 'database' }, 'Database connections established');
  return db;
}

export async function disconnectDatabase(): Promise<void> {
  if (!clients) return;
  const logger = getLogger();
  await clients.write.$disconnect();
  if (clients.read !== clients.write) await clients.read.$disconnect();
  clients = undefined;
  logger.info({ component: 'database' }, 'Database connections closed');
}

export function setDatabaseClients(databaseClients: DatabaseClients): void { clients = databaseClients; }

export {
  PrismaClient,
  type Prisma,
  CampaignStatus,
  JobStatus,
  JobType,
  LeadStatus,
  MeetingStatus,
  OpportunityStage,
  OutreachChannel,
  OutreachStatus,
  ConversationChannel,
  MessageDirection,
  FollowUpStatus,
  ProposalStatus,
  TaskStatus,
  SocialPlatform,
};
