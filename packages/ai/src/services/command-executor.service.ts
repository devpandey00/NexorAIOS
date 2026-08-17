import { commandRouterService, type CommandRoute } from './command-router.service.js';
import { executeWorkflow, type SupportedWorkflow } from '@nexor/tools';

export interface CommandExecutionResult {
  route: CommandRoute;
  execution: Awaited<ReturnType<typeof executeWorkflow>>;
}

export class CommandExecutorService {
  async execute(command: string, context: Record<string, unknown> = {}): Promise<CommandExecutionResult> {
    const route = await commandRouterService.route(command, context);
    const execution = await executeWorkflow(route.workflow as SupportedWorkflow, {
      command,
      ...route.input,
      context,
    });

    return { route, execution };
  }
}

export const commandExecutorService = new CommandExecutorService();
