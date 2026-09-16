import { describe, expect, it } from 'vitest';
import { mapSubFilter } from './BillingPage';

describe('mapSubFilter', () => {
  it('maps kpi filters properly with high precedence', () => {
    expect(mapSubFilter('All', 'outstanding')).toEqual({ status: 'unpaid' });
    expect(mapSubFilter('All', 'overdue')).toEqual({ status: 'overdue' });
    expect(mapSubFilter('All', 'dueSoon')).toEqual({ status: 'due_soon' });
    expect(mapSubFilter('All', 'paid')).toEqual({ status: 'paid' });
  });

  it('maps sub-filter status keys correctly', () => {
    expect(mapSubFilter('Unpaid', null)).toEqual({ status: 'unpaid' });
    expect(mapSubFilter('Overdue', null)).toEqual({ status: 'overdue' });
    expect(mapSubFilter('Paid', null)).toEqual({ status: 'paid' });
  });

  it('maps sub-filter type keys correctly', () => {
    expect(mapSubFilter('Subscription', null)).toEqual({ type: 'subscription' });
    expect(mapSubFilter('Commission', null)).toEqual({ type: 'commission' });
    expect(mapSubFilter('Commission with penalty', null)).toEqual({ type: 'commission_with_penalty' });
    expect(mapSubFilter('Penalty', null)).toEqual({ type: 'commission_with_penalty' });
    expect(mapSubFilter('Add-on', null)).toEqual({ type: 'add-on' });
  });

  it('defaults to status: all for unhandled or All sub-filter', () => {
    expect(mapSubFilter('All', null)).toEqual({ status: 'all' });
  });
});
