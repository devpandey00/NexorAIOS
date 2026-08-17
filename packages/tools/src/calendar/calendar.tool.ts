import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export const calendarTool: Tool = {
  id: 'calendar',
  name: 'Calendar',
  description: 'Prepare validated calendar events for the Nexor automation layer.',
  category: 'productivity',
  async execute(input: ToolInput): Promise<ToolOutput> {
    if (!input.title || !input.start) return { success: false, error: 'title and start are required' };
    const start = new Date(String(input.start));
    if (Number.isNaN(start.getTime())) return { success: false, error: 'start must be a valid ISO date' };
    const end = input.end ? new Date(String(input.end)) : new Date(start.getTime() + 30 * 60_000);
    if (Number.isNaN(end.getTime()) || end <= start) return { success: false, error: 'end must be after start' };
    return { success: true, data: { title: String(input.title), start: start.toISOString(), end: end.toISOString(), location: input.location ?? null, description: input.description ?? null } };
  },
};
