import { describe, expect, it } from 'vitest';
import { isAiCreatedDraft, toAiDraftIdSet } from './aiDrafts';

describe('MS3-338 AI draft identification', () => {
  const ids = toAiDraftIdSet([11, 12]);

  it('identifies a draft the gateway says it created', () => {
    expect(isAiCreatedDraft({ id: 11 }, ids)).toBe(true);
  });

  it('matches across the number/string boundary', () => {
    // The gateway returns numbers; the shipments list carries string ids.
    expect(isAiCreatedDraft({ id: '11' }, ids)).toBe(true);
  });

  it('does not claim a shipment the gateway never mentioned', () => {
    expect(isAiCreatedDraft({ id: 99 }, ids)).toBe(false);
  });

  it('treats an unknown id as not-AI rather than throwing', () => {
    expect(isAiCreatedDraft({}, ids)).toBe(false);
    expect(isAiCreatedDraft(null, ids)).toBe(false);
  });

  it('an empty set means nothing is an AI draft', () => {
    // The gateway being unreachable must not mark every row as AI.
    expect(isAiCreatedDraft({ id: 11 }, toAiDraftIdSet(null))).toBe(false);
  });
});
