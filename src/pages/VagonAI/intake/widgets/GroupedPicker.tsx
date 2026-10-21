/**
 * The grouped list every WP3b picker draws: locations by company, products Category › Type › SKU, orders by customer,
 * partners. Groups are COLLAPSED until the shipper opens one (MS3-396), each with its true count (MS3-394), and scrolls in its own box (MS3-399); a group that is
 * itself a choice (a product TYPE) has its own "use this" button next to the chevron. Hook-free and controlled: the widget
 * that owns it owns `expanded`, the search and the selection — so it renders (and is tested) with no provider.
 * Row ids on the test hooks are record ids, never positions.
 */
import { Check, ChevronDown } from 'lucide-react';
import type { Row } from '../pickerTree';
import { countOf } from '../pickerTree';
import { chrome, type IntakeUi } from '../intakeUi';
import { TAP_CLASS } from '../tap';

/** MS3-396 + MS3-399: every list is collapsed by default AND scrolls inside its own box (it never grows the chat; nothing here calls scrollIntoView). */
export const LIST_MAX_HEIGHT = 320;

export function GroupedPicker({
  ui, testId, rows, selected = [], multiple = false, disabled, loadingKeys = [], emptyText, onToggleGroup, onPick,
}: {
  ui: IntakeUi; testId: string; rows: Row[];
  /** Ids already chosen (multi-select: ticked; single: highlighted). */
  selected?: readonly string[]; multiple?: boolean; disabled: boolean;
  /** Keys of groups whose rows are being fetched. */
  loadingKeys?: readonly string[];
  emptyText: string;
  onToggleGroup: (node: Row['node']) => void;
  onPick: (node: Row['node']) => void;
}) {
  const { T } = ui;
  if (rows.length === 0) {
    return <p data-testid={`${testId}-empty`} style={{ fontSize: 13, color: T.t3, padding: '10px 2px' }}>{emptyText}</p>;
  }
  return (
    <div className="vai-ik-list" role="list" data-testid={testId} style={{ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' }}>
      {rows.map(({ node, depth, open }) => {
        const pad = depth * 18;
        if (node.kind === 'group') {
          const count = countOf(node);
          const loading = loadingKeys.includes(node.key);
          const typeOn = selected.includes(node.id);
          return (
            <div key={node.key} role="listitem" className="flex items-center" style={{ gap: 6, paddingLeft: pad }}>
              <button
                type="button" disabled={disabled} aria-expanded={open} data-testid={`${testId}-group-${node.id}`} data-open={open ? 'true' : 'false'}
                onClick={() => onToggleGroup(node)}
                className={`vai-ik-group min-w-0 flex-1 ${TAP_CLASS}`}
              >
                <ChevronDown size={16} aria-hidden="true" style={{ color: T.t3, flexShrink: 0, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .12s' }} />
                <span className="min-w-0 flex-1" style={{ wordBreak: 'break-word' }}>{node.label}</span>
                <span className="vai-ik-count" data-testid={`${testId}-count-${node.id}`}>
                  {loading ? chrome(ui, 'pick.loading', 'Loading…') : count}
                </span>
              </button>
              {(node.selectable || node.typeDisabled === true) && (
                <button
                  type="button" disabled={disabled || node.typeDisabled === true} data-testid={`${testId}-pick-${node.id}`} data-selected={typeOn ? 'true' : 'false'}
                  aria-pressed={typeOn}
                  onClick={() => onPick(node)}
                  className={`vai-ik-chip flex-shrink-0 ${TAP_CLASS}`}
                  style={{ minHeight: 42, borderRadius: 10, color: typeOn ? undefined : T.ac }}
                >
                  {chrome(ui, 'pick.useType', 'Use this type')}
                </button>
              )}
            </div>
          );
        }
        const on = selected.includes(node.id);
        const dim = disabled || node.disabled === true;
        return (
          <div key={node.key} role="listitem" style={{ paddingLeft: pad }}>
            <button
              type="button" disabled={dim} onClick={() => onPick(node)}
              data-testid={`${testId}-opt-${node.id}`} data-selected={on ? 'true' : 'false'} aria-pressed={on}
              className={`vai-ik-opt ${TAP_CLASS}`}
            >
              {multiple && (
                <span aria-hidden="true" className="vai-ik-check">
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              )}
              <span className="min-w-0 flex-1" style={{ wordBreak: 'break-word' }}>
                {node.label}
                {node.subtitle && <span style={{ display: 'block', fontSize: 12.5, fontWeight: 400, color: T.t2, marginTop: 2 }}>{node.subtitle}</span>}
                {node.disabled && node.reason && <span style={{ display: 'block', fontSize: 12.5, fontWeight: 400, color: T.t3, marginTop: 2 }} data-testid={`${testId}-reason-${node.id}`}>{node.reason}</span>}
              </span>
              {node.badges && node.badges.length > 0 && node.badges[0] !== node.subtitle && (
                <span className="vai-ik-badge">{node.badges[0]}</span>
              )}
              {!multiple && on && <Check size={16} aria-hidden="true" className="flex-shrink-0" style={{ color: T.ac }} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
