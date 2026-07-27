import { connectDatabase, disconnectDatabase } from '../client/index.js';
import { runSeeds, type SeedDefinition } from './seed-runner.js';

const infrastructureSeeds: SeedDefinition[] = [
  {
    name: 'infrastructure:baseline',
    version: 1,
    async run() {
      // Phase 0 baseline seed — validates database connectivity.
      // Business module seeds will be registered here in future phases.
    },
  },
];

async function main(): Promise<void> {
  await connectDatabase();

  try {
    await runSeeds(infrastructureSeeds);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error: unknown) => {
  console.error('Seed execution failed:', error);
  process.exit(1);
});
