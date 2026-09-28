/**
 * VagonAIPage (/vagonai) — the Vagon AI Copilot chat. Streams plain-text
 * markdown answers from the real chat gateway (see hooks/useChat.ts);
 * renders headings/lists/quotes/fenced-code/links plus a blinking cursor
 * while a reply is still streaming.
 */
import {
  useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode,
} from 'react';
import {
  Sparkles, Send, Copy, Check, RefreshCw, AlertTriangle, ArrowRight,
  PackagePlus, Boxes, MapPinPlus, PackageSearch,
  Handshake, Clock, ListChecks, Ban, Palette, Truck, ExternalLink, CalendarClock,
  ClipboardList, ClipboardCheck, Paperclip,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  useChat, checkGatewayAuth,
  type CargoCapture, type FlowContextEvent, type GatewayAuthStatus, type PendingAction, type SelectionRequest,
} from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';
import { STATUS_COLORS } from '../../utils/themes';
import ConfirmActionCard from './ConfirmActionCard';
import { canMeasureRoute, measureRoute, stopCoordinates } from './measureRoute';
import SelectionCards from './SelectionCards';
import ResultCards from './ResultCards';
import ShipmentReviewCard, { type FlowSubmitResult } from './ShipmentReviewCard';
import CreateProductForm, { type ProductSubmitResult } from './CreateProductForm';
import CreateAddressForm, { type AddressSubmitResult } from './CreateAddressForm';
import CreateOrderForm, { type OrderSubmitResult } from './CreateOrderForm';
import { submitShipmentDraft } from './api/shipmentDraftService';
import { submitProductDraft } from './api/productDraftService';
import { submitLocationDraft } from './api/locationDraftService';
import { submitOrderDraft } from './api/orderDraftService';
import { submitOrderIntake, type OrderIntakeResponse } from './api/orderIntakeService';
import OrderIntakeResultCard, { buildReviewCreatePrompt } from './OrderIntakeResultCard';
import StickyOrdersPanel, { buildDraftPrompt, buildStickyCreateForceTool, type StickyOrderRow } from './StickyOrdersPanel';
import BatchDraftJobCard from './BatchDraftJobCard';
import {
  applyErpSeedToFlowDraft,
  buildEnrichedDraftPrompt,
  buildErpDraftSeedFromOrder,
  pickSeedForDraft,
  type ErpDraftLocationSeed,
} from './seedDraftFromErpOrder';
import { erpOrdersService } from '../../api';
import { isOrderIntakeFile, looksLikeOrderTable, ORDER_INTAKE_ACCEPT } from './orderIntakeDetect';
import { fetchScheduleTemplate } from './api/scheduledPostsService';
import { schedulableIssues, type ShipmentDraft } from './createShipmentDraft';
import { applyCargoHintsToSeedDraft, parseCargoHintsFromMessage } from './parseCargoChatHints';
import {
  applyLocationChoiceToDraft,
  ensureStopSchedules,
  inferLocationSlot,
  parseLocationOptionId,
} from './applyLocationChoiceToDraft';
import {
  applyProductChoiceToDraft,
  parseProductOptionId,
} from './applyProductChoiceToDraft';
import { synthesizeShipmentFlowFromProduct } from './synthesizeShipmentFlow';
import type { ProductDraft } from './createProductDraft';
import HistorySidebar from './HistorySidebar';
import { useConversations } from './hooks/useConversations';
import { getConversationMessages } from './api/conversationsService';
import { formatConversationTimestamp } from './historyGrouping';
import {
  newestCardIndex, newestSelectionIndex, newestFlowIndex, resolveLiveCards, retireCards, retireFlows, dedupeSelections,
  type ThreadMessage,
} from './threadCards';
import '../../styles/vagonai.css';
import '../../styles/scheduled-post.css';
import { ScheduledPostingDrawer } from './ScheduledPostingDrawer';
import { ScheduleBulkDrawer, type ScheduleTemplate } from './ScheduleBulkDrawer';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

type Prompt = { key: string; icon: ComponentType<{ size?: number }> };

/**
 * The things the assistant can actually do for the shipper: each opens a tool
 * flow rather than answering a question. Rendered as the headline offer.
 *
 * `createOrder` sits directly under `createShipment` deliberately. The two are
 * the pair shippers confuse — an order is freight they have SOLD, a shipment is
 * the transport — and having both on screen, described in one line each, is what
 * makes the difference visible before anyone has to ask for it in words.
 */
const TOOL_ACTIONS: Prompt[] = [
  { key: 'createShipment', icon: PackagePlus },
  { key: 'createOrder', icon: ClipboardList },
  { key: 'shipOrder', icon: ClipboardCheck },
  { key: 'createProduct', icon: Boxes },
  { key: 'createAddress', icon: MapPinPlus },
  { key: 'findShipment', icon: PackageSearch },
];

/**
 * The product questions. These explain MYVAGON but change nothing, so they are
 * chips rather than cards — the same offer at a lighter weight, which is what
 * keeps ten equally-sized boxes from flattening the one decision that matters.
 */
const KNOWLEDGE_PROMPTS: Prompt[] = [
  { key: 'bidsOnAccept', icon: Handshake },
  { key: 'autoReady', icon: Clock },
  { key: 'fulfilledDiff', icon: ListChecks },
  { key: 'cancelOnTrip', icon: Ban },
  { key: 'readyColor', icon: Palette },
  { key: 'fleetPending', icon: Truck },
];

type MdBlock =
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'h'; level: number; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

/* ── inline formatting: **bold**, *italic*, `code`, [text](url) ── */
function renderInline(text: string, T: ThemeTokens): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) {
      return (
        <code key={i} style={{ ...MONO, fontSize: '0.9em', background: T.sa, padding: '1px 5px', borderRadius: 4 }}>
          {p.slice(1, -1)}
        </code>
      );
    }
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" style={{ color: T.ac, textDecoration: 'underline' }}>
          {link[1]}
        </a>
      );
    }
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

/* ── markdown block parser: paragraphs, headings, lists, blockquotes, fenced code ── */
function parseMdBlocks(text: string): MdBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') });
      para = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flushPara();
      const lang = fence[1];
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', lang, code: code.join('\n') });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      flushPara();
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }
    const quote = line.match(/^>\s?(.*)/);
    if (quote) {
      flushPara();
      const qLines = [quote[1]];
      i += 1;
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qLines.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: qLines.join(' ') });
      continue;
    }
    const isUl = /^\s*[-*]\s+(.*)/.test(line);
    const isOl = /^\s*\d+\.\s+(.*)/.test(line);
    if (isUl || isOl) {
      flushPara();
      const kind = isOl ? 'ol' : 'ul';
      const re = isOl ? /^\s*\d+\.\s+(.*)/ : /^\s*[-*]\s+(.*)/;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push((lines[i].match(re) as RegExpMatchArray)[1]);
        i += 1;
      }
      blocks.push({ type: kind, items });
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      i += 1;
      continue;
    }
    para.push(line.trim());
    i += 1;
  }
  flushPara();
  return blocks;
}

/* Decorative: the text itself is already announced by the thread's live
   region, and a caret read out as "▍" adds nothing but noise. */
/**
 * How the dashboard shortcut is written on the hint line.
 *
 * Read once at module load rather than per render: the platform does not change
 * mid-session, and this is a label on a line that re-renders on every keystroke.
 *
 * `userAgentData.platform` where the browser has it, `navigator.platform` where
 * it does not — the latter is deprecated but is still what Safari and Firefox
 * answer to. Neither is a security boundary; the worst a wrong answer does is
 * print "Ctrl" to a Mac user whose Cmd+D works anyway, because the handler tests
 * both modifiers regardless of what this says.
 */
