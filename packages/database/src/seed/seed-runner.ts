/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { createHash } from 'node:crypto';
import { getLogger } from '@nexor/logger';
import { getWriteClient } from '../transaction/index.js';

export interface SeedDefinition { name: string; version: number; run: () => Promise<void>; }
export interface SeedRunnerOptions { force?: boolean; }

export class SeedRunner {
  private readonly logger = getLogger().child({ component: 'seed-runner' });
  constructor(private readonly seeds: SeedDefinition[]) {}

  async run(options: SeedRunnerOptions = {}): Promise<void> {
    const client = getWriteClient();
    for (const seed of this.seeds) {
      const existing = await client.seedExecution.findUnique({ where: { name: seed.name } });
      if (existing && existing.version >= seed.version && !options.force) {
        this.logger.info({ seed: seed.name, version: seed.version }, 'Seed already executed, skipping');
        continue;
      }
      const start = Date.now();
      this.logger.info({ seed: seed.name, version: seed.version }, 'Running seed');
      await seed.run();
      const durationMs = Date.now() - start;
      const checksum = createHash('sha256').update(`${seed.name}:${seed.version}`).digest('hex');
      await client.seedExecution.upsert({
        where: { name: seed.name },
        create: { name: seed.name, version: seed.version, durationMs, checksum },
        update: { version: seed.version, executedAt: new Date(), durationMs, checksum },
      });
      this.logger.info({ seed: seed.name, version: seed.version, durationMs }, 'Seed completed successfully');
    }
  }
}

export async function runSeeds(seeds: SeedDefinition[], options?: SeedRunnerOptions): Promise<void> {
  const runner = new SeedRunner(seeds);
  await runner.run(options);
}
