import { calendarTool } from '../calendar/calendar.tool.js';
import { crmTool } from '../crm/crm.tool.js';
import { emailTool } from '../email/email.tool.js';
import { filesTool } from '../files/files.tool.js';
import { proposalTool } from '../proposal/proposal.tool.js';
import { searchTool } from '../search/search.tool.js';
import { websiteTool } from '../website/website.tool.js';
import { whatsappTool } from '../whatsapp/whatsapp.tool.js';
import { leadScoringTool } from '../sales/lead-scoring.tool.js';
import { outreachDraftTool } from '../sales/outreach-draft.tool.js';
import { toolRegistry } from './tool-registry.js';

export function registerDefaultTools() {
  for (const tool of [calendarTool, crmTool, emailTool, filesTool, proposalTool, searchTool, websiteTool, whatsappTool, leadScoringTool, outreachDraftTool]) {
    if (!toolRegistry.has(tool.id)) toolRegistry.register(tool);
  }
}