const IS_MAC = /mac/i.test(
  (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? '',
);
const dashboardShortcutLabel = IS_MAC ? '⌘D' : 'Ctrl + D';

const BLINK_CURSOR = <span className="vai-caret" aria-hidden="true">▍</span>;

/**
 * The colours the working indicator rolls between.
 *
 * A fixed palette rather than a random hue, because an arbitrary one lands on
 * grey, on neon, or on something that vanishes into the surface it sits on —
 * and this text has to stay readable in every theme the shipper can pick. The
 * dark set is lifted deliberately: the mid-tones that read well on white
 * disappear against a near-black chat surface.
 */
const ACTIVITY_TONES_LIGHT = ['#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DB2777'];
const ACTIVITY_TONES_DARK = ['#C4A0FF', '#8FBCFF', '#5FD6E8', '#5FD9A6', '#F5C065', '#FF9CC4'];

/**
 * The tone for one activity line: random-looking, but a pure function of what
 * it says and which turn it belongs to.
 *
 * Deliberately not `Math.random()` at render time. React may render the same
 * state more than once, so a hue rolled during render would strobe as tokens
 * stream in — and the status line refreshes every couple of seconds, which is
 * exactly when a flickering colour stops reading as progress and starts
 * reading as a fault. Hashing the label instead pins the colour for as long as
 * the stage lasts and changes it the moment the gateway says something new;
 * the per-turn seed (rolled in the handler that starts the turn, where
 * randomness is allowed) is what keeps two identical stages in different turns
 * from always landing on the same colour.
 */
/** The per-turn seed. Module scope: nothing random may run during a render. */
function freshToneSeed(): number {
  return Math.floor(Math.random() * 0xffff);
}

function activityTone(text: string, seed: number, isDark: boolean): string {
  const tones = isDark ? ACTIVITY_TONES_DARK : ACTIVITY_TONES_LIGHT;
  let hash = seed;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return tones[Math.abs(hash) % tones.length]!;
}

/* ── fenced code block with its own copy button ── */
function CodeBlock({ lang, code, t }: { lang: string; code: string; t: (key: string) => string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="vai-code">
      <div className="vai-code-bar">
        <span className="vai-code-lang" style={MONO}>{lang || 'text'}</span>
        <button type="button" onClick={copy} className="vai-code-copy">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? t('vagonai.live.copied') : t('vagonai.live.copy')}
        </button>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto" style={{ margin: 0 }}>
        <code style={{ ...MONO, fontSize: 12.5, color: '#cdd6f4', whiteSpace: 'pre' }}>{code}</code>
      </pre>
    </div>
  );
}

/* ── streamed markdown answer: headings/lists/code/links + blinking cursor while live ── */
function MarkdownAnswer({ text, streaming, T, t }: { text: string; streaming: boolean; T: ThemeTokens; t: (key: string) => string }) {
  const blocks = parseMdBlocks(text);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => {
        const last = i === blocks.length - 1;
        if (b.type === 'h') {
          const size = b.level === 1 ? 17 : 15;
          return (
            <div key={i} style={{ fontSize: size, fontWeight: 700, color: T.t1, marginTop: i ? 6 : 0, letterSpacing: '-0.01em' }}>
              {renderInline(b.text, T)}{last && streaming && BLINK_CURSOR}
            </div>
          );
        }
        if (b.type === 'code') return <CodeBlock key={i} lang={b.lang} code={b.code} t={t} />;
        if (b.type === 'quote') {
          return (
            <blockquote key={i} className="pl-3 m-0" style={{ borderLeft: `3px solid ${T.ac}`, color: T.t2, fontStyle: 'italic', fontSize: 14, lineHeight: 1.6 }}>
              {renderInline(b.text, T)}{last && streaming && BLINK_CURSOR}
            </blockquote>
          );
        }
        if (b.type === 'ul' || b.type === 'ol') {
          const Tag = b.type === 'ul' ? 'ul' : 'ol';
          return (
            <Tag key={i} className="pl-[20px]" style={{ listStyle: b.type === 'ul' ? 'disc' : 'decimal' }}>
              {b.items.map((it, j) => (
                <li key={j} style={{ fontSize: 14, lineHeight: 1.65, color: T.t1 }}>
                  {renderInline(it, T)}{last && j === b.items.length - 1 && streaming && BLINK_CURSOR}
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="m-0" style={{ fontSize: 14, lineHeight: 1.65, color: T.t1 }}>
            {renderInline(b.text, T)}{last && streaming && BLINK_CURSOR}
          </p>
        );
      })}
      {blocks.length === 0 && streaming && <p className="m-0">{BLINK_CURSOR}</p>}
    </div>
  );
}

/**
 * A thing the copilot can do: icon chip, short title, and the full question it
 * will send. Hover and focus are styled in vagonai.css rather than by mutating
 * `style` from mouse handlers, so a keyboard user gets the same affordance a
 * mouse user does — and the card no longer has to guess at a hover shadow.
 */

/**
 * MS3-347: hide internal sticky/forceTool prompt text from the user bubble.
 *
 * The sticky buttons send a prompt addressed to the model; the shipper sees what
 * they actually did, in their own language. Both prompt forms are recognised —
 * `buildDraftPrompt` names orders as `REF (id N)`, the seeded
 * `buildEnrichedDraftPrompt` as `ERP order REF (order id N)` — and orders are
 * counted by distinct id, so a batch is never shown as "from the orders panel"
 * merely because it came in the second spelling.
 */
function displayUserMessage(text: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const raw = (text ?? '').trim();
  if (!raw) return '';

  const oneshot = raw.match(/\[\[VAGON_STICKY_ONESHOT:([^\]]+)\]\]/);
  const orderRef =
    raw.match(/ERP order\s+(.+?)\s+\(order id/i)?.[1]?.trim() ||
    raw.match(/order_id\s+"([^"]+)"/i)?.[1]?.trim();

  if (oneshot || /create_oneshot_draft_from_order/i.test(raw)) {
    return orderRef
      ? t('vagonai.bubble.createOne', { ref: orderRef })
      : t('vagonai.bubble.createOneFromPanel');
  }

  if (/create_homogeneous_batch_drafts/i.test(raw) || /exactly one draft per order/i.test(raw)) {
    const ids = new Set([...raw.matchAll(/\((?:order )?id\s+(\d+)\)/gi)].map((m) => m[1]));
    if (ids.size > 1) return t('vagonai.bubble.createMany', { n: ids.size });
    if (ids.size === 1 && orderRef) return t('vagonai.bubble.createOne', { ref: orderRef });
    return t('vagonai.bubble.createManyFromPanel');
  }

  // Collapse runaway blank lines from markdown / prompt paste (AC4 companion).
  return raw.replace(/\n{3,}/g, '\n\n');
}

function ActionCard({
  icon: Icon, title, desc, onClick,
}: { icon: ComponentType<{ size?: number }>; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="vai-action">
      <span className="vai-action-icon">
        <Icon size={17} />
      </span>
      <span className="vai-action-body">
        <span className="vai-action-title">{title}</span>
        <span className="vai-action-desc">{desc}</span>
      </span>
      <ArrowRight size={15} className="vai-action-arrow" aria-hidden="true" />
    </button>
  );
}

/**
 * A product question. The visible label is the short title; the accessible name
 * carries the whole question so a screen reader user hears what will be asked
 * without the visible text being replaced (WCAG label in name).
 */
function PromptChip({
  icon: Icon, title, desc, onClick,
}: { icon: ComponentType<{ size?: number }>; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="vai-chip" aria-label={`${title}: ${desc}`}>
      <Icon size={14} />
      {title}
    </button>
  );
}

