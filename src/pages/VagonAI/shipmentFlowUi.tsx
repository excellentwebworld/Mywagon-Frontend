/**
 * Presentational chrome for the create-shipment card wizard.
 *
 * Draft writes, submit and the stage machine stay in `CreateShipmentFlow`.
 * These pieces are the named-stage shell — bar, itinerary, pickers, actions —
 * so the flow file does not grow a second copy of a 44px button.
 */
import { Check, Plus, Star, AlertTriangle, Info, ArrowRight, ChevronDown } from 'lucide-react';
import type { FlowLocation, FlowProduct } from '../../hooks/useChat';
import { useFilter } from './flowHelpers';

export type Translate = (key: string, opts?: Record<string, unknown>) => string;

export function VaiShipField({
  label, htmlFor, children,
}: {
  label: string; htmlFor?: string; children: React.ReactNode;
}) {
  return (
    <label className="vai-ship-field" htmlFor={htmlFor}>
      <span className="vai-ship-field-label">{label}</span>
      {children}
    </label>
  );
}

export function VaiShipPick({
  title, subtitle, selected, disabled, onClick, badge, dataField,
}: {
  title: string;
  subtitle?: string | null;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
  dataField?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-field={dataField}
      className={`vai-ship-pick${selected ? ' is-selected' : ''}`}
    >
      <span className="min-w-0">
        <span className="vai-ship-pick-title">{title}</span>
        {subtitle && <span className="vai-ship-pick-sub">{subtitle}</span>}
      </span>
      <span className="flex items-center flex-shrink-0" style={{ gap: 6 }}>
        {badge}
        {selected && <Check size={14} aria-hidden="true" />}
      </span>
    </button>
  );
}

export function VaiShipAdd({
  label, hint, disabled, onClick,
}: {
  label: string; hint?: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="vai-ship-add">
      <Plus size={16} aria-hidden="true" />
      <span className="min-w-0">
        <span className="vai-ship-add-label">{label}</span>
        {hint && <span className="vai-ship-add-hint">{hint}</span>}
      </span>
    </button>
  );
}

export function VaiShipNotes({ notes, tone = 'info' }: { notes: string[]; tone?: 'info' | 'warn' }) {
  if (notes.length === 0) return null;
  return (
    <div className={`vai-ship-notes${tone === 'warn' ? ' is-warn' : ''}`}>
      {notes.map((note) => (
        <p key={note}>
          {tone === 'warn'
            ? <AlertTriangle size={13} aria-hidden="true" />
            : <Info size={13} aria-hidden="true" />}
          <span>{note}</span>
        </p>
      ))}
    </div>
  );
}

export function VaiShipList({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <div className={count > 8 ? 'vai-ship-list is-long' : 'vai-ship-list'}>
      {children}
    </div>
  );
}

/**
 * One row of the create-shipment card.
 *
 * The header is the whole point. It carries the section's own answer — "Athens DC
 * → Thessaloniki WH", "2 products · 1,200 kg" — so the shipper reads the finished
 * load down the closed card without opening anything. That summary is what
 * replaced the separate Review stage: a recap you have to page to is a recap
 * nobody reads.
 *
 * One open at a time, which the caller enforces. Two open sections is the tall
 * scrolling card this was built to get rid of.
 */
