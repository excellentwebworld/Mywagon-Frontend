/**
 * PickerDropdown — the one way a guided card asks the shipper to pick a record.
 *
 * ## What this replaces
 *
 * Every picker on the order and shipment cards used to be a list that was
 * always open: a search box with a short scroll box of rows under it, between
 * the other fields. Shippers could not tell whether it was a list to read or a
 * control to use. It also showed 40 rows at most and never said so, so
 * nobody could tell there was more below, or that some rows were missing.
 *
 * ## The shape
 *
 * - **A trigger that looks like a select.** Closed, it shows the current choice
 *   (or a placeholder and how many there are to choose from) and a chevron.
 *   That one row is all the picker takes up until the shipper opens it.
 * - **Search first.** The panel opens with the cursor already in a search box
 *   at the top, so typing narrows the list straight away. When the order named
 *   the site, that wording is already in the box.
 * - **Nothing silently cut off.** Rows arrive a page at a time, either from
 *   scrolling to the bottom or from the "Show more" button, and the footer
 *   always says "Showing 50 of 213". "Add a new one" sits below the list, so it
 *   is still on screen when nothing matched.
 *
 * Opens upward when there is no room below. A chat card is usually just above
 * the composer, and a panel that opens downward there is mostly off-screen.
 * "Room" is measured inside the chat's own scroller, not the window, and
 * opening never scrolls anything but the panel's own list (MS3-399): the
 * shipper's place in the conversation stays exactly where it was.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { groupSelectionOptions } from './selectionGroups';
import {
  PICKER_PAGE_SIZE,
  filterPickerOptions,
  initialActive,
  moveActive,
  openingTab,
  openingView,
  optionsInTab,
  orderByGroup,
  pickerListHeight,
  PICKER_LIST_MAX,
  revealScrollTop,
  shouldOpenUpward,
  visibleBounds,
  type PickerOption,
} from './pickerModel';
import { toUpperGreek } from '../../utils/greekUppercase';

export interface PickerTab {
  id: string;
  label: string;
  testId?: string;
}

interface Props {
  T: ThemeTokens;
  options: PickerOption[];
  selectedIds: string[];
  /** A pick. In `multiple` mode it is a toggle and the panel stays open. */
  onSelect: (id: string) => void;
  multiple?: boolean;
  /** Shows a clear (×) button on the trigger while something is chosen. */
  onClear?: () => void;
  placeholder: string;
  searchPlaceholder?: string;
  /** The wording to search on when the panel opens, used only if it matches something. */
  initialQuery?: string | null;
  /** Shown on the trigger when the chosen record is not one of `options`. */
  selectedLabel?: { title: string; subtitle?: string | null } | null;
  /** Trigger text in `multiple` mode. Defaults to the chosen titles. */
  summary?: string;
  tabs?: PickerTab[];
  /** Pinned under the list, e.g. "Add a new site". A click in it closes the panel. */
  footer?: React.ReactNode;
  /** Shown when the list (or the current tab) has nothing at all in it. */
  emptyLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  /**
   * Opens the panel by itself, once, as soon as the picker is usable - for the
   * one choice a card is waiting on. Waits out `disabled`, because a card
   * arriving mid-reply is disabled until the stream ends.
   */
  autoOpen?: boolean;
  testId?: string;
  ariaLabel?: string;
}

