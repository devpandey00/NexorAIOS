import { LeadStatus } from '@nexor/database';

const transitions: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ['RESEARCHED', 'QUALIFIED', 'PITCH_READY'],
  RESEARCHED: ['QUALIFIED', 'PITCH_READY'],
  QUALIFIED: ['PITCH_READY', 'CONTACTED'],
  PITCH_READY: ['CONTACTED'],
  CONTACTED: ['REPLIED'],
  REPLIED: ['MEETING_BOOKED'],
  MEETING_BOOKED: ['PROPOSAL_SENT'],
  PROPOSAL_SENT: ['WON', 'LOST'],
  WON: [],
  LOST: [],
};

export function canTransition(from: LeadStatus, to: LeadStatus) {
  return from === to || transitions[from]?.includes(to) === true;
}

export function assertTransition(from: LeadStatus, to: LeadStatus) {
  if (!canTransition(from, to)) throw new Error(`Invalid lead transition: ${from} → ${to}`);
}
