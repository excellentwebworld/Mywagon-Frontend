/**
 * IntakeWidgetHostView — renders ONE intake message of the Vagon AI transcript.
 *
 * The page renders it for every thread message that carries `intake`. Whether that message is the live widget
 * (the newest step / summary / done of its intake) or a spent one is decided by the transcript (`isLiveIntake`);
 * a spent one becomes a read-only row that keeps the shipper's answer. Widgets never call the gateway: they call
 * `actions`, which the page binds to the REST routes (`useIntakeFlow`) or to its own `send` for typed text.
 * Takes the theme and the translator as props, so it renders (and is tested) with no provider.
 */
import type {
  IntakeAnswerWire, IntakeDoneEvent, IntakeEvent, IntakeStepEvent, IntakeSummaryEvent, OptionsKind, OptionsQuery, OptionsResponse,
} from './contract';
import { historyText, renderLocalisable, renderTxt, type ExistsFn } from './intakeCopy';
import { armFocusIntent } from './intakeFocus';
import { PARTNERS_R4_LIVE, stepViewOf } from './intakeModel';
import { collectAll } from './optionsModel';
import type { IntakeMessageState } from './intakeThread';
import { chrome, LiveFocus, NoticeLine, type IntakeUi } from './intakeUi';
import type { IntakeCreateKit } from './intakeCreate';
import { CargoWidget } from './widgets/CargoWidget';
import { ChoiceWidget } from './widgets/ChoiceWidget';
import { LocationWidget } from './widgets/LocationWidget';
import { MorePickupsWidget } from './widgets/MorePickupsWidget';
import { PickOrdersWidget } from './widgets/PickOrdersWidget';
import { WindowWidget } from './widgets/WindowWidget';
import { ChannelWidget } from './widgets/ChannelWidget';
import { ConfirmDiscardWidget } from './widgets/ConfirmDiscardWidget';
import { DescribeWidget } from './widgets/DescribeWidget';
import { DoneCard } from './widgets/DoneCard';
import { NegotiableWidget } from './widgets/NegotiableWidget';
import { OrderNumberWidget } from './widgets/OrderNumberWidget';
import { OrderValueWidget } from './widgets/OrderValueWidget';
import { PriceWidget } from './widgets/PriceWidget';
import { TrackingWidget } from './widgets/TrackingWidget';
import { VehicleWidget } from './widgets/VehicleWidget';
import {
  DiscardedNote, ErrorNote, HistoryAnswerRow, SpentStepRow, SpentSummaryRow,
} from './widgets/HistoryRows';
import { SummaryCard } from './widgets/SummaryCard';
import { TextStep } from './widgets/TextStep';

/** What a widget can ask the page to do. All of them are no-ops while `busy`. */
export interface IntakeActions {
  /** Post a widget answer (R3). `event` is the step the shipper is looking at — its `stepId` + `rev` ride along. */
  answer: (event: IntakeStepEvent | IntakeSummaryEvent, wire: IntakeAnswerWire, shown?: string) => void;
  /** "Yes, upload the file": posts `upload_offer` and hands the shipper to the existing import flow (file picker). */
  upload: (event: IntakeStepEvent) => void;
  /** Typed text from the Describe widget: a normal chat turn. */
  sendText: (text: string) => void;
  /** Save as draft / Publish now (R5). */
  finish: (event: IntakeSummaryEvent, intent: 'save_draft' | 'publish') => void;
  /** Undo a saved draft (R6). */
  undo: (event: IntakeDoneEvent) => void;
  /** Cancel the whole load (R7) — the widget has already asked "Discard this load?". */
  discard: (event: IntakeSummaryEvent) => void;
  /** Start another load after a finished one. */
  newLoad: () => void;
  /** Open an in-app path (the saved shipment). */
  open: (url: string) => void;
  /** Repeat the request that failed, unchanged. */
  retry: (kind: 'finish' | 'undo') => void;
  /**
   * R4 (§6.6): one page of a big list for the step on screen. Never throws — a failure is `{ok:false}`. Optional so a widget
   * degrades to what the event itself carries when a page has no way to ask (a test double, an older build).
   */
  options?: (event: IntakeStepEvent, kind: OptionsKind, query?: OptionsQuery) => Promise<OptionsResponse>;
}