/** The nearest ancestor that scrolls vertically: in the chat, `.vai-body`. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

export default function PickerDropdown({
  T, options, selectedIds, onSelect, multiple, onClear, placeholder, searchPlaceholder,
  initialQuery, selectedLabel, summary, tabs, footer, emptyLabel, disabled, invalid, autoOpen, testId, ariaLabel,
}: Props) {
  const { t } = useTranslation();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<string | null>(() => openingTab(tabs, options, selectedIds));
  const [shown, setShown] = useState(PICKER_PAGE_SIZE);
  const [active, setActive] = useState(-1);
  const [upward, setUpward] = useState(false);
  const [listMax, setListMax] = useState(PICKER_LIST_MAX);

  const inTab = useMemo(() => optionsInTab(options, tab), [options, tab]);
  const matches = useMemo(() => orderByGroup(filterPickerOptions(inTab, query)), [inTab, query]);
  const visible = useMemo(() => matches.slice(0, shown), [matches, shown]);
  const groups = useMemo(() => groupSelectionOptions(visible), [visible]);
  // `visible` is already in group order, so a row's position in it is its
  // position on screen — which is what the arrow keys count in.
  const indexOf = useMemo(() => new Map(visible.map((option, i) => [option.id, i])), [visible]);
  const remaining = matches.length - visible.length;

  const chosen = options.filter((option) => selectedIds.includes(option.id));
  // A row with no subtitle of its own shows its section instead, so a product
  // type on the trigger still says which category it is under.
  const single = chosen[0]
    ? { title: chosen[0].title, subtitle: chosen[0].subtitle ?? chosen[0].group ?? null }
    : selectedIds.length > 0 ? selectedLabel ?? null : null;
  const hasValue = multiple ? chosen.length > 0 : single !== null;

  const close = (refocus = false) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const openPanel = () => {
    if (disabled) return;
    const { tab: startTab, query: startQuery } = openingView(tabs, options, selectedIds, initialQuery);
    const rows = orderByGroup(filterPickerOptions(optionsInTab(options, startTab), startQuery));
    const trigger = triggerRef.current;
    if (trigger) {
      const scroller = scrollParent(trigger);
      const bounds = visibleBounds(scroller ? scroller.getBoundingClientRect() : null, window.innerHeight);
      const rect = trigger.getBoundingClientRect();
      const up = shouldOpenUpward(rect, bounds);
      setUpward(up);
      setListMax(pickerListHeight(rect, bounds, up));
    }
    setTab(startTab);
    setQuery(startQuery);
    setShown(Math.max(PICKER_PAGE_SIZE, initialActive(rows, selectedIds) + 1));
    setActive(initialActive(rows, selectedIds));
    setOpen(true);
  };

  // Once only: closing it is an answer, and reopening on the next render would
  // overrule it.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!autoOpen || disabled || autoOpened.current) return;
    autoOpened.current = true;
    openPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, disabled]);

  // Focus the search box once, when the panel opens. No scrollIntoView here:
  // it scrolls every scrollable ancestor, so opening a picker low in the chat
  // dragged the whole conversation (MS3-399). Which way the panel opens is
  // what keeps it on screen.
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  // A click anywhere outside closes it, the way every other dropdown behaves.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (wrapRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Keep the keyboard's row on screen as the arrows move it, by scrolling the
  // list itself. Never scrollIntoView: that would scroll the chat too.
  useEffect(() => {
    if (!open || active < 0) return;
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    if (!list || !row) return;
    const box = list.getBoundingClientRect();
    const header = row.parentElement?.querySelector<HTMLElement>('[data-group-header]');
    const next = revealScrollTop(
      row.getBoundingClientRect(),
      { top: box.top, bottom: box.top + list.clientHeight, scrollTop: list.scrollTop },
      header?.offsetHeight ?? 0,
    );
    if (next !== null) list.scrollTop = next;
  }, [active, open]);

  const resetPaging = () => {
    setShown(PICKER_PAGE_SIZE);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    resetPaging();
    setActive(initialActive(orderByGroup(filterPickerOptions(inTab, next)), []));
  };

  const changeTab = (next: string) => {
    setTab(next);
    resetPaging();
    setActive(initialActive(orderByGroup(filterPickerOptions(optionsInTab(options, next), query)), selectedIds));
    searchRef.current?.focus({ preventScroll: true });
  };

  const choose = (option: PickerOption) => {
    if (option.disabled) return;
    onSelect(option.id);
    if (!multiple) close(true);
  };

  const onSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = active < 0 ? initialActive(visible, []) : moveActive(visible, active, delta);
      // Arrowing off the last drawn row draws the next page rather than stopping.
      if (delta === 1 && next === active && remaining > 0) setShown((count) => count + PICKER_PAGE_SIZE);
      setActive(next);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = visible[active];
      if (row) choose(row);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  };

  const onListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (remaining > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      setShown((count) => count + PICKER_PAGE_SIZE);
    }
  };

  /* --- the trigger -------------------------------------------------------- */

  const triggerText = (() => {
    if (multiple) {
      if (chosen.length === 0) return null;
      return summary ?? chosen.map((option) => option.title).join(', ');
    }
    return single;
  })();

  const borderColor = open ? T.ac : invalid && !hasValue ? '#DC2626' : T.bd;
  const enabledCount = options.filter((option) => !option.disabled).length;

  return (
    <div
      ref={wrapRef}
      data-testid={testId}
      style={{ position: 'relative', width: '100%' }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close(true);
        }
      }}
      onBlur={(event) => {
        // Tabbing out closes it. A click that lands on nothing focusable inside
        // the panel has no relatedTarget and must not.
        const next = event.relatedTarget as Node | null;
        if (open && next && !wrapRef.current?.contains(next)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openPanel();
          }
        }}
        className="flex items-center w-full text-left rounded-lg"
        style={{
          minHeight: 38, padding: '5px 10px', gap: 8,
          paddingRight: onClear && hasValue && !disabled ? 58 : 32,
          border: `1px solid ${borderColor}`,
          boxShadow: open ? `0 0 0 3px ${T.al}` : invalid && !hasValue ? '0 0 0 1px rgba(220,38,38,0.25)' : undefined,
          background: T.bg,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color .12s, box-shadow .12s',
        }}
      >
        <span className="min-w-0 flex-1" style={{ overflow: 'hidden' }}>
          {triggerText === null ? (
            <span className="block truncate" style={{ fontSize: 13, color: T.t3 }}>{placeholder}</span>
          ) : typeof triggerText === 'string' ? (
            <span className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{triggerText}</span>
          ) : (
            <>
              <span className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{triggerText.title}</span>
              {triggerText.subtitle && (
                <span className="block truncate" style={{ fontSize: 11, color: T.t3 }}>{triggerText.subtitle}</span>
              )}
            </>
          )}
        </span>
        {multiple && chosen.length > 0 && (
          <span
            className="flex-shrink-0"
            style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: T.ac, borderRadius: 999, padding: '1px 7px' }}
          >
            {chosen.length}
          </span>
        )}
        {!hasValue && enabledCount > 0 && (
          <span className="flex-shrink-0" style={{ fontSize: 11, color: T.t3 }}>
            {t('vagonai.picker.available', { count: enabledCount })}
          </span>
        )}
      </button>

      {/* Siblings of the trigger rather than children: a button inside a
          button is invalid markup and the inner one never gets the click. */}
      {onClear && hasValue && !disabled && (
        <button
          type="button"
          onClick={() => {
            onClear();
            triggerRef.current?.focus({ preventScroll: true });
          }}
          aria-label={t('vagonai.picker.clear')}
          title={t('vagonai.picker.clear')}
          className="flex items-center justify-center rounded-md"
          style={{
            position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)',
            width: 22, height: 22, color: T.t3, background: 'transparent', border: 0, cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      )}
      <ChevronDown
        size={16}
        aria-hidden="true"
        style={{
          position: 'absolute', right: 10, top: '50%', pointerEvents: 'none',
          transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`,
          transition: 'transform .15s', color: open ? T.ac : T.t3,
        }}
      />

      {/* --- the panel ----------------------------------------------------- */}
      {open && (
        <div
          ref={panelRef}
          className="rounded-xl"
          onMouseDown={(event) => {
            // Keep focus in the search box when the click lands on plain text.
            if (!(event.target as HTMLElement).closest('input,button')) event.preventDefault();
          }}
          style={{
            position: 'absolute', left: 0, right: 0, zIndex: 40,
            ...(upward ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
            border: `1px solid ${T.bd}`, background: T.sf,
            boxShadow: '0 12px 32px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.08)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}
        >
          {tabs && tabs.length > 0 && (
            <div className="flex" role="tablist" style={{ gap: 4, padding: '8px 8px 0' }}>
              {tabs.map((option) => {
                const on = tab === option.id;
                const count = filterPickerOptions(optionsInTab(options, option.id), query).length;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    data-testid={option.testId}
                    onClick={() => changeTab(option.id)}
                    className="rounded-md"
                    style={{
                      flex: 1, fontSize: 11.5, fontWeight: 650, padding: '5px 8px',
                      border: `1px solid ${on ? T.ac : T.bd}`,
                      background: on ? T.al : 'transparent',
                      color: on ? T.ac : T.t2, cursor: 'pointer',
                    }}
                  >
                    {option.label} <span style={{ opacity: 0.75 }}>({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ padding: 8, borderBottom: `1px solid ${T.bd}` }}>
            <div
              className="flex items-center rounded-lg"
              style={{ border: `1px solid ${T.bd}`, background: T.bg, padding: '0 8px', gap: 6 }}
            >
              <Search size={14} style={{ color: T.t3, flexShrink: 0 }} aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                onKeyDown={onSearchKey}
                placeholder={searchPlaceholder ?? t('vagonai.picker.search')}
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                style={{
                  flex: 1, minWidth: 0, height: 34, fontSize: 13, color: T.t1,
                  border: 0, outline: 'none', background: 'transparent',
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    changeQuery('');
                    searchRef.current?.focus({ preventScroll: true });
                  }}
                  aria-label={t('vagonai.picker.clearSearch')}
                  style={{ display: 'flex', color: T.t3, background: 'transparent', border: 0, cursor: 'pointer', padding: 2 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            onScroll={onListScroll}
            style={{ maxHeight: listMax, overflowY: 'auto', padding: '4px 0' }}
          >
            {matches.length === 0 ? (
              <div style={{ padding: '14px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: T.t3 }}>
                  {query.trim()
                    ? t('vagonai.picker.noMatch', { term: query.trim() })
                    : emptyLabel ?? t('vagonai.picker.empty')}
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      changeQuery('');
                      searchRef.current?.focus({ preventScroll: true });
                    }}
                    style={{ marginTop: 6, fontSize: 12, fontWeight: 650, color: T.ac, background: 'none', border: 0, cursor: 'pointer' }}
                  >
                    {t('vagonai.picker.clearSearch')}
                  </button>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.name ?? '__none'} role="group" aria-label={group.name ?? undefined}>
                  {group.name !== null && (
                    <div
                      data-group-header
                      style={{
                        position: 'sticky', top: -4, zIndex: 1, background: T.sf,
                        padding: '7px 12px 4px', fontSize: 10.5, fontWeight: 700,
                        letterSpacing: '0.05em', color: T.t3,
                      }}
                    >
                      {toUpperGreek(group.name)}
                    </div>
                  )}
                  {group.options.map((option) => {
                    const idx = indexOf.get(option.id) ?? -1;
                    const on = selectedIds.includes(option.id);
                    const lit = idx === active;
                    return (
                      <div
                        key={option.id}
                        id={`${listId}-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={on}
                        aria-disabled={option.disabled || undefined}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseMove={() => !option.disabled && idx !== active && setActive(idx)}
                        onClick={() => choose(option)}
                        className="flex items-center"
                        style={{
                          gap: 9, margin: '0 4px', padding: '7px 8px', borderRadius: 8,
                          background: lit ? T.sa : on ? T.al : 'transparent',
                          opacity: option.disabled ? 0.45 : 1,
                          cursor: option.disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {multiple && (
                          <span
                            aria-hidden="true"
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: 16, height: 16, borderRadius: 4,
                              border: `1.5px solid ${on ? T.ac : T.bd}`,
                              background: on ? T.ac : 'transparent', color: '#fff',
                            }}
                          >
                            {on && <Check size={11} strokeWidth={3} />}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block" style={{ fontSize: 13, fontWeight: 600, color: on ? T.ac : T.t1, wordBreak: 'break-word' }}>
                            {option.title}
                          </span>
                          {option.subtitle && (
                            <span className="block" style={{ fontSize: 11, color: T.t3, wordBreak: 'break-word' }}>{option.subtitle}</span>
                          )}
                        </span>
                        {option.badge && (
                          <span
                            className="flex-shrink-0"
                            style={{ fontSize: 10, fontWeight: 700, color: T.t3, border: `1px solid ${T.bd}`, borderRadius: 5, padding: '1px 5px' }}
                          >
                            {option.badge}
                          </span>
                        )}
                        {!multiple && on && <Check size={15} className="flex-shrink-0" style={{ color: T.ac }} />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Always says how much of the list is on screen. This is what tells
              the shipper there is more, and that the search will reach it. */}
          {(matches.length > 0 || multiple) && (
            <div
              className="flex items-center justify-between"
              style={{ gap: 8, padding: '6px 10px', borderTop: `1px solid ${T.bd}`, background: T.sa, fontSize: 11, color: T.t3 }}
            >
              <span>
                {remaining > 0
                  ? t('vagonai.picker.showing', { shown: visible.length, total: matches.length })
                  : query.trim()
                    ? t('vagonai.picker.matches', { count: matches.length })
                    : t('vagonai.picker.total', { count: matches.length })}
              </span>
              <span className="flex items-center" style={{ gap: 10 }}>
                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setShown((count) => count + PICKER_PAGE_SIZE)}
                    style={{ fontSize: 11.5, fontWeight: 700, color: T.ac, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                  >
                    {t('vagonai.picker.showMore', { count: Math.min(PICKER_PAGE_SIZE, remaining) })}
                  </button>
                )}
                {multiple && (
                  <button
                    type="button"
                    onClick={() => close(true)}
                    className="rounded-md"
                    style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: T.ac, border: 0, cursor: 'pointer', padding: '3px 10px' }}
                  >
                    {t('vagonai.picker.done')}
                  </button>
                )}
              </span>
            </div>
          )}

          {footer && (
            <div style={{ padding: 8, borderTop: `1px solid ${T.bd}` }} onClick={() => close()}>
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
