/** MS3-407: reading the gateway's R1c answer for the welcome screen's "continue your unfinished shipment" offer. */
import type { UnfinishedResponse } from './contract';

export interface UnfinishedLoad { conversationId: string; route: string | null }

/** The gateway's answer as the banner reads it: a load worth offering, or nothing (a malformed body is nothing too). */
export function unfinishedOf(res: UnfinishedResponse | null | undefined): UnfinishedLoad | null {
  if (!res || !res.ok || !res.intakeId || typeof res.conversationId !== 'string' || !res.conversationId) return null;
  return { conversationId: res.conversationId, route: typeof res.route === 'string' && res.route.trim() ? res.route : null };
}