export default function VagonAIPage() {
  const { t, lang } = useTranslation();
  /**
   * The scheduled bulk posting drawer.
   *
   * Held here rather than in the thread on purpose: it is form-driven and has
   * no NLU dependency, so it works with the copilot switched off and must not
   * add a turn to the transcript.
   */
  const [schedulerOpen, setSchedulerOpen] = useState(false);

  /**
   * The draft a Review card handed over to be scheduled, if any.
   *
   * Held at the page rather than inside the flow so its drawer and the ledger
   * above are siblings — both portal to `sp-drawer-root`, and nesting them puts
   * two overlays on the same click. It also keeps `CreateShipmentFlow` free of
   * the conversation id, exactly as `onSubmit` already does.
   */
  const [scheduleTemplate, setScheduleTemplate] = useState<ScheduleTemplate | null>(null);
  const { T, isDark } = useTheme();
  const { user } = useAuth();
  // Only for the scheduler's failures. A shipper who pressed Schedule and got
  // silence reads it as a broken button.
  const { showToast, locations: addressBook } = useApp();
  // Cache key only — the gateway derives the real identity from the bearer
  // token (see useConversations). 'dev-shipper' used to be a real bypass
  // identity the gateway accepted; it no longer is, so don't imply otherwise.
  const userId = user?.id ?? 'anonymous';
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  /** MS3-335: last order-intake import result (created refs + exceptions). */
  const [orderIntakeResult, setOrderIntakeResult] = useState<OrderIntakeResponse | null>(null);
  /** MS3-334: bump sticky orders panel after intake creates ERP rows. */
  const [stickyOrdersRefresh, setStickyOrdersRefresh] = useState(0);
  const pendingErpDraftSeedsRef = useRef<ErpDraftLocationSeed[]>([])

  const [orderIntakeBusy, setOrderIntakeBusy] = useState(false);
  /** MS3-335 — drag-over state for the composer drop target. */
  const [orderIntakeDragging, setOrderIntakeDragging] = useState(false);
  const [orderIntakeOffer, setOrderIntakeOffer] = useState<string | null>(null);
  const orderIntakeFileRef = useRef<HTMLInputElement | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    answer, isStreaming, error, usage, conversationId: streamConversationId,
    pendingAction, selection, records, toolActivity, activityLabel, batchJob, draft, published, flow, flowFromThisTurn,
    actionError, actionExpired,
    sendMessage, chooseOption, confirmAction, cancelAction, cancel,
  } = useChat();

  /* What the assistant is doing right now, in one sentence. `activityLabel`
     arrives from the gateway already in the shipper's language; the tool keys
     are the fallback for a gateway that sends no label. Read by the header pill
     and by the working indicator in the thread, so the two can never disagree
     about what is happening. */
  const activityText = activityLabel ?? (toolActivity ? t(`vagonai.tool.${toolActivity}`) : null);
  const workingText = activityText ?? t('vagonai.status.responding');
  /* Re-rolled once per turn by `startTurn`, so the same stage gets a different
     colour next time round without anything random happening during a render. */
  const [toneSeed, setToneSeed] = useState(0);
  const workingTone = activityTone(workingText, toneSeed, isDark);
  /** Called wherever a turn begins — a tap, a confirmation or a typed message. */
  const rollActivityTone = () => setToneSeed(freshToneSeed());
  const navigate = useNavigate();
  const {
    conversations, loading: historyLoading, error: historyError, refetch: refetchConversations,
    remove: removeConversation, clearAll: clearAllHistory,
  } = useConversations(userId, lang);

  // Adopts the server-confirmed conversation id once a reply starts streaming
  // back — never guess/generate one client-side (see useChat.ts), otherwise
  // every message ends up in its own never-reused conversation row.
  useEffect(() => {
    if (streamConversationId) setConversationId(streamConversationId);
  }, [streamConversationId]);

  // Gate the screen on GET /me rather than discovering a rejected token
  // mid-stream. 'unauthorized' is chat-local (gateway rejected the token) and
  // must NOT by itself tear down the shipper session; 'unavailable' is
  // transient. Session clear only happens if main /auth/me also 401s.
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | GatewayAuthStatus>('checking');
  useEffect(() => {
    let cancelled = false;
    checkGatewayAuth(lang).then((status) => {
      if (!cancelled) setGatewayStatus(status);
    });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' });
  }, [thread, answer]);

  useEffect(() => () => cancel(), [cancel]);

  // Auto-grow the composer up to a cap, matching the design's textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyText = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    });
  };

  const send = (text: string, opts?: { run_kind?: 'one_shot' | 'batch'; forceTool?: { name: string; arguments?: Record<string, unknown> } }) => {
    const msg = (text || '').trim();
    if (!msg || isStreaming || loadingConversation) return;
    const sentAt = formatConversationTimestamp(new Date().toISOString());
    // Local cargo apply: while a create-shipment review card is open, parse
    // obvious qty/weight from the message and merge into the open draft so
    // Save-draft can enable without waiting for the model / prepare_shipment.
    const cargoHints = parseCargoHintsFromMessage(msg);
    // Omit conversationId entirely for a brand-new chat — the gateway mints
    // one and reports it via the `conversation` SSE event, which the effect
    // above adopts into state once the reply starts streaming.
    setThread((th) => {
      let next = [...th, { who: 'user' as const, text: msg, sentAt }, { who: 'ai' as const, pending: true, text: '', sentAt }];
      // Always bump empty/past stop schedules on the open create-shipment card.
      // Order ERP dates often arrive already in the past (Route stays NEEDED).
      let target = -1;
      for (let i = 0; i < next.length; i += 1) {
        if (next[i]?.flow?.flow === 'create_shipment') target = i;
      }
      if (target >= 0) {
        const existing = next[target]!.flow!;
        if (existing.flow === 'create_shipment' && existing.bundle?.draft) {
          const withCargo = cargoHints
            ? applyCargoHintsToSeedDraft(existing.bundle.draft, cargoHints)
            : existing.bundle.draft;
          const patchedDraft = ensureStopSchedules(withCargo);
          if (patchedDraft !== existing.bundle.draft) {
            next = next.map((m, i) =>
              i === target
                ? { ...m, flow: { ...existing, bundle: { ...existing.bundle, draft: patchedDraft } } }
                : m,
            );
          }
        }
      }
      return next;
    });
    rollActivityTone();
    setInput('');
    sendMessage(msg, { conversationId: conversationId ?? undefined, locale: lang, ...(opts?.run_kind ? { run_kind: opts.run_kind } : {}), ...(opts?.forceTool ? { forceTool: opts.forceTool } : {}) });
  };


  // MS3-349: pin the background job card onto the in-flight AI bubble so it
  // survives after the chat turn settles (pending → false).
  useEffect(() => {
    if (!batchJob?.job_id) return;
    setThread((th) => {
      const idx = [...th].map((m, i) => (m.who === 'ai' ? i : -1)).filter((i) => i >= 0).pop();
      if (idx == null || idx < 0) return th;
      if (th[idx]?.batchJobId === batchJob.job_id) return th;
      const next = [...th];
      next[idx] = { ...next[idx]!, batchJobId: batchJob.job_id };
      return next;
    });
  }, [batchJob?.job_id]);

  /** MS3-334 — sticky panel Create draft(s) → chat one-shot draft flow. */
  const handleStickyCreateDrafts = useCallback(
    async (orders: StickyOrderRow[]) => {
      if (!orders.length) return;
      const book = addressBook ?? [];
      const seeds: ErpDraftLocationSeed[] = [];
      for (const row of orders) {
        try {
          const detail = await erpOrdersService.getOrder(row.id);
          seeds.push(buildErpDraftSeedFromOrder(detail, book));
        } catch {
          seeds.push(
            buildErpDraftSeedFromOrder(
              {
                id: row.id,
                orderReference: row.orderReference,
                shipFrom: row.shipFrom,
                shipTo: row.shipTo,
                originLocationId: row.originLocationId ?? null,
                destLocationId: row.destLocationId ?? null,
              },
              book,
            ),
          );
        }
      }
      pendingErpDraftSeedsRef.current = seeds;
      if (import.meta.env.DEV) console.info(
        '[MS3-334] sticky Create draft seeds',
        seeds.map((s) => ({
          ref: s.orderReference,
          pickup: s.pickup?.locationId ?? null,
          delivery: s.delivery?.locationId ?? null,
        })),
      );
      const prompt =
        seeds.some((s) => s.pickup || s.delivery || s.shipFrom || s.shipTo)
          ? buildEnrichedDraftPrompt(seeds)
          : buildDraftPrompt(orders);
      send(prompt, buildStickyCreateForceTool(orders));
    },
    // send closes over latest conversation/stream flags
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, isStreaming, loadingConversation, lang, addressBook],
  );

  /**
   * Confirming runs the action and streams a wrap-up, so it behaves like a new
   * turn: the spent card is cleared and a fresh pending bubble receives the
   * reply. Clearing matters — the card is persisted onto the turn, so without
   * this it would linger after the action had already run.
   */
  const handleConfirmAction = async (id: string, action: PendingAction, intent: 'draft' | 'publish' = 'draft') => {
    const sentAt = formatConversationTimestamp(new Date().toISOString());
    setThread((th) => [
      ...retireCards(th, -1),
      { who: 'ai' as const, pending: true, text: '', sentAt },
    ]);
    rollActivityTone();

    // Measured here because only the browser can: MYVAGON refuses to publish a
    // load without a road distance and no gateway endpoint computes one. Sent on
    // a plain Save draft too — it costs nothing and it is the difference between
    // a draft that lands on the review page needing its route measured and one
    // that is ready to price.
    let routeSummary: { total_dist_km: number; total_drive_min?: number } | undefined;
    if (action.tool === 'create_shipment') {
      const points = stopCoordinates(action.arguments);
      if (canMeasureRoute(points)) {
        const measured = await measureRoute(points);
        if (measured.totalDistKm > 0) {
          routeSummary = { total_dist_km: measured.totalDistKm, total_drive_min: measured.totalDriveMin };
        }
      }
    }

    const outcome = await confirmAction(id, { locale: lang, routeSummary, intent });

    /*
      "Create shipment now" saves the draft and stops there. The gateway reports
      it wants to carry on rather than asking the next question on the confirm
      stream, because that stream narrates a completed action and has no tools of
      its own — so one ordinary turn is what starts the finishing interview. The
      draft is in the conversation's ledger by now, so the assistant picks it up
      and asks for the channel.

      Sent as the shipper's own message, like a follow-up button, so the
      transcript reads as something they said.
    */
    if (outcome.finishing) send(t('vagonai.finishing.prompt'));

  };

  /**
   * Tapping a card answers a lookup, which is a turn like any other: the same
   * stream, so a fresh pending bubble receives the reply. The answered list
   * stays exactly where it was asked, marked with the pick — an answered list
   * left visible but inert reads better in a transcript than one that vanishes.
   */
  const handleChooseOption = async (
    index: number,
    request: SelectionRequest,
    optionIds: string[],
    cargo?: CargoCapture,
  ) => {
    if (isStreaming || loadingConversation || optionIds.length === 0) return;
    const sentAt = formatConversationTimestamp(new Date().toISOString());
    // `request` is written back explicitly: mid-turn the list can still be
    // living in the hook rather than on the message, and it has to survive here.
    // Location picks also patch the open create_shipment seed immediately so
    // Save-as-draft can enable (locationId + default schedules) without waiting
    // for the gateway / model to refresh the bundle.
    setThread((th) => {
      let next = th.map((m, i) => (i === index ? { ...m, selection: request, selectionChoice: optionIds } : m));
      const slot = request.kind === 'location' ? inferLocationSlot(request) : null;
      const locationId = slot ? parseLocationOptionId(optionIds[0] ?? '') : null;
      if (slot && locationId) {
        const chosen = request.options?.find((o) => o.id === optionIds[0]);
        let flowTarget = -1;
        for (let i = 0; i < next.length; i += 1) {
          if (next[i]?.flow?.flow === 'create_shipment') flowTarget = i;
        }
        if (flowTarget >= 0) {
          const existing = next[flowTarget]!.flow!;
          if (existing.flow === 'create_shipment' && existing.bundle?.draft) {
            const patchedDraft = applyLocationChoiceToDraft(
              existing.bundle.draft,
              slot,
              locationId,
              chosen?.title ?? null,
            );
            next = next.map((m, i) =>
              i === flowTarget
                ? { ...m, flow: { ...existing, bundle: { ...existing.bundle, draft: patchedDraft } } }
                : m,
            );
          }
        }
      }

      // Product picks (+ cargo capture) patch the open create_shipment seed
      // immediately so qty/weight/productId land on the review card and Save
      // can enable without waiting for the gateway / model (MS3-332).
      
      // Product picks patch open create_shipment seed immediately. If none exists
      // yet (greenfield), synthesize a minimal flow so ShipmentReviewCard mounts
      // (MS3-332 QA: Save missing from DOM).
      if (request.kind === 'product') {
        const productId = parseProductOptionId(optionIds[0] ?? '');
        if (productId) {
          const chosen = request.options?.find((o) => o.id === optionIds[0]);
          let flowTarget = -1;
          for (let i = 0; i < next.length; i += 1) {
            if (next[i]?.flow?.flow === 'create_shipment') flowTarget = i;
          }
          if (flowTarget >= 0) {
            const existing = next[flowTarget]!.flow!;
            if (existing.flow === 'create_shipment' && existing.bundle?.draft) {
              const patchedDraft = applyProductChoiceToDraft(
                existing.bundle.draft,
                productId,
                chosen?.title ?? null,
                cargo,
              );
              next = next.map((m, i) =>
                i === flowTarget
                  ? {
                      ...m,
                      flow: {
                        ...existing,
                        bundle: { ...existing.bundle, draft: patchedDraft },
                      },
                    }
                  : m,
              );
            }
          } else {
            // Fold earlier location SelectionCard picks (and address-book
            // name matches from the user prompt) into the synthesized draft so
            // greenfield Save is not stuck on empty stops (MS3-332).
            const priorLocations: { slot: "pickup" | "delivery"; locationId: string; locationName?: string | null }[] = [];
            const seenSlots = new Set<string>();
            for (const msg of next) {
              if (msg.selection?.kind !== "location" || !msg.selectionChoice?.[0]) continue;
              const slot = inferLocationSlot(msg.selection);
              const locationId = parseLocationOptionId(msg.selectionChoice[0] ?? "");
              if (!slot || !locationId || seenSlots.has(slot)) continue;
              const locOpt = msg.selection.options?.find((o) => o.id === msg.selectionChoice![0]);
              priorLocations.push({ slot, locationId, locationName: locOpt?.title ?? null });
              seenSlots.add(slot);
            }
            const haystack = next
              .filter((m) => m.who === "user")
              .map((m) => (m.text || "").toLowerCase())
              .join("\n");
            const catalogLocations = (addressBook ?? []).map((l) => ({
              id: String(l.id),
              name: l.name,
              city: l.city || null,
              country: null as string | null,
              role: (l.role === "pickup" || l.role === "delivery" || l.role === "both" ? l.role : null) as
                | "pickup"
                | "delivery"
                | "both"
                | null,
              lat: typeof l.lat === "number" ? l.lat : null,
              lng: typeof l.lng === "number" ? l.lng : null,
            }));
            const matchByHint = (slot: "pickup" | "delivery", hints: RegExp[]) => {
              if (seenSlots.has(slot)) return;
              const hit = catalogLocations.find((l) => {
                if (slot === "pickup" && l.role === "delivery") return false;
                if (slot === "delivery" && l.role === "pickup") return false;
                const blob = (l.name + " " + (l.city || "")).toLowerCase();
                return hints.some((hx) => hx.test(haystack) && hx.test(blob));
              });
              if (hit) {
                priorLocations.push({ slot, locationId: hit.id, locationName: hit.name });
                seenSlots.add(slot);
              }
            };
            matchByHint("pickup", [/test location greece/i, /greece/i]);
            matchByHint("delivery", [/\bwc1\b/i, /wc1/i]);
            const synthesized = synthesizeShipmentFlowFromProduct({
              request,
              productId,
              productName: chosen?.title ?? null,
              cargo,
              priorLocations,
              catalogLocations,
            });
            next = [
              ...next,
              {
                who: 'ai' as const,
                pending: false,
                text: '',
                sentAt,
                flow: synthesized,
              },
            ];
          }
        }
      }
      return [
        ...next,
        { who: 'ai' as const, pending: true, text: '', sentAt },
      ];
    });
    rollActivityTone();
    await chooseOption(request, optionIds, {
      conversationId: conversationId ?? undefined,
      locale: lang,
      ...(cargo ? { cargo } : {}),
    });
  };

  /** Cancelling never calls the model — just retire the card in place. */
  const handleCancelAction = async (index: number, id: string) => {
    // The cancelled turn says so; every other card retires with it.
    setThread((th) => retireCards(
      th.map((m, i) => (i === index ? { ...m, text: t('vagonai.confirm.cancelled') } : m)),
      -1,
    ));
    await cancelAction(id, lang);
  };

  const handleNewChat = () => {
    cancel();
    setConversationId(null);
    setThread([]);
    setInput('');
  };

  const handleSelectConversation = async (id: string) => {
    if (id === conversationId || loadingConversation) return;
    cancel();
    setLoadingConversation(true);
    try {
      const messages = await getConversationMessages(id, lang);
      setThread(
        messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            who: m.role === 'user' ? 'user' : 'ai',
            text: m.content,
            sentAt: formatConversationTimestamp(m.createdAt),
          })),
      );
      setConversationId(id);
      setInput('');
    } catch {
      refetchConversations();
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await removeConversation(id);
    } catch {
      // removeConversation already reverted local state and refetched on failure.
    }
    if (id === conversationId) handleNewChat();
  };

  const handleClearAllHistory = async () => {
    try {
      await clearAllHistory();
    } catch {
      // clearAllHistory already reverted local state on failure.
    }
    handleNewChat();
  };

  useEffect(() => {
    if (!isStreaming) return;
    setThread((th) => th.map((m) => (m.pending ? { ...m, text: answer } : m)));
  }, [answer, isStreaming]);



  useEffect(() => {
    if (isStreaming) return;
    setThread((th) => {
      const settled = th.map((m) => (m.pending
        ? (error
          ? { ...m, pending: false, isError: true, text: `${t('vagonai.live.error')} ${error}` }
          : {
            ...m,
            pending: false,
            // A confirmation the gateway no longer holds streams nothing back,
            // so the turn would settle as an empty bubble. Say plainly that it
            // has to be asked for again — and never that anything was saved.
            text: actionExpired ? t('vagonai.confirm.expired') : answer,
            usage,
            ...(pendingAction ? { action: pendingAction } : {}),
            ...(selection ? { selection } : {}),
            ...(records ? { records } : {}),
            // Only the turn the bundle actually arrived on. `flow` outlives its
            // turn on purpose, so attaching it unconditionally re-stamped a
            // stale form onto every later answer and the card walked down the
            // transcript with the conversation. See `flowFromThisTurn`.
            ...(flow && flowFromThisTurn ? { flow } : {}),
            ...(draft ? { draft } : {}),
            ...(published ? { published } : {}),
            ...(actionError ? { actionError } : {}),
          })
        : m));
      // The proposal that just settled supersedes any card already in the
      // transcript, whether it is the same id re-sent because the shipper kept
      // typing or a new id because they corrected a detail. A card list works
      // the other way round: it is left where it was asked — the newest one is
      // the live question and the rest go inert, so the thread still reads as a
      // conversation. Only an exact re-send of the live list is a duplicate.
      const live = resolveLiveCards(newestCardIndex(settled), newestSelectionIndex(settled));
      const pruned = retireCards(settled, live.action);
      // A second guided flow supersedes the first outright: two on screen are two
      // half-filled loads competing for one Publish button.
      const oneFlow = retireFlows(pruned, newestFlowIndex(pruned));
      return dedupeSelections(oneFlow, newestSelectionIndex(oneFlow));
    });
    if (!error && conversationId) refetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  /**
   * When chat answers refresh the shipment `flow_context`, push the new bundle
   * onto the open card's transcript message (same id) so ShipmentReviewCard's
   * merge effect can apply qty/weight without waiting for settle / remount.
   */
  useEffect(() => {
    if (!flow || flow.flow !== 'create_shipment') return;
    setThread((th) => {
      let target = -1;
      for (let i = 0; i < th.length; i += 1) {
        if (th[i]?.flow?.flow === 'create_shipment') target = i;
      }
      if (target < 0) return th;
      const existing = th[target]!.flow!;
      if (existing.id !== flow.id && existing.flow === 'create_shipment') {
        // Live hook kept the prior id on refresh; still patch this message.
      }
      let nextFlow = { ...flow, id: existing.id };
      // MS3-334: sticky Create draft — apply ERP location seeds + schedules
      // (same path as MS3-332) so Save can enable without waiting for the model.
      const seeds = pendingErpDraftSeedsRef.current;
      const seedDraft = nextFlow.bundle?.draft;
      if (seeds.length > 0 && seedDraft) {
        const seed = pickSeedForDraft(seeds, seedDraft);
        if (seed && (seed.pickup || seed.delivery)) {
          const patched = applyErpSeedToFlowDraft(seedDraft, seed);
          nextFlow = {
            ...nextFlow,
            bundle: { ...nextFlow.bundle!, draft: patched },
          };
          if (import.meta.env.DEV) console.info('[MS3-334] applied ERP seed to flow draft', {
            ref: seed.orderReference,
            pickup: seed.pickup?.locationId ?? null,
            delivery: seed.delivery?.locationId ?? null,
          });
        }
      }
      // Skip a no-op write when the bundle fingerprint has not changed.
      if (JSON.stringify(existing.bundle) === JSON.stringify(nextFlow.bundle)) return th;
      return th.map((m, i) => (i === target ? { ...m, flow: nextFlow } : m));
    });
  }, [flow]);

  /**
   * Sends the guided flow's finished load.
   *
   * One call, and it executes rather than proposing: the flow's preview card is
   * a full recap of a load the shipper built by tapping, and they pressed
   * Publish on it, so a confirmation card restating it would ask the same
   * question twice. The publish gate still runs server-side and still refuses.
   */
  const handleFlowSubmit = useCallback(async (
    flowDraft: ShipmentDraft,
    intent: 'save_draft' | 'publish',
    routeSummary?: { total_dist_km: number; total_drive_min?: number },
  ): Promise<FlowSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitShipmentDraft({
        conversationId, intent, draft: flowDraft, routeSummary, locale: lang,
      });
      if (!result.ok) return { ok: false, missing: result.missing, reason: result.reason };

      // The transcript records what happened, so scrolling back reads as a
      // conversation rather than as a card that changed shape. The flow's own
      // success card carries the link.
      refetchConversations();
      return {
        ok: true,
        unsupported: result.unsupported,
        done: { outcome: result.outcome, autoId: result.auto_id, url: result.url },
      };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : t('vagonai.live.error'), missing: [] };
    }
  }, [conversationId, lang, t, refetchConversations]);

  /**
   * Sends the guided add-product form.
   *
   * Executes, like the shipment submit above and for a stronger reason: nothing
   * on that form was authored by the model, so the form IS the confirmation.
   *
   * The catch is doing real work here rather than flattening every failure into
   * one string. A 502 from the gateway is the core API refusing the write - the
   * shipper already has this product, or the SKU code they typed is taken - and
   * its message is the sentence to show them. It is not a `missing` entry,
   * because the field is filled in; it just collides with a record the bundle
   * could not see.
   */
  const handleProductSubmit = useCallback(async (
    productDraft: ProductDraft,
  ): Promise<ProductSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitProductDraft({ conversationId, draft: productDraft, locale: lang });
      if (!result.ok) return { ok: false, missing: result.missing, reason: result.reason };

      refetchConversations();
      return {
        ok: true,
        done: {
          productId: result.product_id,
          name: result.name,
          skuNumber: result.sku_number,
          category: result.category,
          type: result.type,
          ...(result.inherited_message ? { inheritedMessage: result.inherited_message } : {}),
          ...(result.generated_sku_number ? { generatedSku: result.generated_sku_number } : {}),
        },
      };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : t('vagonai.live.error'), missing: [] };
    }
  }, [conversationId, lang, t, refetchConversations]);

  /**
   * Sends the guided add-address form.
   *
   * Executes, like the other two. A 502 is the core API refusing the write - a site
   * of that name already exists for that company, or the company is new and has no
   * VAT on file - and its message is the sentence to show.
   */
  const handleAddressSubmit = useCallback(async (
    locationDraft: Record<string, unknown>,
  ): Promise<AddressSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitLocationDraft({ conversationId, draft: locationDraft, locale: lang });
      if (!result.ok) return { ok: false, missing: result.missing, reason: result.reason };

      refetchConversations();
      return {
        ok: true,
        done: {
          locationId: result.location_id,
          name: result.name,
          company: result.company,
          city: result.city,
          usableFor: result.usable_for,
          ...(result.defaults_message ? { defaultsMessage: result.defaults_message } : {}),
        },
      };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : t('vagonai.live.error'), missing: [] };
    }
  }, [conversationId, lang, t, refetchConversations]);

  /**
   * Files the guided create-order form.
   *
   * Executes, like the other three submits, and for the product form's stronger
   * reason: nothing on that form was authored by the model, so the form IS the
   * confirmation.
   *
   * What this does NOT do is start a shipment. An order lands in the Orders
   * Master unplanned, and building a load from it is a separate request the
   * shipper makes when they are ready — which is the whole distinction this flow
   * was added to restore.
   *
   * The unmatched-product list is derived here rather than server-side because it
   * is a fact about the FORM: a line the shipper typed instead of picking has no
   * `product_id`, and the success card names those so they know a load built from
   * the order will need them added first.
   */
  const handleOrderSubmit = useCallback(async (
    orderDraft: Record<string, unknown>,
  ): Promise<OrderSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitOrderDraft({ conversationId, draft: orderDraft, locale: lang });
      if (!result.ok) return { ok: false, missing: result.missing, reason: result.reason };

      refetchConversations();
      return {
        ok: true,
        done: {
          orderId: result.order_id,
          reference: result.reference,
          customerName: result.customer_name,
          deliveryDate: result.delivery_date,
          lineCount: result.line_count,
          unmatchedProducts: result.lines
            .filter((line) => !line.product_id && line.product_name)
            .map((line) => line.product_name),
          orderUrl: result.order_url,
        },
      };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : t('vagonai.live.error'), missing: [] };
    }
  }, [conversationId, lang, t, refetchConversations]);

  /**
   * Opens the bulk scheduler for a load the shipper built by TALKING.
   *
   * The guided flow's Review card already had this: it holds a `ShipmentDraft`
   * and hands it straight over. The conversational path never assembles one —
   * the model proposes tool arguments and the shipper presses Confirm — so
   * "schedule copies of this load" existed in one half of the product and not
   * the other. That was the reported gap.
   *
   * The template is fetched from the DRAFT rather than read off the card in
   * front of us. That card is display-shaped by design (`vehicle_type_names`,
   * `partner_names`, `product_name`), and matching those names back to records
   * is how a batch posts real freight against the wrong product. The gateway
   * reads MYVAGON's own draft state, which carries an id for every stop, line
   * and carrier, plus the road distance a batch cannot be armed without.
   *
   * Failure is reported as a toast rather than swallowed: the shipper pressed a
   * button, so silence would read as a broken one.
   */
  const openScheduleForDraft = useCallback(async (draftId: number | string) => {
    try {
      const template = await fetchScheduleTemplate(draftId, lang);
      if (!template.ok) {
        showToast(`${t('vagonai.scheduledPost.scheduleUnavailable')}${template.reason}`, 'error');
        return;
      }
      /*
        Checked here rather than in the drawer, because the fix is not in the
        drawer. A template with no channel, no truck type or no price is refused
        once per load in the batch, and the shipper settles those by talking — so
        saying which one is missing beats five filled-in fields and a refusal.
      */
      const missing = schedulableIssues(template.draft);
      if (missing.length > 0) {
        showToast(`${t('vagonai.scheduledPost.scheduleUnavailable')}${missing[0]!.message}`, 'error');
        return;
      }
      setScheduleTemplate({
        draft: template.draft,
        ...(template.route_summary ? { routeSummary: template.route_summary } : {}),
      });
    } catch {
      showToast(t('vagonai.scheduledPost.armFailed'), 'error');
    }
  }, [lang, t, showToast]);

  /** The guided flow a turn opened, live while streaming and persisted after. */
  const flowOf = (m: ThreadMessage): FlowContextEvent | null => (
    (m.pending ? m.flow ?? (flowFromThisTurn ? flow : null) : m.flow) ?? null
  );

  /**
   * The action attached to a message: live from the hook while the turn is still
   * open, from the message itself once the settle effect has persisted it.
   */
  const cardOf = (m: ThreadMessage): PendingAction | null => (
    (m.pending ? m.action ?? pendingAction : m.action) ?? null
  );

  /** The same, for the card list a turn is offering. */
  const listOf = (m: ThreadMessage): SelectionRequest | null => (
    (m.pending ? m.selection ?? selection : m.selection) ?? null
  );

  /**
   * Index of the one message allowed to render a card.
   *
   * An unresolved action is re-sent on every later turn with the same id, and is
   * replaced by a new id if the shipper corrects a detail — so mid-turn the same
   * proposal can sit on an earlier bubble as well as this one, and a superseded
   * id stops being confirmable (it answers 409). Either way only the newest
   * proposal is live, so exactly one card shows: it appears to move down the
   * transcript instead of stacking up a second copy.
   */
  let newestAction = -1;
  for (let i = 0; i < thread.length; i += 1) if (cardOf(thread[i])) newestAction = i;

  /*
   * Index of the one list still tappable. Every earlier list stays on screen and
   * goes inert — including one the shipper answered, which keeps its pick.
   *
   * An unanswered list is a standing offer: typing instead of tapping does not
   * withdraw it, because the reply may well have nothing to do with the lookup.
   * What withdraws it is the gateway asking something newer.
   */
  let newestList = -1;
  for (let i = 0; i < thread.length; i += 1) {
    if (listOf(thread[i]) && !thread[i].selectionChoice) newestList = i;
  }

  // A picker and a Confirm button are two competing next actions for the same
  // decision, so at most one of them is live (see resolveLiveCards).
  const { action: liveCardIndex, selection: liveListIndex } = resolveLiveCards(newestAction, newestList);

  /** MS3-335 — paste/attach → Orders via /chat/order-intake (never shipment draft). */
  const runOrderIntake = useCallback(async (payload: { text?: string; file?: File }) => {
    setOrderIntakeBusy(true);
    setOrderIntakeOffer(null);
    try {
      const result = await submitOrderIntake({
        conversationId: conversationId ?? undefined,
        text: payload.text,
        file: payload.file,
        locale: lang,
      });
      if (result.conversationId && result.conversationId !== conversationId) {
        setConversationId(result.conversationId);
      }
      setOrderIntakeResult(result);
      if (result.created.length > 0) setStickyOrdersRefresh((n) => n + 1);
      refetchConversations();
      if (payload.text) setInput('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('vagonai.live.error'), 'error');
    } finally {
      setOrderIntakeBusy(false);
    }
  }, [conversationId, lang, t, refetchConversations, showToast]);

  const empty = thread.length === 0;
  const canSend = input.trim().length > 0;

  const submit = () => {
    if (!canSend || isStreaming || loadingConversation || orderIntakeBusy) return;
    const text = input;
    if (looksLikeOrderTable(text)) {
      setOrderIntakeOffer(text);
      return;
    }
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    send(text);
  };

  /**
   * The dashboard shortcut: Ctrl+D, or Cmd+D on a Mac.
   *
   * It sends a sentence rather than calling anything. That is the whole design —
   * the message goes through the ordinary turn, so the model still chooses the
   * tool, the gateway still applies its own rules, and the answer arrives as an
   * assistant reply with its metric cards attached, exactly as it would have if
   * the shipper had typed the question. A shortcut that reached past the
   * conversation to fetch and render numbers itself would be a second, parallel
   * dashboard to keep in step with this one.
   *
   * Sent in the shipper's own language, because it is recorded as their turn and
   * the transcript has to read like something they said.
   *
   * A half-typed draft survives it. `send` clears the composer as if the draft
   * had been the thing sent, so it is captured first and written back in the same
   * handler — React applies the later `setInput` last, and the shipper gets their
   * dashboard without losing the sentence they were in the middle of.
   */
  const askDashboard = () => {
    if (isStreaming || loadingConversation) return;
    const draft = input;
    send(t('vagonai.dashboardPrompt'));
    if (draft.trim()) setInput(draft);
  };

  return (
    <div className="vai">
      <HistorySidebar
        conversations={conversations}
        loading={historyLoading}
        error={historyError}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onClearAll={handleClearAllHistory}
      />
      {/*
        Mounted only while open, like the drawer below it: a fresh mount is what
        puts the shipper back on the batch LIST rather than inside whichever
        batch they were reading when they last closed it.
      */}
      {schedulerOpen && <ScheduledPostingDrawer onClose={() => setSchedulerOpen(false)} />}
      {/*
        Armed from a Review card, so it is mounted only while one has handed a
        draft over — a fresh mount per open is what lets its form seed itself in
        a `useState` initializer instead of an effect.
      */}
      {scheduleTemplate && (
        <ScheduleBulkDrawer
          template={scheduleTemplate}
          conversationId={conversationId}
          onClose={() => setScheduleTemplate(null)}
        />
      )}
      <div className="vai-main">
        {/* ── Header ── */}
        <header className="vai-header">
          <span className="vai-mark" aria-hidden="true">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0">
            <div className="vai-header-title">{t('vagonai.title')}</div>
            {/*
              The one live region on the page. The gateway's stage sentence and
              the working indicator in the thread say the same thing by
              construction, so announcing both would just talk over the reader;
              this is the copy that gets spoken, as a whole phrase, without
              moving focus. The streamed answer itself is deliberately not live
              — re-announcing a reply on every token is unusable.
            */}
            <div
              className={`vai-status${isStreaming ? ' vai-status--live' : ''}`}
              role="status"
              aria-atomic="true"
              style={{ color: isStreaming ? T.ac : STATUS_COLORS.ok.fg }}
            >
              <span className="vai-status-dot" />
              <span style={{ color: T.t2 }}>
                {activityText
                  ?? (isStreaming ? t('vagonai.status.responding') : t('vagonai.status.online'))}
              </span>
            </div>
          </div>
          {/*
            The only action in this bar. `margin-left: auto` rather than a
            justify change on the header, so the mark and title keep their
            existing left alignment.
          */}
          <button
            type="button"
            className="vai-header-action"
            onClick={() => setSchedulerOpen(true)}
            title={t('vagonai.scheduledPost.open')}
          >
            <CalendarClock size={13} />
            <span>{t('vagonai.scheduledPost.open')}</span>
          </button>
        </header>

                <StickyOrdersPanel
          T={T}
          disabled={isStreaming || loadingConversation}
          refreshToken={stickyOrdersRefresh}
          onCreateDrafts={handleStickyCreateDrafts}
        />
<div ref={bodyRef} className="vai-body">
          <div className="vai-column" aria-busy={isStreaming}>
            {/* ── Welcome ──
                Two tiers rather than one grid of ten. The four tool actions are
                the only prompts that change anything, so they carry the weight;
                the six product questions sit under them as chips. Rendering all
                ten as identical cards made the page's one real decision
                impossible to pick out. */}
            {empty && (
              <div className="vai-hero">
                {gatewayStatus !== 'checking' && gatewayStatus !== 'ready' && (
                  <p className="vai-gateway-warning">
                    {t(gatewayStatus === 'unauthorized'
                      ? 'vagonai.live.gatewayUnauthorized'
                      : 'vagonai.live.gatewayError')}
                  </p>
                )}
                <span className="vai-hero-mark" aria-hidden="true">
                  <Sparkles size={25} />
                </span>
                <h1 className="vai-hero-title">
                  {user?.first_name ? t('vagonai.empty.titleNamed', { name: user.first_name }) : t('vagonai.empty.title')}
                </h1>
                <p className="vai-hero-sub">{t('vagonai.empty.subtitle')}</p>

                <section className="vai-tier" aria-labelledby="vai-tier-actions">
                  <h2 className="vai-tier-label" id="vai-tier-actions">{t('vagonai.empty.actionsLabel')}</h2>
                  <div className="vai-actions">
                    {TOOL_ACTIONS.map(({ key, icon }) => (
                      <ActionCard
                        key={key}
                        icon={icon}
                        title={t(`vagonai.suggestions.${key}.title`)}
                        desc={t(`vagonai.suggestions.${key}.desc`)}
                        onClick={() => send(t(`vagonai.suggestions.${key}.desc`))}
                      />
                    ))}
                  </div>
                </section>

                <section className="vai-tier" aria-labelledby="vai-tier-questions">
                  <h2 className="vai-tier-label" id="vai-tier-questions">{t('vagonai.empty.questionsLabel')}</h2>
                  <div className="vai-chips">
                    {KNOWLEDGE_PROMPTS.map(({ key, icon }) => (
                      <PromptChip
                        key={key}
                        icon={icon}
                        title={t(`vagonai.suggestions.${key}.title`)}
                        desc={t(`vagonai.suggestions.${key}.desc`)}
                        onClick={() => send(t(`vagonai.suggestions.${key}.desc`))}
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ── Thread ── */}
            {thread.map((m, i) => (m.who === 'user' ? (
              <div key={i} className="vai-turn vai-turn--user">
                <div className="vai-bubble">{displayUserMessage(m.text, t)}</div>
              </div>
            ) : m.action && i !== liveCardIndex && !m.text && !m.actionError && !m.selection ? (
              /* A superseded card on a turn that held nothing else: the live card
                 is further down the thread and the settle effect drops this turn
                 moments later, so render nothing rather than an empty bubble. */
              null
            ) : (
              <div key={i} className="vai-turn">
                <span className="vai-mark vai-avatar" aria-hidden="true">
                  <Sparkles size={14} />
                </span>
                <div className="vai-answer">
                  {m.isError ? (
                    <p className="vai-error">{m.text}</p>
                  ) : i === liveCardIndex ? (
                    /* Paused for approval. `text` is normally empty here — the
                       model writes no prose before proposing — so the card is
                       the message, not a decoration beside one. */
                    <ConfirmActionCard
                      action={cardOf(m)!}
                      T={T}
                      onConfirm={() => handleConfirmAction(cardOf(m)!.id, cardOf(m)!)}
                      onCancel={() => handleCancelAction(i, cardOf(m)!.id)}
                      /* Only a draft can be carried on from; a publish card is
                         already the last step. */
                      onCreateNow={cardOf(m)!.tool === 'create_shipment'
                        ? () => handleConfirmAction(cardOf(m)!.id, cardOf(m)!, 'publish')
                        : undefined}
                      /* A stop with no map position cannot be routed through, and
                         a load with no route cannot be published. Better a greyed
                         button with a reason than a flow that dead-ends at the
                         last step. */
                      canCreateNow={canMeasureRoute(stopCoordinates(cardOf(m)!.arguments))}
                      /* Copies instead of one publish. Only on the publish card:
                         a batch is graded by the real publish gate, and by this
                         point the channel, the truck type, the carriers and the
                         price are all settled. The draft id comes off the card's
                         own arguments; the template itself is read from the
                         draft, never from the card. */
                      onSchedule={cardOf(m)!.tool === 'publish_shipment' && cardOf(m)!.arguments.draft_id
                        ? () => openScheduleForDraft(String(cardOf(m)!.arguments.draft_id))
                        : undefined}
                    />
                  ) : m.pending && !m.text ? (
                    /* The working indicator. The truck alone says only that
                       something is happening, never what — and the slowest
                       part of a turn is the silence before the first token,
                       which is exactly where a shipper decides it has hung. So
                       the gateway's own sentence sits beside them, in a colour
                       that changes as the stages do. */
                    <div className="vai-working" style={{ color: workingTone }} aria-hidden="true">
                      {/* A truck on a moving road rather than three dots.
                          The rig itself holds still — the road scrolls under
                          it, the wheels turn with the road, and the draught
                          lines trail off behind — so the whole figure stays
                          put in the line of text instead of wandering across
                          it. Everything is drawn in currentColor, which is the
                          stage tone above, so the loader recolours with the
                          sentence beside it. */}
                      <span className="vai-working-truck">
                        <svg
                          viewBox="0 0 44 24"
                          width="44"
                          height="24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {/* One long dashed line, shifted by exactly one dash
                              period so the loop has no seam. */}
                          <g className="vai-truck-road">
                            <path d="M-44 20.5H88" strokeDasharray="5 7" />
                          </g>
                          <g className="vai-truck-draught">
                            <path d="M1 8.5H6" />
                            <path d="M2.5 13H7" />
                          </g>
                          <g className="vai-truck-rig">
                            <rect x="10" y="4" width="19" height="11.5" rx="2" />
                            <path d="M29 7.5h5l4 4v4h-9z" />
                            <path d="M30.5 9.5h3.2l2 2.2h-5.2z" strokeWidth="1.2" />
                          </g>
                          <g className="vai-truck-wheel">
                            <circle cx="15.5" cy="18" r="2.4" />
                            <path d="M15.5 18v-1.7" strokeWidth="1.2" />
                          </g>
                          <g className="vai-truck-wheel">
                            <circle cx="34" cy="18" r="2.4" />
                            <path d="M34 18v-1.7" strokeWidth="1.2" />
                          </g>
                        </svg>
                      </span>
                      <span className="vai-working-text">{workingText}</span>
                    </div>
                  ) : (
                    <>
                      {/* The gateway's own line for an action that failed —
                          already localized, and shown as-is because a plan
                          limit arrives here as the upgrade prompt itself. */}
                      {(m.actionError ?? (m.pending ? actionError : null)) && (
                        <p className="vai-error">
                          <AlertTriangle size={14} aria-hidden="true" />
                          <span>{m.actionError ?? actionError}</span>
                        </p>
                      )}
                      <MarkdownAnswer text={m.text} streaming={!!m.pending} T={T} t={t} />
                      {(m.batchJobId || (m.pending && batchJob?.job_id)) ? (
                        <BatchDraftJobCard
                          jobId={m.batchJobId || batchJob!.job_id}
                          locale={lang}
                          T={T}
                        />
                      ) : null}
                      {/* A lookup offered as cards. Anchored to the turn that
                          asked, and an offer rather than a gate — the composer
                          below stays live whether or not one is on screen. */}
                      {listOf(m) && (
                        <SelectionCards
                          /* Keyed by request id so a second list in the same
                             message slot gets a FRESH component. `expandedGroups`
                             is seeded at mount only, so a reused instance would
                             hold the previous request's group names and collapse
                             every section of the new one. */
                          key={listOf(m)!.id}
                          request={listOf(m)!}
                          T={T}
                          onChoose={(optionIds, cargo) => handleChooseOption(i, listOf(m)!, optionIds, cargo)}
                          disabled={isStreaming || loadingConversation || i !== liveListIndex}
                          chosenIds={m.selectionChoice}
                        />
                      )}
                      {/* The records a lookup found. Not a decision — nothing
                          is pending on it, so it never goes inert and never
                          needs retiring. */}
                      {(m.records ?? (m.pending ? records : null)) && (
                        <ResultCards
                          set={(m.records ?? records)!}
                          T={T}
                          /*
                            Left live on older turns on purpose, unlike a picker.
                            A picker is a decision that gets spent; "offer one of
                            my loads to truck 5512" is a request that stays valid
                            however far up the transcript the card has scrolled.
                            `send` already no-ops while a turn is streaming.
                          */
                          onFollowUp={send}
                        />
                      )}
                      {/* The guided flows. Each runs entirely on the client off
                          the bundle its turn delivered — no /chat call happens
                          while one is open.

                          Switched on `flow`, not rendered blind. The bundles are
                          different shapes, so handing a product bundle to the
                          shipment wizard reads `bundle.locations` off something
                          that has none — which is a blank-screen crash, not a
                          degraded card. A flow this build does not know is dropped
                          by `useChat` before it ever reaches here. */}
                      {flowOf(m)?.flow === 'create_shipment' && (
                        <ShipmentReviewCard
                          /* Keyed by the bundle's own id: the draft lives in this
                             component's state, so a second prepared load must
                             remount rather than inherit the first one's edits. */
                          key={flowOf(m)!.id}
                          event={flowOf(m) as Extract<FlowContextEvent, { flow: 'create_shipment' }>}
                          conversationId={conversationId}
                          T={T}
                          onSubmit={handleFlowSubmit}
                          /* The sub-forms a gap can open: a product the order
                             names that is not in the Product Master, or a site it
                             recorded as free text. Both save through the same
                             endpoints the standalone flows use. */
                          onSubmitProduct={handleProductSubmit}
                          onSubmitAddress={handleAddressSubmit}
                          /* Arms a bulk batch from this load instead of sending
                             it once. The card measures the route first, so the
                             drawer opens with a distance already in hand. */
                          onSchedule={(draft, routeSummary) =>
                            setScheduleTemplate({ draft, routeSummary })}
                          disabled={isStreaming || loadingConversation}
                        />
                      )}
                      {flowOf(m)?.flow === 'create_product' && (
                        <CreateProductForm
                          key={flowOf(m)!.id}
                          event={flowOf(m) as Extract<FlowContextEvent, { flow: 'create_product' }>}
                          T={T}
                          onSubmit={handleProductSubmit}
                          disabled={isStreaming || loadingConversation}
                        />
                      )}
                      {flowOf(m)?.flow === 'create_location' && (
                        <CreateAddressForm
                          key={flowOf(m)!.id}
                          event={flowOf(m) as Extract<FlowContextEvent, { flow: 'create_location' }>}
                          T={T}
                          onSubmit={handleAddressSubmit}
                          disabled={isStreaming || loadingConversation}
                        />
                      )}
                      {/* An ORDER in the Orders Master, not a load. It shares no
                          state with the shipment wizard above on purpose: an
                          order has no stops, no truck type, no channel and no
                          price, and merging the two is how "create order"
                          started opening the shipment flow in the first place. */}
                      {flowOf(m)?.flow === 'create_order' && (
                        <CreateOrderForm
                          key={flowOf(m)!.id}
                          event={flowOf(m) as Extract<FlowContextEvent, { flow: 'create_order' }>}
                          T={T}
                          onSubmit={handleOrderSubmit}
                          onCreateShipment={(orderId, reference) =>
                            send(
                              reference
                                ? `Create a shipment from order ${reference}.`
                                : `Create a shipment from order id ${orderId}.`,
                            )
                          }
                          disabled={isStreaming || loadingConversation}
                        />
                      )}
                      {(m.draft ?? (m.pending ? draft : null)) && (
                        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => navigate((m.draft ?? draft)!.review_url)}
                            className="vai-linkbtn vai-linkbtn--ghost"
                          >
                            <ExternalLink size={14} aria-hidden="true" />
                            {t('vagonai.draft.review', { id: (m.draft ?? draft)!.auto_id })}
                          </button>
                          {/*
                            The other half of the reported gap. A load built by
                            talking used to end here with one link and no way to
                            repeat it, while the same load built on cards had a
                            Schedule button on its Review step.

                            Offered on any saved draft, and the handler says what
                            is missing rather than opening a drawer that will be
                            refused — a draft with no channel or price is a
                            sentence back in the conversation, not five fields
                            and a rejection.
                          */}
                          <button
                            type="button"
                            onClick={() => openScheduleForDraft((m.draft ?? draft)!.draft_id)}
                            className="vai-linkbtn vai-linkbtn--ghost"
                          >
                            <CalendarClock size={14} aria-hidden="true" />
                            {t('vagonai.scheduledPost.scheduleAfter')}
                          </button>
                        </div>
                      )}
                      {/*
                        The load is on the market. A different destination from
                        the draft link above and deliberately so: that one opens a
                        wizard to finish, this one opens a live shipment to watch
                        the responses come in.
                      */}
                      {(m.published ?? (m.pending ? published : null)) && (
                        <button
                          type="button"
                          onClick={() => navigate((m.published ?? published)!.shipment_url)}
                          className="vai-linkbtn vai-linkbtn--solid"
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          {t('vagonai.published.open', { id: (m.published ?? published)!.auto_id })}
                        </button>
                      )}
                      {!m.pending && (
                        <div className="vai-tools">
                          <button type="button" onClick={() => copyText(m.text, i)} className="vai-tool">
                            {copiedIdx === i ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                            {copiedIdx === i ? t('vagonai.live.copied') : t('vagonai.live.copy')}
                          </button>
                          <button
                            type="button"
                            onClick={() => send(t('vagonai.regeneratePrompt'))}
                            disabled={isStreaming || loadingConversation}
                            className="vai-tool"
                          >
                            <RefreshCw size={14} aria-hidden="true" />
                            {t('vagonai.regenerate')}
                          </button>
                          <span className="vai-meta">
                            {m.sentAt}
                            {m.usage && (
                              <>
                                {' · '}
                                <span title={t('vagonai.live.usageTitle')} style={MONO}>
                                  {t('vagonai.live.usage', {
                                    total: m.usage.totalTokens,
                                    prompt: m.usage.promptTokens,
                                    completion: m.usage.completionTokens,
                                  })}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* ── Composer ── */}
        {orderIntakeResult ? (
          <div className="vai-column" style={{ paddingBottom: 12 }}>
            <OrderIntakeResultCard
              result={orderIntakeResult}
              T={T}
              onDismiss={() => setOrderIntakeResult(null)}
              onReviewAndCreate={(gaps) => {
                setOrderIntakeResult(null);
                send(buildReviewCreatePrompt(gaps));
              }}
            />
          </div>
        ) : null}
        {orderIntakeOffer ? (
          <div className="vai-column" style={{ paddingBottom: 8 }}>
            <div
              className="rounded-xl border px-3 py-2.5 text-[12.5px] flex flex-wrap items-center gap-2"
              style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
            >
              <span className="flex-1 min-w-[12rem]">
                That looks like an order table. Import into <strong>Orders</strong> (not a shipment draft)?
              </span>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold"
                style={{ background: T.t1, color: T.sf }}
                disabled={orderIntakeBusy}
                onClick={() => void runOrderIntake({ text: orderIntakeOffer })}
              >
                Import orders
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                style={{ border: `1px solid ${T.bd}`, color: T.t2 }}
                disabled={orderIntakeBusy}
                onClick={() => {
                  const text = orderIntakeOffer;
                  setOrderIntakeOffer(null);
                  if (textareaRef.current) textareaRef.current.style.height = 'auto';
                  send(text);
                }}
              >
                Send as chat
              </button>
              <button
                type="button"
                className="rounded-lg px-2 py-1.5 text-[12px]"
                style={{ color: T.t2 }}
                onClick={() => setOrderIntakeOffer(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="vai-composer-wrap">
          <div className="vai-column">
            {/* The textarea carries no outline of its own, so the shell takes
                the focus state via :focus-within — the ring lands around the
                control the shipper sees rather than being removed outright. */}
            <div
              className={`vai-composer${orderIntakeDragging ? ' vai-composer--dropping' : ''}`}
              /*
                MS3-335 — the ticket says "drop", and until now only the paperclip
                worked. dragOver must preventDefault or the browser navigates away
                to the file instead of letting the page have it.
              */
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('Files')) return;
                e.preventDefault();
                setOrderIntakeDragging(true);
              }}
              onDragLeave={(e) => {
                // Fires when crossing onto a child too, so ignore anything still inside.
                if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                setOrderIntakeDragging(false);
              }}
              onDrop={(e) => {
                if (!e.dataTransfer.types.includes('Files')) return;
                e.preventDefault();
                setOrderIntakeDragging(false);
                if (isStreaming || loadingConversation || orderIntakeBusy) return;
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                // Refuse here rather than letting the gateway answer with a
                // deferral: PDF/image intake is not built, and a file that
                // uploads and then fails reads as a bug.
                if (!isOrderIntakeFile(file)) {
                  showToast(t('vagonai.intake.unsupportedFile'), 'error');
                  return;
                }
                void runOrderIntake({ file });
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  const next = e.target.value;
                  setInput(next);
                  if (orderIntakeOffer && !looksLikeOrderTable(next)) setOrderIntakeOffer(null);
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted && looksLikeOrderTable(pasted)) {
                    window.setTimeout(() => setOrderIntakeOffer(pasted), 0);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                  // Ctrl+D / Cmd+D. preventDefault is what stops the browser
                  // opening its own bookmark dialog over the chat, so it runs
                  // before anything else and whether or not the send goes ahead.
                  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
                    e.preventDefault();
                    askDashboard();
                  }
                }}
                rows={1}
                placeholder={t('vagonai.composerPh')}
                aria-label={t('vagonai.composerPh')}
                className="vai-input"
              />
              <div className="vai-composer-row">
                <input
                  ref={orderIntakeFileRef}
                  type="file"
                  accept={ORDER_INTAKE_ACCEPT}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void runOrderIntake({ file });
                  }}
                />
                <button
                  type="button"
                  className="vai-attach"
                  title={t('vagonai.page.attachIntake', 'Attach Excel/CSV for order intake')}
                  aria-label={t('vagonai.page.attachIntake', 'Attach Excel/CSV for order intake')}
                  disabled={isStreaming || loadingConversation || orderIntakeBusy}
                  onClick={() => orderIntakeFileRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${T.bd}`,
                    background: T.sf,
                    color: T.t2,
                    marginRight: 8,
                  }}
                >
                  <Paperclip size={14} aria-hidden="true" />
                </button>
                <span className="vai-hint">
                  {t('vagonai.shortcutHint')}
                  {/*
                    The dashboard shortcut, drawn as a key rather than written
                    into the sentence. This was hidden below 900px at first,
                    which put it out of sight on exactly the window width a
                    laptop user has when the browser is not maximised - so the
                    one clause on this line advertising something the shipper
                    could not otherwise discover was the one clause they never
                    saw. It now wraps instead of disappearing.
                  */}
                  <span className="vai-hint-shortcut">
                    <kbd className="vai-kbd">{dashboardShortcutLabel}</kbd>
                    {t('vagonai.shortcutDashboard')}
                  </span>
                </span>
                {isStreaming ? (
                  <button type="button" onClick={cancel} className="vai-stop">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" /></svg>
                    {t('vagonai.stop')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSend || loadingConversation || orderIntakeBusy}
                    aria-label={t('vagonai.send')}
                    className="vai-send"
                  >
                    <Send size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <p className="vai-disclaimer">{t('vagonai.disclaimer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

