import type { ToolInput } from '../types/tool.js';
import { executeWorkflow, type SupportedWorkflow } from '../workflows/workflow-executor.js';

export interface AutomationJob {
  id: string;
  name: string;
  workflow: SupportedWorkflow;
  input: ToolInput;
  runAt: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  lastError?: string;
}

export class AutomationScheduler {
  private readonly jobs = new Map<string, AutomationJob>();

  schedule(job: Omit<AutomationJob, 'status'>): AutomationJob {
    const scheduled: AutomationJob = { ...job, status: 'scheduled' };
    this.jobs.set(scheduled.id, scheduled);
    return scheduled;
  }

  cancel(id: string): boolean {
    return this.jobs.delete(id);
  }

  list(): AutomationJob[] {
    return [...this.jobs.values()].sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
  }

  async runDue(now = new Date()): Promise<AutomationJob[]> {
    const due = this.list().filter((job) => job.status === 'scheduled' && job.runAt.getTime() <= now.getTime());
    const completed: AutomationJob[] = [];

    for (const job of due) {
      job.status = 'running';
      try {
        const result = await executeWorkflow(job.workflow, job.input);
        if (!result.success) {
          job.status = 'failed';
          job.lastError = result.failedStep ?? 'Workflow failed';
        } else {
          job.status = 'completed';
        }
      } catch (error) {
        job.status = 'failed';
        job.lastError = error instanceof Error ? error.message : String(error);
      }
      completed.push(job);
    }

    return completed;
  }
}

export const automationScheduler = new AutomationScheduler();
