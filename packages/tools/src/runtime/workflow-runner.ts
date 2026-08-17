import type { ToolInput, ToolOutput } from '../types/tool.js';
import { toolRegistry } from '../registry/tool-registry.js';

export interface WorkflowStep {
  id: string;
  tool: string;
  input?: ToolInput | ((context: WorkflowContext) => ToolInput | Promise<ToolInput>);
  optional?: boolean;
}

export interface WorkflowContext {
  input: ToolInput;
  results: Record<string, ToolOutput>;
}

export interface WorkflowResult {
  success: boolean;
  results: Record<string, ToolOutput>;
  failedStep?: string;
  error?: string;
  executionTime?: number;
}

export async function runWorkflow(steps: WorkflowStep[], input: ToolInput = {}): Promise<WorkflowResult> {
  const startedAt = Date.now();
  const context: WorkflowContext = { input, results: {} };

  for (const step of steps) {
    try {
      const stepInput = typeof step.input === 'function' ? await step.input(context) : (step.input ?? input);
      const result = await toolRegistry.execute(step.tool, stepInput);
      context.results[step.id] = result;

      if (!result.success && !step.optional) {
        return {
          success: false,
          results: context.results,
          failedStep: step.id,
          error: result.error ?? `Workflow step failed: ${step.id}`,
          executionTime: Date.now() - startedAt,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.results[step.id] = { success: false, error: message, executionTime: 0 };

      if (!step.optional) {
        return {
          success: false,
          results: context.results,
          failedStep: step.id,
          error: message,
          executionTime: Date.now() - startedAt,
        };
      }
    }
  }

  return { success: true, results: context.results, executionTime: Date.now() - startedAt };
}
