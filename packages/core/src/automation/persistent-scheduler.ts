import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

export interface ScheduleInput {
  name: string;
  workflow: string;
  input: Record<string, unknown>;
  cron?: string;
  runAt?: Date;
  timezone?: string;
  nextRunAt?: Date;
}

export interface WorkflowExecutionResult {
  success: boolean;
  results?: Record<string, unknown>;
  failedStep?: string;
}

export interface PersistentScheduler {
  create(input: ScheduleInput): Promise<unknown>;
  due(limit?: number): Promise<unknown[]>;
  claim(scheduleId: string): Promise<unknown | null>;
  complete(runId: string, output: unknown): Promise<void>;
  fail(runId: string, error: string): Promise<void>;
}

export class DatabasePersistentScheduler implements PersistentScheduler {
  constructor(private readonly db: PrismaClient) {}

  async create(input: ScheduleInput) {
    const id = randomUUID();
    const now = new Date();
    await this.db.$executeRaw`
      INSERT INTO "public"."automation_schedules"
      ("id","name","workflow","input","cron","run_at","timezone","status","next_run_at","created_at","updated_at")
      VALUES (${id}::uuid, ${input.name}, ${input.workflow}, ${JSON.stringify(input.input)}::jsonb,
        ${input.cron ?? null}, ${input.runAt ?? null}, ${input.timezone ?? 'UTC'}, 'ACTIVE',
        ${input.nextRunAt ?? input.runAt ?? null}, ${now}, ${now})
    `;
    return { id, ...input, status: 'ACTIVE' };
  }

  async due(limit = 20) {
    return this.db.$queryRaw`
      SELECT * FROM "public"."automation_schedules"
      WHERE "status" = 'ACTIVE' AND "next_run_at" IS NOT NULL AND "next_run_at" <= NOW()
      ORDER BY "next_run_at" ASC LIMIT ${Math.max(1, Math.min(limit, 100))}
    ` as Promise<unknown[]>;
  }

  async claim(scheduleId: string) {
    const runId = randomUUID();
    const rows = await this.db.$queryRaw`
      WITH claimed AS (
        UPDATE "public"."automation_schedules"
        SET "last_run_at" = NOW(), "run_count" = "run_count" + 1, "updated_at" = NOW()
        WHERE "id" = ${scheduleId}::uuid AND "status" = 'ACTIVE'
        RETURNING "id", "workflow", "input"
      )
      INSERT INTO "public"."automation_runs" ("id","schedule_id","status","input","started_at","created_at")
      SELECT ${runId}::uuid, "id", 'RUNNING', "input", NOW(), NOW() FROM claimed RETURNING *
    ` as unknown[];
    return rows[0] ?? null;
  }

  async complete(runId: string, output: unknown) {
    await this.db.$executeRaw`
      UPDATE "public"."automation_runs"
      SET "status" = 'COMPLETED', "output" = ${JSON.stringify(output)}::jsonb, "completed_at" = NOW()
      WHERE "id" = ${runId}::uuid
    `;
  }

  async fail(runId: string, error: string) {
    await this.db.$executeRaw`
      UPDATE "public"."automation_runs"
      SET "status" = 'FAILED', "error" = ${error}, "completed_at" = NOW()
      WHERE "id" = ${runId}::uuid
    `;
  }
}

export async function executeClaimedRun(
  scheduler: DatabasePersistentScheduler,
  run: { id: string; workflow: string; input: Record<string, unknown> },
  execute: (workflow: string, input: Record<string, unknown>) => Promise<WorkflowExecutionResult>,
) {
  try {
    const result = await execute(run.workflow, run.input);
    if (!result.success) throw new Error(`Workflow failed at ${result.failedStep ?? 'unknown step'}`);
    await scheduler.complete(run.id, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await scheduler.fail(run.id, message);
    throw error;
  }
}
