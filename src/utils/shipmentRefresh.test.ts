import { describe, expect, it } from 'vitest';
import { privateLoadMissingCarriers } from './shipmentRefresh';

describe('privateLoadMissingCarriers', () => {
  it('is true for a private pending load with no invitees', () => {
    expect(privateLoadMissingCarriers({ status: 'pending', vis: 'private', invitees: [], invited: 0 })).toBe(true);
  });

  it('is false once a carrier is listed or the load is public', () => {
    expect(privateLoadMissingCarriers({ status: 'pending', vis: 'private', invited: 2 })).toBe(false);
    expect(privateLoadMissingCarriers({ status: 'pending', channel: 'public', vis: 'public' })).toBe(false);
    expect(privateLoadMissingCarriers({ status: 'draft', vis: 'private' })).toBe(false);
  });
});