export interface IntakeHostProps {
  state: IntakeMessageState;
  /** The newest widget of its intake. A spent one is read-only. */
  live: boolean;
  /** A request or a chat turn is in flight: every control is disabled (double-tap safe). */
  busy: boolean;
  /** Whether this page can measure a route for Publish (§8.5 `routeNeeded`). */
  canMeasureRoute: boolean;
  /** The measured route of THIS summary, when known: lets the card say "≈ N km (estimate)" (§19.8). */
  routeInfo?: { km: number; estimated: boolean } | null;
  actions: IntakeActions;
  /** The existing create forms for create-in-place (§8.10). Absent ⇒ no "Add new" on the pickers. */
  create?: IntakeCreateKit;
}

export function IntakeWidgetHostView({
  ui, exists, state, live, busy, canMeasureRoute, routeInfo, actions, create,
}: IntakeHostProps & { ui: IntakeUi; exists?: ExistsFn }) {
  if (state.kind === 'history') {
    return <HistoryAnswerRow ui={ui} answerText={historyText(ui.t, state.item, exists)} />;
  }
  const { event } = state;
  const spent = !live;
  const answerText = state.answered ? renderLocalisable(ui.t, state.answered, exists) : '';

  switch (event.type) {
    case 'step': {
      if (spent) return <SpentStepRow ui={ui} event={event} answerText={answerText} />;
      return (
        <LiveFocus label={renderTxt(event.prompt)}>
          <LiveStep ui={ui} event={event} busy={busy} actions={actions} notice={state.notice?.text ?? null} create={create} />
        </LiveFocus>
      );
    }
    case 'summary':
      if (spent) return <SpentSummaryRow ui={ui} event={event} />;
      return (
        <LiveFocus label={renderTxt(event.title)}>
        <SummaryCard
          ui={ui} event={event} disabled={busy} canMeasureRoute={canMeasureRoute} routeInfo={routeInfo} notice={state.notice?.text ?? null}
          onEdit={(target) => actions.answer(event, { step: 'edit', target: target.step as IntakeStepEvent['step'], ...(target.stopKey ? { stopKey: target.stopKey } : {}) })}
          onJump={(target) => actions.answer(event, { step: 'edit', target: target.step as IntakeStepEvent['step'], ...(target.stopKey ? { stopKey: target.stopKey } : {}) })}
          onFinish={(intent) => actions.finish(event, intent)}
          onDiscard={() => actions.discard(event)}
        />
        </LiveFocus>
      );
    case 'done':
      return (
        <LiveFocus label={renderTxt(event.message)}>
        <DoneCard
          ui={ui} event={event} live={live} disabled={busy} notice={state.notice}
          onOpen={actions.open} onUndo={() => actions.undo(event)} onNewLoad={actions.newLoad} onRetry={actions.retry}
        />
        </LiveFocus>
      );
    case 'error':
      return <ErrorNote ui={ui} event={event} />;
    case 'discarded':
      return (
        <LiveFocus label={renderTxt(event.message)}>
          <DiscardedNote ui={ui} event={event} />
        </LiveFocus>
      );
    default:
      return null;
  }
}

