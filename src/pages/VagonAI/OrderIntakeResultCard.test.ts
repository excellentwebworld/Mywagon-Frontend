/**
 * MS3-337 — Review & create prompt / gap payload.
 */
import { describe, expect, it } from 'vitest';
import { buildReviewCreatePrompt } from './orderIntakeReviewCreate';

describe('buildReviewCreatePrompt', () => {
  it('lists products then locations and never invents ids', () => {
    const prompt = buildReviewCreatePrompt({
      products: [
        {
          kind: 'product',
          name: 'Widget X',
          sku: 'WX-1',
          role: null,
          orderReferences: ['ORD-1'],
          creatableViaWidget: true,
        },
      ],
      locations: [
        {
          kind: 'location',
          name: 'Berlin Hub',
          sku: null,
          role: 'dest',
          orderReferences: ['ORD-1'],
          creatableViaWidget: true,
        },
      ],
      customers: [
        {
          kind: 'customer',
          name: 'New Co',
          sku: null,
          role: null,
          orderReferences: ['ORD-3'],
          creatableViaWidget: false,
        },
      ],
    });

    expect(prompt).toContain('Review & create');
    expect(prompt).toContain('products first, then locations');
    expect(prompt).toContain('name: Widget X; sku: WX-1');
    expect(prompt).toContain('name: Berlin Hub (dest)');
    expect(prompt).toContain('no create_customer');
    expect(prompt).toContain('New Co');
    expect(prompt).not.toMatch(/id:\s*\d+/i);
    expect(prompt).toContain('requiresConfirmation');
  });
});
