import React, { useEffect, useRef } from 'react';
import {
  countForStatusTab,
  STATUS_TAB_PRIORITY,
  type StatusTabKey,
} from '../../pages/ManageShipments/utils/listingUtils';

interface StatusTabsProps {
  statusCounts: Record<string, number>;
  activeTab: StatusTabKey;
  onTabChange: (tab: StatusTabKey) => void;
  t: (key: string) => string;
}

const TAB_LABEL_KEYS: Record<StatusTabKey, string> = {
  active: 'tabActive',
  pending: 'tabPending',
  scheduled: 'tabScheduled',
  ready: 'tabReady',
  past_due: 'tabPastDue',
  on_trip: 'tabOnTrip',
  drafts: 'tabDraft',
  fullfilled: 'tabFulfilled',
  partially_fullfilled: 'tabPartiallyFulfilled',
  unfulfilled: 'tabUnfulfilled',
  cancelled: 'tabCanceled',
};

/** Matches classic Shipper Panel status bar order and labels. */
const TABS: { key: StatusTabKey; labelKey: string; warnCount?: boolean }[] =
  STATUS_TAB_PRIORITY.map((key) => ({
    key,
    labelKey: TAB_LABEL_KEYS[key],
    ...(key === 'active' ? { warnCount: true } : {}),
  }));

/** Fade the edge that has more tabs behind it, so the row reads as scrollable. */
function updateEdges(row: HTMLElement) {
  row.classList.toggle('more-left', row.scrollLeft > 1);
  row.classList.toggle('more-right', row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
}

/**
 * Scroll the row itself rather than calling scrollIntoView, which would also
 * scroll the page vertically.
 */
function keepActiveInView(row: HTMLElement) {
  const tab = row.querySelector<HTMLElement>('.stab.act');
  if (tab) {
    const FADE = 48; // keep the tab clear of the edge fade (manage.css)
    const left = tab.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft - FADE;
    const right = left + tab.offsetWidth + 2 * FADE;
    if (left < row.scrollLeft) row.scrollLeft = left;
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth;
  }
  updateEdges(row);
}

/** One row that scrolls sideways (MS3-359); the active tab is kept in view. */
export const StatusTabs: React.FC<StatusTabsProps> = ({
  statusCounts,
  activeTab,
  onTabChange,
  t,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  // A narrower row (window resize, sidebar toggle) must not leave the active tab off-screen.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const keep = () => keepActiveInView(row);
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', keep);
      return () => window.removeEventListener('resize', keep);
    }
    const observer = new ResizeObserver(keep);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (rowRef.current) keepActiveInView(rowRef.current);
  }, [activeTab, statusCounts]);

  // Choosing the tab that is already active brings it back into view.
  const choose = (key: StatusTabKey) => {
    if (key !== activeTab) onTabChange(key);
    else if (rowRef.current) keepActiveInView(rowRef.current);
  };

  return (
    <div className="stabs" ref={rowRef} onScroll={(e) => updateEdges(e.currentTarget)}>
      {TABS.map((tab) => {
        const count = countForStatusTab(statusCounts, tab.key);
        return (
          <div
            key={tab.key}
            className={`stab ${activeTab === tab.key ? 'act' : ''}`}
            onClick={() => choose(tab.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && choose(tab.key)}
          >
            {t(tab.labelKey)}
            <span className={`cnt ${tab.warnCount && activeTab === tab.key ? 'cw' : ''}`}>{count}</span>
          </div>
        );
      })}
    </div>
  );
};
