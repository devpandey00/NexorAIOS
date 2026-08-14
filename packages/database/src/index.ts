export {
  connectDatabase,
  createDatabaseClients,
  disconnectDatabase,
  getDatabaseClients,
  setDatabaseClients,
  PrismaClient,
  CampaignStatus,
  JobStatus,
  JobType,
  LeadStatus,
  OutreachChannel,
  OutreachStatus,
  ConversationChannel,
  MessageDirection,
  FollowUpStatus,
  TaskStatus,
  SocialPlatform,
  type DatabaseClients,
  type DatabaseConfig,
  type Prisma,
} from './client/index.js';

export {
  BaseRepository,
  type PaginatedResult,
  type PaginationParams,
  type RepositoryContext,
  type SoftDeletable,
} from './repository/index.js';

export {
  getReadClient,
  getWriteClient,
  withReadAfterWriteTransaction,
  withTransaction,
  type TransactionClient,
  type TransactionOptions,
} from './transaction/index.js';

export {
  runSeeds,
  SeedRunner,
  type SeedDefinition,
  type SeedRunnerOptions,
} from './seed/seed-runner.js';
export * from './repository/lead.repository.js';
