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
    expect(mapSubFilter('unpaid', null)).toEqual({ status: 'unpaid' });
    expect(mapSubFilter('overdue', null)).toEqual({ status: 'overdue' });
    expect(mapSubFilter('paid', null)).toEqual({ status: 'paid' });
  });

  it('maps sub-filter type keys correctly', () => {
    expect(mapSubFilter('subscription', null)).toEqual({ type: 'subscription' });
    expect(mapSubFilter('commission-with-penalty', null)).toEqual({ type: 'commission-with-penalty' });
    expect(mapSubFilter('add-on', null)).toEqual({ type: 'add-on' });
  });

  it('defaults to status: all for unhandled or All sub-filter', () => {
    expect(mapSubFilter('All', null)).toEqual({ status: 'all' });
  });
});
