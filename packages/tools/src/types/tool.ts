export type ToolCategory =
  'research' | 'communication' | 'crm' | 'productivity' | 'automation' | 'files' | 'sales';

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
}

export interface Tool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;

  execute(input: ToolInput): Promise<ToolOutput>;
}
