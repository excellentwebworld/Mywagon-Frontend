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
  Handshake, Clock, ListChecks, Ban, Palette, Truck, CalendarClock, Package,
  ClipboardList, ClipboardCheck, Paperclip, Lock, MessageSquarePlus, FileSpreadsheet, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { UnfinishedLoadBanner } from './intake/UnfinishedLoadBanner';
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
import { measureStickyLanes } from './stickyRouteMeasure';
import SelectionCards from './SelectionCards';
import ResultCards from './ResultCards';
import ShipmentReviewCard, { type FlowSubmitResult } from './ShipmentReviewCard';
import CreateProductForm, { type ProductSubmitResult } from './CreateProductForm';
import CreateAddressForm, { type AddressSubmitResult } from './CreateAddressForm';
import CreateOrderForm, { type OrderSubmitResult } from './CreateOrderForm';
import { draftSubmitErrorReason, isUnknownOutcome, submitShipmentDraft } from './api/shipmentDraftService';
import { submitProductDraft } from './api/productDraftService';
import { submitLocationDraft } from './api/locationDraftService';
import { submitOrderDraft } from './api/orderDraftService';
import { isAbortOrTimeout, messageForErrorKind, timeoutMessage, userFacingError } from '../../utils/userFacingError';
import {
  getConversationOrderImport,
  ORDER_IMPORT_MAX_BYTES,
  previewOrderImport,
  runDirectOrderImport,
  uploadOrderImport,
  type ImportView,
} from './api/orderImportService';
import { ordersToWrite } from './erpImport';
import OrderImportReviewCard from './OrderImportReviewCard';
import ErpImportCard from './ErpImportCard';
import StickyOrdersPanel, {
  buildDraftPrompt,
  buildStickyCreateForceTool,
  buildStickyOrderStatusForceTool,
  type StickyOrderRow,
} from './StickyOrdersPanel';
import { browserStorage, readPanelOpen, writePanelOpen, type StickyFocusRequest } from './stickyPanelState';
import type { CompletedErpOrder } from '../../api/services/erpOrderCompletionsService';
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
import { isImportIntent, MAX_STAGED_FILES, stageFiles } from './composerFiles';
import { ImportOfferMessage } from './ImportOfferMessage';
import { IntakeWidgetHost } from './intake/IntakeWidgetHost'; // WP3a
import { useIntakeFlow } from './intake/useIntakeFlow';
import { appendIntakeEvents, isLiveIntake } from './intake/intakeThread';
import type { IntakeApi } from './intake/intakeService';
import { canMeasureRouteFor, measureIntakeRoute, measureIntakeRouteInfo } from './intake/intakeRoute'; // WP3a-pkg1 (+ WP3b-corr: the estimate flag)
import { handoffAfterImport, handoffTarget, PICK_ORDERS_MAX, type UploadHandoff } from './intake/intakeUpload'; // WP3a-pkg2
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
  freezeImportCard, newestCardIndex, newestSelectionIndex, newestFlowIndex, resolveLiveCards, retireCards, retireFlows, dedupeSelections,
  type ThreadImportCard,
  type ThreadMessage,
} from './threadCards';
import { forgetCards, isRememberedKind, rememberCard, replyOrdinal, restoreCards } from './cardMemory';
import '../../styles/vagonai.css';
import '../../styles/scheduled-post.css';
import { ScheduledPostingDrawer } from './ScheduledPostingDrawer';
import { ScheduleBulkDrawer, type ScheduleTemplate } from './ScheduleBulkDrawer';
import { toUpperGreek } from '../../utils/greekUppercase';

