export type ToolStatus = 'ready' | 'connect' | 'building';

export interface NexorTool {
  slug: string;
  name: string;
  group: string;
  description: string;
  status: ToolStatus;
}

const groups: Array<[string, string[]]> = [
  ['Command & Autopilot', ['Autopilot','AI Command Center','Automation Center','Message Drafter']],
  ['Lead Generation', ['Lead Finder','Google Maps Prospecting','Directory Prospecting','Query Generator','Industry Rotation','Location Rotation','Service Rotation','Search Intent Rotation','Lead Import','Lead Deduplication','Company Prospecting','Influencer Prospecting','Job Search','Project Finder']],
  ['Sales & CRM', ['Lead Inbox','Lead Scoring','ICP Scoring','Requirement Detector','Service Matcher','CRM Pipeline','Deal Tracker','Task Manager','Meeting Tracker','Proposal Tracker']],
  ['WhatsApp & Email', ['WhatsApp Automation','WhatsApp Drafts','WhatsApp Approval','WhatsApp Sending','Message Sender','WhatsApp Inbox','Messenger','Reply Classifier','Email Drafts','Email Approval','Email Sending','Email Inbox','Follow-up Manager']],
  ['Social Media', ['Social Media Manager','Content Calendar','Instagram Manager','Facebook Manager','LinkedIn Manager','X Manager','YouTube Manager','Social Scheduler','Social Inbox','Social Analytics','Hashtag Research']],
  ['Content Studio', ['Content Ideas','Caption Writer','Hook Generator','CTA Generator','Carousel Writer','Reel Script Writer','Blog Writer','LinkedIn Writer','Newsletter Writer','Content Repurposer']],
  ['Creative Studio', ['Video Editing','Graphic Briefs','Social Post Designer','Carousel Designer','Ad Creative Designer','Story Designer','Thumbnail Designer','Brand Kit','Creative Variants','Image Prompt Studio','Creative Library']],
  ['Meta Advertising', ['Meta Ads Overview','Campaign Manager','Ad Set Manager','Creative Manager','Audience Planner','Lead Ads','Pixel & Events','Meta Reporting','Meta Optimization','Meta ROAS']],
  ['Google Advertising', ['Google Ads Overview','Search Campaigns','Keyword Planner','Search Terms','Ad Copy Studio','Conversion Tracking','Google Reporting','Google Optimization','Google ROAS','Shopping Ads']],
  ['SEO & Analytics', ['SEO Audit','Keyword Research','On-Page SEO','Technical SEO','Local SEO','Search Console','GA4 Analytics','GTM Tracking','Competitor SEO','SEO Reporting']],
  ['Web & AI Ops', ['Website Projects','Landing Page Builder','Website Audit','WordPress Manager','Forms & Leads','Sitemap Manager','Schema Builder','AI Agents']],
];

// READY means this tool has a real execution workspace wired to a real backend flow.
// Provider-dependent operations still expose configuration errors instead of fake success.
const readyTools = new Set([
  'Autopilot',
  'Lead Finder',
  'Lead Inbox',
  'Company Prospecting',
  'Influencer Prospecting',
  'Job Search',
  'Project Finder',
  'Message Drafter',
  'Message Sender',
  'WhatsApp Automation',
  'WhatsApp Drafts',
  'Messenger',
  'Content Calendar',
  'Social Media Manager',
  'Video Editing',
]);

export const nexorTools: NexorTool[] = groups.flatMap(([group, names]) =>
  names.map((name) => ({
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    group,
    description: `Workspace for ${name.toLowerCase()} inside NexorAIOS.`,
    status: readyTools.has(name) ? 'ready' : 'connect',
  })),
);

export const toolGroups = groups.map(([name]) => name);
export const toolCount = nexorTools.length;

export function getTool(slug: string): NexorTool | undefined {
  return nexorTools.find((tool) => tool.slug === slug);
}
