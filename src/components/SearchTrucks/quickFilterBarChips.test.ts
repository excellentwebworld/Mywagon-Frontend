import { describe, expect, it } from 'vitest';
import {
  QUICK_FILTER_CHIPS,
  getVisibleQuickFilterChips,
} from './QuickFilterBar';

describe('Search Trucks Quick Filter Chips Capability Gating', () => {
  it('defines standard and premium chips correctly', () => {
    expect(QUICK_FILTER_CHIPS).toHaveLength(4);
    const hasBids = QUICK_FILTER_CHIPS.find((c) => c.key === 'has_bids');
    const loadMatch = QUICK_FILTER_CHIPS.find((c) => c.key === 'load_match');
    const today = QUICK_FILTER_CHIPS.find((c) => c.key === 'today');
    const soon8h = QUICK_FILTER_CHIPS.find((c) => c.key === 'soon8h');

    expect(today?.premium).toBeFalsy();
    expect(soon8h?.premium).toBeFalsy();
    expect(hasBids?.premium).toBe(true);
    expect(hasBids?.requiresBidsCount).toBe(true);
    expect(loadMatch?.premium).toBe(true);
    expect(loadMatch?.requiresExactMatches).toBe(true);
  });

  it('hides premium chips when account lacks both capabilities (Essential / Free tier)', () => {
    const visible = getVisibleQuickFilterChips(false, false);
    const keys = visible.map((c) => c.key);
    expect(keys).toEqual(['today', 'soon8h']);
    expect(keys).not.toContain('has_bids');
    expect(keys).not.toContain('load_match');
  });

  it('shows has_bids chip only when canViewBidsCount is granted', () => {
    const visible = getVisibleQuickFilterChips(true, false);
    const keys = visible.map((c) => c.key);
    expect(keys).toEqual(['today', 'soon8h', 'has_bids']);
    expect(keys).toContain('has_bids');
    expect(keys).not.toContain('load_match');
  });

  it('shows load_match chip only when canViewExactMatches is granted', () => {
    const visible = getVisibleQuickFilterChips(false, true);
    const keys = visible.map((c) => c.key);
    expect(keys).toEqual(['today', 'soon8h', 'load_match']);
    expect(keys).not.toContain('has_bids');
    expect(keys).toContain('load_match');
  });

  it('shows all chips when both capabilities are granted (Plus / Enterprise tier)', () => {
    const visible = getVisibleQuickFilterChips(true, true);
    const keys = visible.map((c) => c.key);
    expect(keys).toEqual(['today', 'soon8h', 'has_bids', 'load_match']);
  });
});
