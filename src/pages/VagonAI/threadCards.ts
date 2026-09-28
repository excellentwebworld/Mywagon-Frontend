/**
 * The card rules for the Vagon AI transcript — all three kinds of card.
 *
 * Extracted from VagonAIPage so they can be reasoned about — and tested — on
 * their own: they are the whole answer to "which card does the shipper see?",
 * and the gateway re-sends an unresolved proposal often enough that getting it
 * wrong stacks duplicates in the thread.
 *
 * Three cards can occupy a turn. A confirmation card is a gate: nothing is
 * written until it is pressed, so exactly one is live and the rest retire. A
 * selection list is an offer: it disambiguates a lookup, and once answered it
 * stays in the transcript as a record of what was picked — inert, not deleted.
 * A record list is neither: it is the answer to a lookup, so nothing is pending
 * on it, nothing retires it and nothing de-duplicates it. Two lookups in one
 * conversation are two answers, and both belong in the transcript — the gateway
 * sends at most one per turn, which is the only limit it needs.
 */
import type {
  ChatUsage, PendingAction, DraftCreated, ShipmentPublished, SelectionRequest, ResultCardSet,
  FlowContextEvent,
} from '../../hooks/useChat';

export interface ThreadMessage {
  who: 'user' | 'ai';
  text: string;
  pending?: boolean;
  isError?: boolean;
  usage?: ChatUsage | null;
  sentAt?: string;
  /** A write action awaiting the shipper's approval; renders a card instead of text. */
  action?: PendingAction;
  /** A draft shipment produced by a confirmed action; renders a review link. */
  draft?: DraftCreated;
  /** A load a confirmed publish put on the market; renders a link to the live shipment. */
  published?: ShipmentPublished;
  /** The gateway's line for an action that failed on this turn; shown as-is. */
  actionError?: string;
  /** A lookup the gateway is offering as cards; renders a list below the text. */
  selection?: SelectionRequest;
  /**
   * Set once the shipper answers a card list — the list is spent and shows their
   * picks. An array because some lists take several: a load can accept two
   * trailer types and go to five hauliers.
   */
  selectionChoice?: string[];
  /** Records a lookup found; renders detail cards with a route to each one. */
  records?: ResultCardSet;
  /**
   * The guided create-shipment bundle, when this turn opened the flow.
   *
   * Unlike the three cards above it competes with nothing and retires nothing:
   * it asks no question and answers none, it is the material the card sequence
   * runs off. So there is no live-index rule for it — the turn that opened it
   * keeps it, and a later turn opening another one simply anchors its own.
   */
  flow?: FlowContextEvent;
  /** MS3-349: background batch draft job id. */
  batchJobId?: string;
}

/** Index of the newest proposal in a transcript — the only one still confirmable. */
export const newestCardIndex = (th: ThreadMessage[]): number => (
  th.reduce((found, m, i) => (m.action ? i : found), -1)
);

/**
 * Index of the newest unanswered card list — the only one still tappable.
 *
 * An answered list is skipped rather than dropped: it keeps its place in the
 * transcript showing what was picked, and must not come back to life when a
 * later turn happens not to ask anything.
 */
export const newestSelectionIndex = (th: ThreadMessage[]): number => (
  th.reduce((found, m, i) => (m.selection && !m.selectionChoice?.length ? i : found), -1)
);

/**
 * Settles a picker and a Confirm button both being on screen.
 *
 * They are two competing next actions for the same decision, so the gateway
 * never sends them together — if both are present, one is left over from an
 * earlier turn. The later turn wins; on a tie the proposal does, since a picker
 * only ever leads to one and never the other way round.
 */
export const resolveLiveCards = (actionIndex: number, selectionIndex: number): {
  action: number;
  selection: number;
} => {
  if (actionIndex < 0 || selectionIndex < 0) return { action: actionIndex, selection: selectionIndex };
  return actionIndex >= selectionIndex
    ? { action: actionIndex, selection: -1 }
    : { action: -1, selection: selectionIndex };
};

/**
 * Enforces one card per transcript.
 *
 * An unresolved action is re-sent on every later turn with the same id, and is
 * replaced by a new id if the shipper corrects a detail — so a copy gets left
 * behind on the turn it first appeared on. Left alone it would stack a second
 * card, and once the live proposal was resolved it would become the newest card
 * and reappear as if still pending. So every card but `keepIndex` retires (pass
 * -1 to retire all of them), and a turn whose only content was the card drops
 * out rather than leaving an empty bubble where the card stood.
 */
export const retireCards = (th: ThreadMessage[], keepIndex: number): ThreadMessage[] => (
  th.reduce<ThreadMessage[]>((out, m, i) => {
    if (!m.action || i === keepIndex) out.push(m);
    // A turn can hold both a failed lookup and the proposal the bot made
    // instead, so the failure has to outlive the retired card — as does a card
    // list, which is a record of the shipper's own choice.
    else if (m.text || m.draft || m.actionError || m.selection || m.records) out.push({ ...m, action: undefined });
    return out;
  }, [])
);

/**
 * Drops a card list that is on screen twice.
 *
 * Same de-duplication rule as the confirmation card, but by request id rather
 * than by position: only an exact re-send is a duplicate. A list with a
 * different id is a different question — the pickup site, then the delivery
 * site — and stays where it was asked, so the transcript still reads as a
 * conversation. `keepIndex` is the copy that survives; a turn that held nothing
 * but the duplicate drops out rather than leaving an empty bubble.
 */
export const dedupeSelections = (th: ThreadMessage[], keepIndex: number): ThreadMessage[] => {
  const liveId = th[keepIndex]?.selection?.id;
  if (!liveId) return th;
  return th.reduce<ThreadMessage[]>((out, m, i) => {
    // An answered copy is not a duplicate — it is the turn the shipper actually
    // replied on, and it keeps the pick it recorded.
    if (m.selection?.id !== liveId || i === keepIndex || m.selectionChoice?.length) out.push(m);
    else if (m.text || m.draft || m.published || m.actionError || m.action || m.records) {
      out.push({ ...m, selection: undefined });
    }
    return out;
  }, []);
};

/**
 * Index of the newest guided flow — the only one still usable.
 *
 * A flow holds its own draft in component state, so two on screen are two
 * half-filled loads competing for one Publish button. The older one is not just
 * redundant, it is answerable: a shipper scrolling up and finishing it would
 * submit the itinerary they had already abandoned.
 */
export const newestFlowIndex = (th: ThreadMessage[]): number => (
  th.reduce((found, m, i) => (m.flow ? i : found), -1)
);

/**
 * Drops every guided flow except the newest.
 *
 * Removed rather than left inert, unlike an answered card list. A spent picker
 * still says what was chosen, which is worth keeping in a transcript; an
 * abandoned flow says only what someone started to type into a form that no
 * longer leads anywhere.
 */
export const retireFlows = (th: ThreadMessage[], liveIndex: number): ThreadMessage[] => (
  th.map((m, i) => (m.flow && i !== liveIndex ? { ...m, flow: undefined } : m))
);