/** The live step: the widget its `widget.kind` names, or the text-only fallback. */
function LiveStep({
  ui, event, busy, actions, notice, create,
}: { ui: IntakeUi; event: IntakeStepEvent; busy: boolean; actions: IntakeActions; notice: string | null; create?: IntakeCreateKit }) {
  const view = stepViewOf(event);
  const load = actions.options ? (kind: OptionsKind, query: OptionsQuery) => actions.options!(event, kind, query) : undefined;
  const shortcuts = {
    onExpress: () => actions.answer(event, { step: 'express', mode: 'defaults' }),
    onToSummary: () => actions.answer(event, { step: 'to_summary' }),
    onCancelEdit: () => actions.answer(event, { step: 'edit_cancel' }),
  };
  let body: React.ReactNode;
  switch (view.kind) {
    case 'gate':
      body = (
        <ChoiceWidget
          ui={ui} event={event} options={view.spec.options} disabled={busy} {...shortcuts}
          onChoose={(id) => actions.answer(event, { step: 'gate', origin: id as 'orders' | 'manual' })}
        />
      );
      break;
    case 'order_split':
      // MS3-404: two or more orders — one combined load, or one load per order. The tap is the answer.
      body = (
        <ChoiceWidget
          ui={ui} event={event} options={view.spec.options} disabled={busy} {...shortcuts}
          onChoose={(id) => actions.answer(event, { step: 'order_split', mode: id as 'combined' | 'per_order' })}
        />
      );
      break;
    case 'order_number':
      body = <OrderNumberWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire) => actions.answer(event, wire)} />;
      break;
    case 'upload_offer':
      body = (
        <ChoiceWidget
          ui={ui} event={event} options={view.spec.options} disabled={busy} {...shortcuts}
          onChoose={(id) => (id === 'upload' ? actions.upload(event) : actions.answer(event, { step: 'upload_offer', choice: 'continue' }))}
        />
      );
      break;
    case 'describe':
      body = (
        <DescribeWidget
          ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts}
          onSend={actions.sendText}
          onStepByStep={() => actions.answer(event, { step: 'describe', choice: 'step_by_step' })}
        />
      );
      break;
    case 'confirm_discard':
      body = (
        <ConfirmDiscardWidget ui={ui} event={event} spec={view.spec} disabled={busy} onAnswer={(confirm) => actions.answer(event, { step: 'confirm_discard', confirm })} />
      );
      break;
    /* WP3c — the terms steps: one action each, the smart default pre-selected. */
    case 'tracking':
      body = <TrackingWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(tracking) => actions.answer(event, { step: 'tracking', tracking })} />;
      break;
    case 'negotiable':
      body = <NegotiableWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(negotiable) => actions.answer(event, { step: 'negotiable', negotiable })} />;
      break;
    case 'price':
      body = <PriceWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(price) => actions.answer(event, { step: 'price', price })} />;
      break;
    case 'order_value':
      body = <OrderValueWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(orderValue) => actions.answer(event, { step: 'order_value', orderValue })} />;
      break;
    case 'channel':
      body = (
        <ChannelWidget
          ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire) => actions.answer(event, wire)}
          loadPartners={PARTNERS_R4_LIVE && actions.options ? () => collectAll((cursor) => actions.options!(event, 'partners', { ...(cursor ? { cursor } : {}) })) : undefined}
        />
      );
      break;
    case 'vehicle':
      body = <VehicleWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire) => actions.answer(event, wire)} />;
      break;
    /* WP3b — the stop steps. */
    case 'location':
      body = <LocationWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire, shown) => actions.answer(event, wire, shown)} load={load} create={create} />;
      break;
    case 'cargo':
      body = <CargoWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire, shown) => actions.answer(event, wire, shown)} load={load} create={create} />;
      break;
    case 'window':
      body = <WindowWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire, shown) => actions.answer(event, wire, shown)} />;
      break;
    case 'more_pickups':
      body = <MorePickupsWidget ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire) => actions.answer(event, wire)} />;
      break;
    case 'pick_orders':
      body = (
        <PickOrdersWidget
          ui={ui} event={event} spec={view.spec} disabled={busy} {...shortcuts} onAnswer={(wire) => actions.answer(event, wire)} load={load}
          onManual={() => { armFocusIntent(); actions.answer(event, { step: 'gate', origin: 'manual' }, chrome(ui, 'gate.manual', 'Manually')); }}
        />
      );
      break;
    default:
      body = <TextStep ui={ui} event={event} disabled={busy} {...shortcuts} />;
  }
  return (
    <>
      {body}
      {notice && <NoticeLine ui={ui} tone="error">{notice}</NoticeLine>}
    </>
  );
}

export type { IntakeEvent };