/** Token counts are a debugging aid, not something a shipper should read (QA 2026-10-08). */
// Opt-in only. It used to follow `import.meta.env.DEV` as well, and QA's
// environment runs a dev build, so every shipper-facing answer carried token
// counts (QA 2026-10-10). Set VITE_SHOW_TOKEN_USAGE=true to see them locally.
const SHOW_TOKEN_USAGE = import.meta.env.VITE_SHOW_TOKEN_USAGE === 'true';

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
/** "48 KB", "1.2 MB" - the size shown beside an attached file. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  /** The open chat, for async work that must not land in a chat the shipper has left. */
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);
  /**
   * The thread on screen was opened from the history panel. A past chat is for
   * reading only: the gateway would resume it with context the shipper can no
   * longer see (cards and drafts are not restored), so every way of starting a
   * turn is shut until they start a new chat.
   */
  const [viewingHistory, setViewingHistory] = useState(false);
  /**
   * Each chat opened in this session, as it last stood on screen - cards,
   * pickers and the review card included. The gateway's history is text only,
   * so a chat reopened from it came back as bare questions with nothing under
   * them, which read as the conversation having emptied (QA 2026-10-06). A chat
   * found here is restored whole and stays live, since nothing the shipper saw
   * is missing; one that is not falls back to the read-only text transcript.
   */
  const threadSnapshotsRef = useRef(new Map<string, ThreadMessage[]>());
  /** What the last import ran on, so the legacy card's "Try again" re-sends it without asking for the file again. */
  const lastOrderImportRef = useRef<{ text?: string; file?: File; note?: string } | null>(null);
  /**
   * The latest state of each import card in the thread, by card key. Kept beside
   * the thread rather than in it: the thread scrolls to the bottom whenever it
   * changes, and every mapping click would otherwise move the shipper's view.
   */
  const [importViews, setImportViews] = useState<Record<string, ImportView>>({});
  /** A file attached in the composer, waiting for the shipper's note and Enter (or Send). */
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  /** The card whose "Choose another file" was pressed: frozen as replaced once the new file is sent (MS3-365). */
  const replaceCardRef = useRef<string | null>(null);
  /** Files sent with a message that did not ask for an import, kept until the shipper answers the offer (MS3-366). */
  const [offerFiles, setOfferFiles] = useState<Record<string, File[]>>({});
  /** MS3-334: bump sticky orders panel after an import writes ERP rows. */
  const [stickyOrdersRefresh, setStickyOrdersRefresh] = useState(0);
  // MS3-364: the Orders panel is a right-hand drawer, opened from the header. It
  // sits beside the chat rather than above it, so nothing collapses it on a tap
  // any more; the shipper opens and closes it, and the browser remembers which.
  const [ordersOpen, setOrdersOpen] = useState(() => readPanelOpen(browserStorage()));
  useEffect(() => writePanelOpen(browserStorage(), ordersOpen), [ordersOpen]);
  const [ordersCount, setOrdersCount] = useState({ plannable: 0, hasMore: false, overdue: 0 });
  /** After a row action the chat holds the next step; on a narrow screen the drawer covers it, so it closes. */
  const closeOrdersIfOverlaying = useCallback(() => {
    if (window.matchMedia?.('(max-width: 1024px)').matches) setOrdersOpen(false);
  }, []);
  // "Plan these orders" on a finished import: the panel opens on them, selected.
  const [stickyOrdersFocus, setStickyOrdersFocus] = useState<StickyFocusRequest | null>(null);
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
    answer, isStreaming, error, errorRetryable, errorKind, usage, conversationId: streamConversationId,
    pendingAction, selection, records, toolActivity, activityLabel, batchJob, draft, published, flow, flowFromThisTurn,
    actionError, actionExpired,
    intakeEvents, // WP3a
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
    conversations, hiddenCount: hiddenHistoryCount, loading: historyLoading, error: historyError,
    refetch: refetchConversations, upsert: upsertConversation, remove: removeConversation, clearAll: clearAllHistory,
  } = useConversations(userId, lang);
  /** The opening message of a brand-new chat, to title its sidebar row before the gateway lists it. */
  const newChatTitleRef = useRef<string | null>(null);

  // Adopts the server-confirmed conversation id once a reply starts streaming
  // back — never guess/generate one client-side (see useChat.ts), otherwise
  // every message ends up in its own never-reused conversation row.
  //
  // The sidebar row goes in at the same moment rather than after the turn
  // settles: the gateway writes the conversation only after the stream closes,
  // so the settle refetch could race it and a new chat - the bulk-draft one
  // especially - showed late or not at all (QA 2026-10-08).
  useEffect(() => {
    if (!streamConversationId) return;
    setConversationId(streamConversationId);
    if (newChatTitleRef.current !== null) {
      upsertConversation(streamConversationId, newChatTitleRef.current || null);
      newChatTitleRef.current = null;
    }
  }, [streamConversationId, upsertConversation]);

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
    // Follow the conversation down - but the welcome screen reads from the top.
    // Scrolled to the bottom with the Orders panel open above it, its hero went
    // out of view and the prompt chips sat half-cut under the panel, which read
    // as the panel overlapping them (QA 2026-10-06).
    bodyRef.current?.scrollTo({ top: thread.length === 0 ? 0 : 1e6, behavior: thread.length === 0 ? 'auto' : 'smooth' });
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

  type SendOpts = {
    run_kind?: 'one_shot' | 'batch';
    forceTool?: { name: string; arguments?: Record<string, unknown> };
    /** The shipper's bubble is already in the thread - an import note, shown with its file. */
    hideUserBubble?: boolean;
    /** A chat the gateway has just opened, before `conversationId` state catches up. */
    conversationId?: string;
  };
  /** The last message sent, so an errored turn's Retry can send it again unchanged. */
  const lastSendRef = useRef<{ text: string; opts?: SendOpts } | null>(null);

  const send = (text: string, opts?: SendOpts) => {
    const msg = (text || '').trim();
    if (!msg || isStreaming || loadingConversation || viewingHistory) return;
    lastSendRef.current = { text: msg, ...(opts ? { opts } : {}) };
    const sentAt = formatConversationTimestamp(new Date().toISOString());
    // Local cargo apply: while a create-shipment review card is open, parse
    // obvious qty/weight from the message and merge into the open draft so
    // Save-draft can enable without waiting for the model / prepare_shipment.
    const cargoHints = parseCargoHintsFromMessage(msg);
    // Omit conversationId entirely for a brand-new chat — the gateway mints
    // one and reports it via the `conversation` SSE event, which the effect
    // above adopts into state once the reply starts streaming.
    setThread((th) => {
      let next: ThreadMessage[] = [
        ...th,
        ...(opts?.hideUserBubble ? [] : [{ who: 'user' as const, text: msg, sentAt }]),
        { who: 'ai' as const, pending: true, text: '', sentAt },
      ];
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
    // Titled the way the gateway titles it: the sticky panel's routing marker
    // off, whitespace collapsed, cut at 60.
    const chatId = opts?.conversationId ?? conversationId;
    if (!chatId) {
      const title = msg.replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ').trim();
      newChatTitleRef.current = title.length > 60 ? `${title.slice(0, 60)}…` : title;
    }
    sendMessage(msg, { conversationId: chatId ?? undefined, locale: lang, ...(opts?.run_kind ? { run_kind: opts.run_kind } : {}), ...(opts?.forceTool ? { forceTool: opts.forceTool } : {}) });
  };

  /** The newest `send`, for the import flow, which calls it after an await. */
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  // WP3a — Create Shipment intake: the widgets' actions → the intake REST routes (CONTRACT.md §6, R1–R7).
  // `previewApi` is set only by the DEV-only fixture preview (?intakePreview=…); a production bundle never loads it.
  const [previewApi, setPreviewApi] = useState<IntakeApi | undefined>(undefined);
  // WP3a-pkg2 - upload hand-off (CONTRACT.md 5.1): "Yes, upload the file" opens the existing import flow; when it finishes the
  // created order ids go back to the load as `pick_orders`. `intakeLatest` is read by callbacks the import card keeps.
  const intakeHandoffRef = useRef<UploadHandoff | null>(null);
  const intakeLatest = useRef<{ thread: ThreadMessage[]; answer: ReturnType<typeof useIntakeFlow>['actions']['answer'] } | null>(null);
  const intake = useIntakeFlow({
    thread, setThread, conversationId, lang,
    pageBusy: isStreaming || loadingConversation || viewingHistory,
    send: (text) => sendRef.current(text),
    onOpenUrl: (url) => navigate(url),
    unavailableText: `${t('vagonai.shipment.intake.error.unavailable')} ${t('vagonai.shipment.intake.error.unavailableFix')}`,
    routeFailedText: t('vagonai.shipment.intake.summary.routeNeeded'),
    measureRouteInfo: (e) => measureIntakeRouteInfo(e, measureRoute), // WP3b-corr: says an estimate out loud (usedGoogle false)
    measureRoute: (e) => measureIntakeRoute(e, measureRoute), // §18.3: the browser measures, Publish waits for it
    canMeasure: canMeasureRouteFor,
    onUpload: (e) => {
      if (previewApi) return; // DEV fixture preview: no real import
      intakeHandoffRef.current = { intakeId: e.intakeId };
      orderIntakeFileRef.current?.click(); // inside the tap, so the browser allows the picker
    },
    api: previewApi,
  });
  intakeLatest.current = { thread, answer: intake.actions.answer };
  useEffect(() => {
    if (!import.meta.env.DEV || !new URLSearchParams(window.location.search).get('intakePreview')) return;
    void import('./intake/devPreview').then((m) => {
      const preview = m.devPreview();
      if (preview) { setPreviewApi(preview.api); setThread(preview.thread); }
    });
  }, []);

  /**
   * Retry on a turn that died on the wire (QA retest #3: the gateway went away
   * mid "Create draft"). The failed exchange is taken out of the thread and the
   * same message - forced tool included - goes again, so the transcript reads
   * as one attempt rather than a stack of failures.
   */
  const retryLastSend = () => {
    const last = lastSendRef.current;
    if (!last || isStreaming) return;
    setThread((th) => {
      const end = th.length - 1;
      if (end < 0 || !th[end]?.isError) return th;
      const cut = th[end - 1]?.who === 'user' ? end - 1 : end;
      return th.slice(0, cut);
    });
    send(last.text, last.opts);
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
      // Measured here because the sticky path has no confirm request to carry
      // a route: without it the draft saves with no distance ("Missing: Route").
      // Lanes whose stops have no coordinates are skipped and save as before.
      const routeSummaries = await measureStickyLanes(seeds, book);
      send(prompt, buildStickyCreateForceTool(orders, routeSummaries));
    },
    // send closes over latest conversation/stream flags
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, isStreaming, loadingConversation, viewingHistory, lang, addressBook],
  );

  /** A background batch-draft job finished: re-read the orders panel and the history list. */
  const onBatchJobFinished = useCallback(() => {
    setStickyOrdersRefresh((n) => n + 1);
    refetchConversations();
  }, [refetchConversations]);

  /** Orders toolbar Mark complete / Reopen → the confirmation card, no model turn. */
  const handleStickyMarkComplete = (order: StickyOrderRow) => {
    send(
      t('vagonai.stickyOrders.markCompletePrompt', { ref: order.orderReference }),
      buildStickyOrderStatusForceTool(order.id, 'complete'),
    );
  };

  const handleStickyReopen = (order: CompletedErpOrder) => {
    send(
      t('vagonai.stickyOrders.reopenPrompt', { ref: order.order_reference }),
      buildStickyOrderStatusForceTool(order.order_id, 'reopen'),
    );
  };

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

    // The toolbar reads the result from its sources, so refreshing is enough -
    // even after a refusal it only re-reads what is already true.
    if (action.tool === 'mark_order_complete' || action.tool === 'reopen_order') {
      setStickyOrdersRefresh((n) => n + 1);
    }

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
    // A product or site added mid-build: carry on with the load rather than
    // leaving the shipper to type "continue" (QA 2026-10-08).
    else if (outcome.continueBuild) send(t('vagonai.continueBuild.prompt', 'Continue creating the shipment.'));

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
              group: (l.group === "customer" ? "customer" : "my") as "my" | "customer",
              company: l.company || null,
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

  /**
   * Files the chat on screen under its id before the screen changes, so coming
   * back to it restores the cards too. Only a live chat: a read-only one is the
   * gateway's text transcript, which a reopen fetches again anyway. A turn still
   * streaming is left out - it is cancelled on the way out and never finished.
   */
  const rememberThread = () => {
    if (!conversationId || viewingHistory) return;
    const settled = thread
      .filter((m) => !m.pending)
      .map((m) => (m.orderImport?.engine === 'direct' && importViews[m.orderImport.key]
        ? { ...m, orderImport: { ...m.orderImport, view: importViews[m.orderImport.key]! } }
        : m));
    if (settled.length > 0) threadSnapshotsRef.current.set(conversationId, settled);
  };

  const handleNewChat = () => {
    rememberThread();
    cancel();
    setConversationId(null);
    setViewingHistory(false);
    setThread([]);
    setInput('');
    // Sticky-panel seeds belong to the chat they were made in (QA retest #2).
    pendingErpDraftSeedsRef.current = [];
    // The import cards are in the thread, so clearing it clears them; a file
    // staged in the composer belongs to the chat it was attached in.
    setOrderIntakeOffer(null);
    setStagedFiles([]);
  };

  /** The read-only banner's way out: a fresh chat, with the cursor already in the composer. */
  const leaveHistoryForNewChat = () => {
    handleNewChat();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  /**
   * Puts an "Order import" chat's import card back. That chat has no messages -
   * only the import - so opening it from the sidebar showed the empty welcome
   * screen (QA retest #2). Best effort: on any failure the chat opens as before.
   */
  const reopenConversationImport = async (id: string, opts: { makeLive: boolean }) => {
    try {
      const response = await getConversationOrderImport(id, lang);
      if (response.status !== 'ok' || !response.view) return;
      // The shipper may have moved on while this was in flight.
      if (activeConversationIdRef.current !== id) return;
      const view = response.view;
      // The import is the chat's first answer, so its card goes back at the top
      // of the thread - unless this browser's copy of the thread already has it.
      setThread((th) => {
        if (th.some((m) => m.orderImport?.engine === 'direct' && m.orderImport.view.importId === view.importId)) return th;
        const key = `import-${view.importId}`;
        // An import that ran comes back as the steps it was (MS3-365): the review,
        // frozen, the shipper's "Import N orders", then the result.
        if (view.status === 'done' && view.summary) {
          const count = view.summary.orders.created + (view.summary.orders.updated ?? 0);
          return [
            { who: 'ai', text: '', orderImport: { key: `${key}-review`, engine: 'direct', view, frozen: { reason: 'imported', at: '' } } },
            { who: 'user', text: t('vagonai.erpImport.import', { count }) },
            { who: 'ai', text: '', orderImport: { key, engine: 'direct', view } },
            ...th,
          ];
        }
        return [{ who: 'ai', text: '', orderImport: { key, engine: 'direct', view } }, ...th];
      });
      // An import-only chat is worked in, not read: the card's buttons must work.
      if (opts.makeLive) setViewingHistory(false);
    } catch {
      /* the chat stays as it opened */
    }
  };

  const handleSelectConversation = async (id: string) => {
    if (id === conversationId || loadingConversation) return;
    rememberThread();
    cancel();
    pendingErpDraftSeedsRef.current = [];
    const snapshot = threadSnapshotsRef.current.get(id);
    if (snapshot) {
      setThread(snapshot);
      setConversationId(id);
      setViewingHistory(false);
      setInput('');
      setOrderIntakeOffer(null);
      setStagedFiles([]);
      if (snapshot.length === 0) {
        activeConversationIdRef.current = id;
        void reopenConversationImport(id, { makeLive: true });
      }
      return;
    }
    setLoadingConversation(true);
    try {
      const messages = await getConversationMessages(id, lang);
      // A turn whose whole answer was a card is stored with no text; shown
      // bare it is an empty bubble in the middle of the transcript.
      const shown = messages.filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim() !== '');
      setThread(
        // The dashboard and report cards come back from this browser's memory:
        // the transcript is text only, and those replies are written to sit on
        // their card (QA retest #4). See cardMemory.ts.
        restoreCards(
          id,
          shown.map((m): ThreadMessage => ({
            who: m.role === 'user' ? 'user' : 'ai',
            text: m.content,
            sentAt: formatConversationTimestamp(m.createdAt),
          })),
        ),
      );
      setConversationId(id);
      setViewingHistory(true);
      setInput('');
      setOrderIntakeOffer(null);
      setStagedFiles([]);
      // The transcript is text only; a chat that held an import gets its card
      // back in the thread. One with no messages is the import (QA retest #2).
      activeConversationIdRef.current = id;
      void reopenConversationImport(id, { makeLive: shown.length === 0 });
      // MS3-407: a chat left in the middle of creating a shipment is worked in, not read: its load comes back live, at
      // the step it stopped at, and the chat is no longer read-only so the shipper can carry on.
      void intake.resume(id, () => activeConversationIdRef.current === id).then((restored) => {
        if (restored && activeConversationIdRef.current === id) setViewingHistory(false);
      });
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
    threadSnapshotsRef.current.delete(id);
    forgetCards(id);
  };

  const handleClearAllHistory = async () => {
    try {
      await clearAllHistory();
    } catch {
      // clearAllHistory already reverted local state on failure.
    }
    handleNewChat();
    threadSnapshotsRef.current.clear();
    forgetCards(null);
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
          ? {
            ...m,
            pending: false,
            isError: true,
            // A raw abort/timeout reads as the friendly sentence alone (QA retest #2),
            // and so does a lost connection or a stalled gateway (QA retest #3).
            // Worded HERE, from the kind, with the page's own translator: the
            // sentence useChat built could be in the wrong language (QA retest #4).
            text: errorKind
              ? messageForErrorKind(errorKind, t)
              : isAbortOrTimeout(error)
                ? timeoutMessage(t)
                : `${t('vagonai.live.error')} ${error}`,
            ...(errorRetryable && lastSendRef.current ? { retryable: true } : {}),
          }
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
            ...(intakeEvents.length > 0 ? { intake: { kind: 'event' as const, event: intakeEvents[0]! } } : {}), // WP3a
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
    // WP3a — an intake_error frame that carries the step to fall back to is two events: the note rode on this turn's bubble, the step follows.
    if (!error && intakeEvents.length > 1) setThread((th) => appendIntakeEvents(th, intakeEvents.slice(1)));
    // Kept for a reload: a dashboard/report reply means little without its card (QA retest #4).
    const cardChat = conversationId ?? streamConversationId;
    if (!error && cardChat && isRememberedKind(records)) {
      const view = thread.map((m) => (m.pending ? { ...m, text: answer } : m));
      const at = view.findIndex((m) => m.pending);
      if (at >= 0 && answer.trim()) rememberCard(cardChat, { ordinal: replyOrdinal(view, at), text: answer, records });
    }
    if (!error && conversationId) refetchConversations();
    // A draft saved from an order (the sticky panel's single Create draft)
    // plans that order, so the panel's unplanned count has to drop now rather
    // than on the next manual refresh (QA 2026-10-08). The batch path refreshes
    // when its job finishes - see BatchDraftJobCard's onFinished.
    if (!error && (draft || published)) setStickyOrdersRefresh((n) => n + 1);
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
    runId?: string,
  ): Promise<FlowSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitShipmentDraft({
        conversationId, intent, draft: flowDraft, routeSummary, locale: lang,
        ...(runId ? { runId } : {}),
      });
      // BL-17: the publish timed out and the gateway could not tell whether the
      // load went out. Not a success and not a refusal - the server's sentence
      // sends the shipper to Manage Shipments, and the card offers no republish.
      if (isUnknownOutcome(result)) {
        refetchConversations();
        setStickyOrdersRefresh((n) => n + 1);
        return {
          ok: false,
          missing: [],
          unknown:
            result.message?.trim() ||
            result.reason?.trim() ||
            t(
              'vagonai.review.outcomeUnknown',
              'We could not confirm whether this load was sent. Check Manage Shipments before trying again.',
            ),
        };
      }
      if (!result.ok) return { ok: false, missing: result.missing, reason: result.reason };

      // The transcript records what happened, so scrolling back reads as a
      // conversation rather than as a card that changed shape. The flow's own
      // success card carries the link.
      refetchConversations();
      // A load built from an order plans it - the orders panel's count follows.
      setStickyOrdersRefresh((n) => n + 1);
      return {
        ok: true,
        unsupported: result.unsupported,
        done: { outcome: result.outcome, autoId: result.auto_id, url: result.url },
      };
    } catch (err) {
      return { ok: false, reason: draftSubmitErrorReason(err, t), missing: [] };
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
    runId?: string,
  ): Promise<ProductSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitProductDraft({ conversationId, draft: productDraft, locale: lang, ...(runId ? { runId } : {}) });
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
      return { ok: false, reason: draftSubmitErrorReason(err, t), missing: [] };
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
    runId?: string,
  ): Promise<AddressSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitLocationDraft({ conversationId, draft: locationDraft, locale: lang, ...(runId ? { runId } : {}) });
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
      return { ok: false, reason: draftSubmitErrorReason(err, t), missing: [] };
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
    runId?: string,
  ): Promise<OrderSubmitResult> => {
    if (!conversationId) {
      return { ok: false, reason: t('vagonai.live.error'), missing: [] };
    }
    try {
      const result = await submitOrderDraft({ conversationId, draft: orderDraft, locale: lang, ...(runId ? { runId } : {}) });
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
      return { ok: false, reason: draftSubmitErrorReason(err, t), missing: [] };
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

  /** Puts a new state on one import message in the thread, found by its card key. */
  const patchImportMessage = useCallback((key: string, patch: (m: ThreadMessage) => ThreadMessage) => {
    setThread((th) => th.map((m) => (m.orderImport?.key === key ? patch(m) : m)));
  }, []);

  /**
   * A staged file (or an accepted pasted table) becomes the shipper's turn in
   * the thread, and the import card the assistant's answer to it - so the card
   * scrolls with the conversation and stays in it.
   *
   * The direct engine first (any ERP layout); `legacy` means the gateway still
   * runs the Laravel import, so the legacy review card takes over. Nothing is
   * written to orders until the card's own Import button.
   *
   * A note typed with the file goes to the assistant as the shipper's message
   * once the upload is in: the gateway records the import in the chat, and the
   * assistant can act on "the delivery date is in Req. Delivery" with its import
   * tools. The card reloads itself when that reply ends.
   *
   * Resolves to the chat the upload landed in (undefined when it was refused),
   * so several files can be sent into the same one.
   */
  const runOrderImport = useCallback(async (
    payload: { text?: string; file?: File; note?: string; bubblePosted?: boolean; conversationId?: string },
  ): Promise<string | undefined> => {
    if (payload.file && payload.file.size > ORDER_IMPORT_MAX_BYTES) {
      showToast(t('vagonai.orderImport.tooLarge'), 'error');
      return undefined;
    }
    lastOrderImportRef.current = payload;
    // An explicit chat wins: this render's `conversationId` is still null for the second file of a new chat.
    const intoChat = payload.conversationId ?? conversationId ?? undefined;
    const note = payload.note?.trim() ?? '';
    const rowCount = payload.text
      ? Math.max(0, payload.text.trim().split(/\r?\n/).filter((l) => l.trim()).length - 1)
      : null;
    const key = `import-${Date.now()}`;
    const sentAt = formatConversationTimestamp(new Date().toISOString());
    setOrderIntakeBusy(true);
    setOrderIntakeOffer(null);
    if (payload.text) setInput('');
    setThread((th) => [
      ...th,
      // Several files share one shipper message, posted by runOrderImports (MS3-366).
      ...(payload.bubblePosted
        ? []
        : [{
            who: 'user' as const,
            text: payload.file ? note : t('vagonai.orderImport.pastedTable', { count: rowCount ?? 0 }),
            sentAt,
            ...(payload.file ? { attachment: { name: payload.file.name, size: payload.file.size } } : {}),
          }]),
      {
        who: 'ai',
        text: '',
        sentAt,
        orderImport: {
          key,
          engine: 'legacy',
          state: { phase: 'analyzing', filename: payload.file?.name ?? t('vagonai.orderImport.title'), rowCount },
        },
      },
    ]);
    // A refused file is the assistant's answer too: said in the thread, where the shipper is looking.
    const fail = (message: string) =>
      patchImportMessage(key, (m) => ({ ...m, orderImport: undefined, isError: true, text: message }));
    try {
      const direct = await uploadOrderImport({
        conversationId: intoChat,
        text: payload.text,
        file: payload.file,
        locale: lang,
      });
      if (direct.status !== 'legacy') {
        if (direct.status !== 'ok' || !direct.view) {
          fail(direct.message ?? t('vagonai.erpImport.error'));
          return undefined;
        }
        const view = direct.view;
        // Only an accepted file opens a chat (QA retest #4).
        const chatId = direct.conversationId ?? intoChat;
        if (direct.conversationId && direct.conversationId !== conversationId) setConversationId(direct.conversationId);
        patchImportMessage(key, (m) => ({ ...m, orderImport: { key, engine: 'direct', view } }));
        refetchConversations();
        if (note) sendRef.current(note, { hideUserBubble: true, ...(chatId ? { conversationId: chatId } : {}) });
        return chatId;
      }
      const preview = await previewOrderImport({
        conversationId: intoChat,
        text: payload.text,
        file: payload.file,
        locale: lang,
      });
      if (preview.status !== 'rejected' && preview.conversationId && preview.conversationId !== conversationId) {
        setConversationId(preview.conversationId);
      }
      patchImportMessage(key, (m) => ({ ...m, orderImport: { key, engine: 'legacy', state: { phase: 'preview', preview } } }));
      refetchConversations();
      return preview.status === 'rejected' ? undefined : preview.conversationId ?? intoChat;
    } catch (err) {
      fail(userFacingError(err, t, t('vagonai.orderImport.error')));
      return undefined;
    } finally {
      setOrderIntakeBusy(false);
    }
  }, [conversationId, lang, t, refetchConversations, showToast, patchImportMessage]);

  /**
   * Several files, one shipper message, one review card each (MS3-366). The
   * shipper's words go to the assistant once, after the last upload, as they
   * always did for one file; `modelNote` is empty when the words were a chip's.
   */
  const runOrderImports = useCallback(async (files: File[], text: string, modelNote: string, bubblePosted = false) => {
    // The card whose "Choose another file" led here is history now (MS3-365).
    const replaced = replaceCardRef.current;
    replaceCardRef.current = null;
    if (replaced) {
      const at = formatConversationTimestamp(new Date().toISOString());
      setThread((th) => freezeImportCard(th, replaced, { reason: 'replaced', at }));
    }
    if (!bubblePosted) {
      const sentAt = formatConversationTimestamp(new Date().toISOString());
      setThread((th) => [...th, { who: 'user', text, sentAt, attachments: files.map((f) => ({ name: f.name, size: f.size })) }]);
    }
    // Every file goes into the chat the first accepted one opened, and the words are
    // sent once at the end - even when the last file is the one refused.
    let chat: string | undefined;
    for (const file of files) {
      chat = (await runOrderImport({ file, bubblePosted: true, conversationId: chat })) ?? chat;
    }
    const note = modelNote.trim();
    if (note && chat) sendRef.current(note, { hideUserBubble: true, conversationId: chat });
  }, [runOrderImport]);

  /** WP3a-pkg2: files picked while a load waits for its orders go straight to the import - no staging, no words to type. */
  const handleIntakeHandoffFiles = (picked: File[]): boolean => {
    if (!handoffTarget(thread, intakeHandoffRef.current)) {
      intakeHandoffRef.current = null;
      return false;
    }
    const { files, refused } = stageFiles([], picked, { accepts: isOrderIntakeFile, maxBytes: ORDER_IMPORT_MAX_BYTES });
    const reasons = new Set(refused.map((r) => r.reason));
    if (reasons.has('type')) showToast(t('vagonai.intake.unsupportedFile'), 'error');
    if (reasons.has('size')) showToast(t('vagonai.orderImport.tooLarge'), 'error');
    if (files.length > 0) void runOrderImports(files, t('vagonai.compose.importChipPrompt'), '');
    return true;
  };

  /** WP3a-pkg2: an import finished - if a load is waiting for orders, give it the ones that were created. */
  const handleIntakeImported = (summary: Parameters<typeof handoffAfterImport>[2]) => {
    const latest = intakeLatest.current;
    if (!latest) return;
    const res = handoffAfterImport(latest.thread, intakeHandoffRef.current, summary);
    if (res.kind === 'idle') return;
    if (res.kind === 'moved_on') { intakeHandoffRef.current = null; return; }
    if (res.kind === 'empty') { showToast(t('vagonai.shipment.intake.upload.none'), 'error'); return; }
    intakeHandoffRef.current = null;
    showToast(t('vagonai.shipment.intake.upload.imported', { count: res.used }), 'info');
    if (res.capped) showToast(t('vagonai.shipment.intake.upload.capped', { max: PICK_ORDERS_MAX }), 'info');
    latest.answer(res.event, res.wire);
  };

  /**
   * Files sent with words that do not ask for an import (MS3-366): the
   * assistant asks first. Summarising or answering questions about a file is a
   * later ticket, so nothing is guessed meanwhile.
   */
  const offerImport = useCallback((files: File[], note: string) => {
    const key = `offer-${Date.now()}`;
    const sentAt = formatConversationTimestamp(new Date().toISOString());
    const listed = files.map((f) => ({ name: f.name, size: f.size }));
    setOfferFiles((all) => ({ ...all, [key]: files }));
    setThread((th) => [
      ...th,
      { who: 'user', text: note, sentAt, attachments: listed },
      { who: 'ai', text: '', sentAt, importOffer: { key, files: listed, note, state: 'open' } },
    ]);
  }, []);

  const answerImportOffer = (key: string, accept: boolean) => {
    const files = offerFiles[key];
    setOfferFiles((all) => {
      const rest = { ...all };
      delete rest[key];
      return rest;
    });
    const note = thread.find((m) => m.importOffer?.key === key)?.importOffer?.note ?? '';
    setThread((th) => th.map((m) => (m.importOffer?.key === key
      ? { ...m, importOffer: { ...m.importOffer, state: accept && files ? 'accepted' : 'declined' } }
      : m)));
    if (accept && files) void runOrderImports(files, '', note, true);
  };

  /**
   * Attaching only stages files (MS3-366: several at once). The shipper says
   * what to do with them - "import these orders" - before anything is sent.
   * Type and size are checked now, not after they have typed their message.
   */
  const stageIncoming = (incoming: File[]) => {
    const { files, refused } = stageFiles(stagedFiles, incoming, { accepts: isOrderIntakeFile, maxBytes: ORDER_IMPORT_MAX_BYTES });
    const reasons = new Set(refused.map((r) => r.reason));
    if (reasons.has('type')) showToast(t('vagonai.intake.unsupportedFile'), 'error');
    if (reasons.has('size')) showToast(t('vagonai.orderImport.tooLarge'), 'error');
    if (reasons.has('count')) showToast(t('vagonai.compose.tooMany', { max: MAX_STAGED_FILES }), 'error');
    if (files.length === stagedFiles.length) return;
    setStagedFiles(files);
    setOrderIntakeOffer(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  /**
   * Import, as messages (MS3-365): the review freezes as it was confirmed, the
   * shipper's "Import 10 orders" follows it, and the run - progress, then the
   * summary - is a new message below. A run that does not start un-freezes the
   * review, so it can be tried again where it was.
   */
  const startImportFromCard = useCallback((card: ThreadImportCard, view: ImportView) => {
    if (card.engine !== 'direct') return;
    const at = formatConversationTimestamp(new Date().toISOString());
    const count = view.counts ? ordersToWrite(view.counts) : 0;
    const runKey = `${card.key}-run-${Date.now()}`;
    setThread((th) => [
      ...freezeImportCard(th, card.key, { reason: 'imported', at }, { view, force: true }),
      { who: 'user', text: t('vagonai.erpImport.import', { count }), sentAt: at },
      {
        who: 'ai',
        text: '',
        sentAt: at,
        orderImport: { key: runKey, engine: 'direct', view: { ...view, status: 'running', progress: { done: 0, total: view.counts?.orders ?? 0 } } },
      },
    ]);
    const undo = (message: string) => setThread((th) => freezeImportCard(th, card.key, undefined)
      .map((m) => (m.orderImport?.key === runKey ? { ...m, orderImport: undefined, isError: true, text: message } : m)));
    void runDirectOrderImport(view.importId, conversationId ?? undefined, lang)
      .then((res) => {
        if (res.status !== 'ok' && res.status !== 'running') undo(res.message ?? t('vagonai.erpImport.error'));
      })
      .catch((err) => undo(userFacingError(err, t, t('vagonai.erpImport.error'))));
  }, [conversationId, lang, t]);

  /** "Close" on an import card: the card leaves the thread, a one-line note of what happened stays. */
  const closeImportCard = (card: ThreadImportCard) => {
    const view = card.engine === 'direct' ? importViews[card.key] ?? card.view : null;
    const created = view?.status === 'done' ? view.summary?.orders.created ?? 0 : 0;
    const text = card.engine === 'legacy'
      ? t('vagonai.erpImport.closedPlain')
      : created > 0
        ? t('vagonai.erpImport.closedDone', { count: created })
        : t('vagonai.erpImport.closed');
    patchImportMessage(card.key, (m) => ({ ...m, orderImport: undefined, text }));
  };

  const renderImportCard = (card: ThreadImportCard) =>
    card.engine === 'direct' ? (
      <ErpImportCard
        key={`${card.key}${card.frozen ? '-frozen' : ''}`}
        view={card.frozen ? card.view : importViews[card.key] ?? card.view}
        frozen={card.frozen}
        conversationId={conversationId ?? undefined}
        T={T}
        chatBusy={isStreaming}
        onViewChange={(v) => setImportViews((all) => (all[card.key] === v ? all : { ...all, [card.key]: v }))}
        onDismiss={() => closeImportCard(card)}
        onImport={(v) => startImportFromCard(card, v)}
        onChooseAnother={() => {
          replaceCardRef.current = card.key;
          orderIntakeFileRef.current?.click();
        }}
        onImported={(summary) => {
          if (summary.orders.created > 0) setStickyOrdersRefresh((n) => n + 1);
          handleIntakeImported(summary); // WP3a-pkg2
        }}
        onPlanOrders={(ids) => {
          setStickyOrdersFocus({ ids, token: Date.now() });
          setOrdersOpen(true);
        }}
      />
    ) : (
      <OrderImportReviewCard
        key={card.key}
        state={card.state}
        T={T}
        onDismiss={() => closeImportCard(card)}
        onChooseAnother={() => orderIntakeFileRef.current?.click()}
        onRetry={() => {
          const last = lastOrderImportRef.current;
          if (last) void runOrderImport(last);
        }}
        onImported={(result) => {
          if (result.created + result.updated > 0) setStickyOrdersRefresh((n) => n + 1);
        }}
      />
    );

  const empty = thread.length === 0;
  // A message always needs words - with files too (MS3-366); the chip below supplies them for an import.
  const canSend = input.trim().length > 0;
  const composerBusy = isStreaming || loadingConversation || orderIntakeBusy || viewingHistory;

  /** The "Import orders" chip: the staged files, imported, without words to send the assistant. */
  const importStaged = () => {
    if (stagedFiles.length === 0 || composerBusy) return;
    const files = stagedFiles;
    setStagedFiles([]);
    setInput('');
    void runOrderImports(files, t('vagonai.compose.importChipPrompt'), '');
  };

  const submit = () => {
    if (!canSend || composerBusy) return;
    if (stagedFiles.length > 0) {
      const files = stagedFiles;
      const note = input.trim();
      setStagedFiles([]);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      if (isImportIntent(note)) void runOrderImports(files, note, note);
      else offerImport(files, note);
      return;
    }
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
    if (isStreaming || loadingConversation || viewingHistory) return;
    const draft = input;
    send(t('vagonai.dashboardPrompt'));
    if (draft.trim()) setInput(draft);
  };

  return (
    <div className="vai">
      <HistorySidebar
        conversations={conversations}
        hiddenCount={hiddenHistoryCount}
        loading={historyLoading}
        error={historyError}
        activeId={conversationId}
        activeIsReadOnly={viewingHistory}
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
          <div className="vai-header-actions">
            {/* MS3-364: the Orders drawer, with how many orders wait to be planned. */}
            <button
              type="button"
              className="vai-header-action"
              onClick={() => setOrdersOpen((v) => !v)}
              aria-expanded={ordersOpen}
              aria-controls="vai-orders-drawer"
              data-testid="orders-drawer-toggle"
            >
              <Package size={13} />
              <span>{t('vagonai.stickyOrders.title')}</span>
              {ordersCount.plannable > 0 ? (
                <span className={`vai-header-badge${ordersCount.overdue > 0 ? ' vai-header-badge--late' : ''}`} data-testid="orders-drawer-badge">
                  {t('vagonai.stickyOrders.toPlan', { n: `${ordersCount.plannable}${ordersCount.hasMore ? '+' : ''}` })}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="vai-header-action"
              onClick={() => setSchedulerOpen(true)}
              title={t('vagonai.scheduledPost.open')}
            >
              <CalendarClock size={13} />
              <span>{t('vagonai.scheduledPost.open')}</span>
            </button>
          </div>
        </header>

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
                <UnfinishedLoadBanner
                  enabled={gatewayStatus === 'ready' && !loadingConversation}
                  lang={lang}
                  t={t}
                  onContinue={(id) => void handleSelectConversation(id)}
                />

                <section className="vai-tier" aria-labelledby="vai-tier-actions">
                  <h2 className="vai-tier-label" id="vai-tier-actions">{toUpperGreek(t('vagonai.empty.actionsLabel'))}</h2>
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
                  <h2 className="vai-tier-label" id="vai-tier-questions">{toUpperGreek(t('vagonai.empty.questionsLabel'))}</h2>
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
                <div className={`vai-bubble${m.attachment || m.attachments?.length ? ' vai-bubble--file' : ''}`}>
                  {(m.attachments ?? (m.attachment ? [m.attachment] : [])).map((a, j) => (
                    <span key={`${a.name}-${j}`} className="vai-file-chip" title={a.name}>
                      <FileSpreadsheet size={15} aria-hidden="true" />
                      <span className="vai-file-chip-name">{a.name}</span>
                      <span className="vai-file-chip-size">{formatFileSize(a.size)}</span>
                    </span>
                  ))}
                  {m.text ? <span>{displayUserMessage(m.text, t)}</span> : null}
                </div>
              </div>
            ) : m.action && i !== liveCardIndex && !m.text && !m.actionError && !m.selection ? (
              /* A superseded card on a turn that held nothing else: the live card
                 is further down the thread and the settle effect drops this turn
                 moments later, so render nothing rather than an empty bubble. */
              null
            ) : (
              /* `--intake`: on a phone the widget card takes the avatar's column too (vagonai.css). */
              <div key={i} className={`vai-turn${m.intake ? ' vai-turn--intake' : ''}`}>
                <span className="vai-mark vai-avatar" aria-hidden="true">
                  <Sparkles size={14} />
                </span>
                <div className="vai-answer">
                  {m.importOffer ? (
                    <ImportOfferMessage
                      offer={m.importOffer}
                      available={m.importOffer.key in offerFiles}
                      disabled={composerBusy}
                      onAnswer={(accept) => answerImportOffer(m.importOffer!.key, accept)}
                    />
                  ) : m.orderImport ? renderImportCard(m.orderImport) : m.isError ? (
                    <>
                      <p className="vai-error">{m.text}</p>
                      {m.retryable && i === thread.length - 1 && !isStreaming && (
                        <button type="button" className="vai-chip vai-retry" onClick={retryLastSend}>
                          {t('vagonai.live.retry', 'Try again')}
                        </button>
                      )}
                    </>
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
                      {/* WP3a — Create Shipment intake: the live widget of its load, or a read-only row once spent. */}
                      {m.intake && (
                        <IntakeWidgetHost
                          state={m.intake}
                          live={isLiveIntake(thread, i)}
                          busy={intake.busy}
                          canMeasureRoute={m.intake.kind === 'event' && m.intake.event.type === 'summary' && intake.canMeasureRouteFor(m.intake.event)}
                          routeInfo={m.intake.kind === 'event' && m.intake.event.type === 'summary' ? intake.routeInfoFor(m.intake.event) : null} /* WP3b-corr */
                          actions={intake.actions}
                          onSubmitAddress={handleAddressSubmit} /* WP3b: create-in-place reuses the existing forms (§8.10) */
                          onSubmitProduct={handleProductSubmit}
                          createDisabled={previewApi !== undefined} /* the dev preview must not write */
                        />
                      )}
                      {(m.batchJobId || (m.pending && batchJob?.job_id)) ? (
                        <BatchDraftJobCard
                          jobId={m.batchJobId || batchJob!.job_id}
                          locale={lang}
                          T={T}
                          // The drafts it saved planned their orders, and the
                          // chat's row is certainly written by now (QA 2026-10-08).
                          onFinished={onBatchJobFinished}
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
                          onSubmitAddress={handleAddressSubmit}
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
                            {/* Same tab, so no external-link icon - that one is
                                kept for links that open a new tab (QA 2026-10-08). */}
                            <ArrowRight size={14} aria-hidden="true" />
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
                          <ArrowRight size={14} aria-hidden="true" />
                          {t('vagonai.published.open', { id: (m.published ?? published)!.auto_id })}
                        </button>
                      )}
                      {/* Not under an intake step: its card is the message, and
                          copying or regenerating a widget means nothing. */}
                      {!m.pending && !m.intake && (
                        <div className="vai-tools">
                          <button type="button" onClick={() => copyText(m.text, i)} className="vai-tool">
                            {copiedIdx === i ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                            {copiedIdx === i ? t('vagonai.live.copied') : t('vagonai.live.copy')}
                          </button>
                          {/* Hidden rather than greyed in a past chat: regenerating
                              is asking again, which a read-only thread cannot do. */}
                          {!viewingHistory && (
                            <button
                              type="button"
                              onClick={() => send(t('vagonai.regeneratePrompt'))}
                              disabled={isStreaming || loadingConversation}
                              className="vai-tool"
                            >
                              <RefreshCw size={14} aria-hidden="true" />
                              {t('vagonai.regenerate')}
                            </button>
                          )}
                          <span className="vai-meta">
                            {m.sentAt}
                            {SHOW_TOKEN_USAGE && m.usage && (
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
        {orderIntakeOffer ? (
          <div className="vai-column" style={{ paddingBottom: 8 }}>
            <div
              className="rounded-xl border px-3 py-2.5 text-[12.5px] flex flex-wrap items-center gap-2"
              style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
            >
              <span className="flex-1 min-w-[12rem]">{t('vagonai.orderImport.offer.text')}</span>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold"
                style={{ background: T.t1, color: T.sf }}
                disabled={orderIntakeBusy}
                data-testid="order-import-offer-accept"
                onClick={() => void runOrderImport({ text: orderIntakeOffer })}
              >
                {t('vagonai.orderImport.offer.import')}
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
                {t('vagonai.orderImport.offer.sendAsChat')}
              </button>
              <button
                type="button"
                className="rounded-lg px-2 py-1.5 text-[12px]"
                style={{ color: T.t2 }}
                onClick={() => setOrderIntakeOffer(null)}
              >
                {t('vagonai.orderImport.offer.cancel')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="vai-composer-wrap">
          <div className="vai-column">
            {/* A past chat is read-only. Said above the composer rather than
                only in its placeholder, and paired with the one action that
                gets the shipper typing again, so a greyed box never reads as
                the page having broken. */}
            {viewingHistory && (
              <div className="vai-readonly">
                <span className="vai-readonly-icon" aria-hidden="true">
                  <Lock size={14} />
                </span>
                <div className="vai-readonly-text" id="vai-readonly-note">
                  <strong>{t('vagonai.history.readOnly.title')}</strong>
                  <span>{t('vagonai.history.readOnly.body')}</span>
                </div>
                <button
                  type="button"
                  className="vai-linkbtn vai-linkbtn--solid vai-readonly-cta"
                  onClick={leaveHistoryForNewChat}
                >
                  <MessageSquarePlus size={14} aria-hidden="true" />
                  {t('vagonai.history.newChat')}
                </button>
              </div>
            )}
            {/* The textarea carries no outline of its own, so the shell takes
                the focus state via :focus-within — the ring lands around the
                control the shipper sees rather than being removed outright. */}
            <div
              className={`vai-composer${orderIntakeDragging ? ' vai-composer--dropping' : ''}${viewingHistory ? ' vai-composer--readonly' : ''}`}
              /*
                MS3-335 — the ticket says "drop", and until now only the paperclip
                worked. dragOver must preventDefault or the browser navigates away
                to the file instead of letting the page have it.
              */
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('Files') || viewingHistory) return;
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
                if (isStreaming || loadingConversation || orderIntakeBusy || viewingHistory) return;
                // Every dropped file (MS3-366). Refused here rather than after an
                // upload: PDF and image intake is not built, and a file that
                // uploads and then fails reads as a bug.
                stageIncoming(Array.from(e.dataTransfer.files ?? []));
              }}
            >
              {stagedFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="vai-staged-file" data-testid="composer-staged-file">
                  <FileSpreadsheet size={18} aria-hidden="true" className="vai-staged-file-icon" />
                  <div className="vai-staged-file-text">
                    <span className="vai-staged-file-name" title={file.name}>{file.name}</span>
                    <span className="vai-staged-file-hint">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="vai-staged-file-remove"
                    aria-label={t('vagonai.orderImport.removeFile', { file: file.name })}
                    title={t('vagonai.orderImport.removeFile', { file: file.name })}
                    onClick={() => setStagedFiles((all) => all.filter((f) => f !== file))}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {/* MS3-366: files need words. With none typed yet, the one thing a file can be sent for is a chip. */}
              {stagedFiles.length > 0 && !input.trim() ? (
                <div className="vai-staged-chips" data-testid="composer-file-chips">
                  <span className="vai-staged-chips-hint">{t('vagonai.compose.needsPrompt', { count: stagedFiles.length })}</span>
                  <button
                    type="button"
                    className="vai-chip"
                    disabled={composerBusy}
                    onClick={importStaged}
                    data-testid="composer-chip-import"
                  >
                    {t('vagonai.compose.importChip', { count: stagedFiles.length })}
                  </button>
                </div>
              ) : null}
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
                disabled={viewingHistory}
                placeholder={viewingHistory
                  ? t('vagonai.history.readOnly.placeholder')
                  : stagedFiles.length > 0
                    ? t('vagonai.orderImport.notePlaceholder')
                    : t('vagonai.composerPh')}
                aria-label={t('vagonai.composerPh')}
                aria-describedby={viewingHistory ? 'vai-readonly-note' : undefined}
                className="vai-input"
              />
              <div className="vai-composer-row">
                <input
                  ref={orderIntakeFileRef}
                  type="file"
                  accept={ORDER_INTAKE_ACCEPT}
                  multiple
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (files.length && handleIntakeHandoffFiles(files)) return; // WP3a-pkg2
                    if (files.length) stageIncoming(files);
                  }}
                />
                <button
                  type="button"
                  className="vai-attach"
                  title={t('vagonai.orderImport.attach')}
                  aria-label={t('vagonai.orderImport.attach')}
                  disabled={composerBusy || stagedFiles.length >= MAX_STAGED_FILES}
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
                {/* Kept in the row while read-only (just not shown) — it is the
                    auto margin that holds the send button on the right. */}
                <span
                  className="vai-hint"
                  aria-hidden={viewingHistory || undefined}
                  style={viewingHistory ? { visibility: 'hidden' } : undefined}
                >
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
                    disabled={!canSend || loadingConversation || orderIntakeBusy || viewingHistory}
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
      {/* MS3-364: beside the chat on a wide screen, over it (with a backdrop) on a narrow one. */}
      {ordersOpen ? <div className="vai-orders-scrim" aria-hidden="true" onClick={() => setOrdersOpen(false)} /> : null}
      <aside
        id="vai-orders-drawer"
        className={`vai-orders-drawer${ordersOpen ? ' vai-orders-drawer--open' : ''}`}
        aria-hidden={!ordersOpen}
        data-testid="orders-drawer"
      >
        <div className="vai-orders-drawer-inner">
          <StickyOrdersPanel
            T={T}
            disabled={isStreaming || loadingConversation || viewingHistory}
            refreshToken={stickyOrdersRefresh}
            open={ordersOpen}
            onOpenChange={setOrdersOpen}
            onCountChange={setOrdersCount}
            onActed={closeOrdersIfOverlaying}
            focusRequest={stickyOrdersFocus}
            onCreateDrafts={handleStickyCreateDrafts}
            onMarkComplete={handleStickyMarkComplete}
            onReopen={handleStickyReopen}
          />
        </div>
      </aside>
    </div>
  );
}