export function SectionRow({
  id, icon, title, summary, state, stateLabel, open, onToggle, children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  /** The section's current answer, already localised. */
  summary: string;
  state: 'done' | 'todo' | 'gap' | 'optional';
  stateLabel: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`vai-ship-section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="vai-ship-section-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        <span className="vai-ship-section-icon" aria-hidden="true">{icon}</span>
        <span className="vai-ship-section-text">
          <span className="vai-ship-section-title">{title}</span>
          <span className="vai-ship-section-summary">{summary}</span>
        </span>
        <span className={`vai-ship-state is-${state}`}>{stateLabel}</span>
        <ChevronDown size={18} aria-hidden="true" className={`vai-ship-chevron${open ? ' is-open' : ''}`} />
      </button>
      <div id={id} className="vai-ship-section-body" hidden={!open}>
        {open && children}
      </div>
    </div>
  );
}

/**
 * A picked record, standing in for the list it came from.
 *
 * Every picker on this card used to keep its full scrolling list on screen after
 * the shipper had already chosen — two of them on Route alone, 280px each. This
 * is what a picker collapses to once it has an answer, and it is most of the
 * reason the whole load now fits one view.
 */
export function ChosenRow({
  title, subtitle, changeLabel, onChange, disabled, dataField,
}: {
  title: string;
  subtitle?: string | null;
  changeLabel: string;
  onChange: () => void;
  disabled?: boolean;
  dataField?: string;
}) {
  return (
    <div className="vai-ship-chosen" data-field={dataField} tabIndex={-1}>
      <Check size={16} aria-hidden="true" />
      <span className="min-w-0">
        <span className="vai-ship-pick-title">{title}</span>
        {subtitle && <span className="vai-ship-pick-sub">{subtitle}</span>}
      </span>
      <button type="button" className="vai-ship-edit" onClick={onChange} disabled={disabled}>
        {changeLabel}
      </button>
    </div>
  );
}

export function ItineraryStrip({
  t, origin, destination, originWhen, destWhen,
}: {
  t: Translate;
  origin: string | null;
  destination: string | null;
  originWhen?: string | null;
  destWhen?: string | null;
}) {
  return (
    <div className="vai-ship-itin" aria-live="polite">
      <span className={origin ? undefined : 'is-unset'}>
        {origin ?? t('vagonai.ship.route.pickupUnset')}
        {origin && !originWhen ? ` · ${t('vagonai.ship.route.dateNeeded')}` : ''}
        {originWhen ? ` · ${originWhen.replace('T', ' ')}` : ''}
      </span>
      <ArrowRight size={14} aria-hidden="true" />
      <span className={destination ? undefined : 'is-unset'}>
        {destination ?? t('vagonai.ship.route.deliveryUnset')}
        {destination && !destWhen ? ` · ${t('vagonai.ship.route.dateNeeded')}` : ''}
        {destWhen ? ` · ${destWhen.replace('T', ' ')}` : ''}
      </span>
    </div>
  );
}

export function LocationRows({
  t, rows, term, selectedId, isUsable, disabled, onPick, onAddNew, dataField,
}: {
  t: Translate;
  rows: FlowLocation[];
  term: string;
  selectedId: string | null;
  isUsable: (loc: FlowLocation) => boolean;
  disabled?: boolean;
  onPick: (id: string) => void;
  onAddNew?: () => void;
  dataField?: string;
}) {
  const filtered = useFilter(rows, term, (row, needle) =>
    [row.name, row.city, row.country].some((v) => v?.toLowerCase().includes(needle)));

  const searching = term.trim().length > 0;
  const fellBack = searching && filtered.length === 0;
  const shown = fellBack ? rows.slice(0, 40) : filtered;

  return (
    <>
      {fellBack && (
        <p className="vai-ship-hint">{t('vagonai.ship.route.searchFallback', { term: term.trim() })}</p>
      )}
      {rows.length > 0 && shown.length < rows.length && !fellBack && (
        <p className="vai-ship-hint">{t('vagonai.ship.listShown', { shown: shown.length, total: rows.length })}</p>
      )}
      <VaiShipList count={shown.length}>
        {shown.map((loc) => {
          const usable = isUsable(loc);
          return (
            <VaiShipPick
              key={loc.id}
              title={loc.name}
              subtitle={[loc.city, loc.country].filter(Boolean).join(', ') || null}
              selected={selectedId === loc.id}
              disabled={disabled || !usable}
              dataField={dataField}
              onClick={() => onPick(loc.id)}
            />
          );
        })}
        {onAddNew && (
          <VaiShipAdd
            label={rows.length === 0 ? t('vagonai.ship.route.addFirst') : t('vagonai.ship.route.addNew')}
            hint={rows.length === 0 ? t('vagonai.ship.route.addFirstHint') : t('vagonai.ship.route.addNewHint')}
            disabled={disabled}
            onClick={onAddNew}
          />
        )}
      </VaiShipList>
    </>
  );
}

export function ProductRows({
  t, rows, term, selectedIds, disabled, onPick, onAddNew,
}: {
  t: Translate;
  rows: FlowProduct[];
  term: string;
  selectedIds?: ReadonlySet<string>;
  disabled?: boolean;
  onPick: (p: FlowProduct) => void;
  onAddNew?: () => void;
}) {
  const filtered = useFilter(rows, term, (row, needle) =>
    [row.name, row.sku, row.category, row.type].some((v) => v?.toLowerCase().includes(needle)));

  const searching = term.trim().length > 0;
  const fellBack = searching && filtered.length === 0;
  const shown = fellBack ? rows.slice(0, 40) : filtered;

  return (
    <>
      {fellBack && (
        <p className="vai-ship-hint">{t('vagonai.ship.cargo.searchFallback', { term: term.trim() })}</p>
      )}
      {rows.length > 0 && shown.length < rows.length && !fellBack && (
        <p className="vai-ship-hint">
          {t('vagonai.ship.listShownProducts', { shown: shown.length, total: rows.length })}
        </p>
      )}
      <VaiShipList count={shown.length}>
        {shown.map((product) => (
          <VaiShipPick
            key={product.id}
            title={product.name}
            subtitle={[product.sku, product.category].filter(Boolean).join(' · ') || null}
            selected={selectedIds?.has(product.id) ?? false}
            disabled={disabled}
            onClick={() => onPick(product)}
          />
        ))}
        {onAddNew && (
          <VaiShipAdd
            label={rows.length === 0 ? t('vagonai.ship.cargo.addFirst') : t('vagonai.ship.cargo.addNew')}
            hint={undefined}
            disabled={disabled}
            onClick={onAddNew}
          />
        )}
      </VaiShipList>
    </>
  );
}

export function PartnerRating({ rating }: { rating: number | null | undefined }) {
  if (!rating) return null;
  return (
    <span className="vai-ship-pick-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Star size={12} aria-hidden="true" />
      {rating}
    </span>
  );
}

export function VaiShipActions({ children }: { children: React.ReactNode }) {
  return <div className="vai-ship-actions">{children}</div>;
}

export function ShipButton({
  children, onClick, primary, disabled, icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={primary ? 'is-primary' : undefined}
    >
      {icon}
      {children}
    </button>
  );
}
