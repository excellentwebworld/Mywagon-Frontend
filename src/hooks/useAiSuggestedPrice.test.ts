import { describe, expect, it } from 'vitest';
import { extractAiPriceDenied } from './useAiSuggestedPrice';
import { ApiError } from '../api/client';

describe('extractAiPriceDenied', () => {
  it('returns null for non-403 errors', () => {
    expect(extractAiPriceDenied(new Error('Network error'))).toBeNull();
    expect(extractAiPriceDenied(new ApiError('Bad request', 400))).toBeNull();
    expect(extractAiPriceDenied(null)).toBeNull();
  });

  it('defaults upgradeUrl to /subscription when no upgrade_url provided in payload', () => {
    const error = new ApiError('AI Suggested Price is not available on your plan.', 403);
    const denied = extractAiPriceDenied(error);

    expect(denied).toEqual({
      message: 'AI Suggested Price is not available on your plan.',
      upgradeUrl: '/subscription',
    });
  });

  it('normalizes legacy blade /shipper/subscription URLs to /subscription', () => {
    const error = new ApiError('Upgrade required', 403, undefined, {
      upgrade_url: 'https://app.myvagon.com/shipper/subscription/plan',
    });
    const denied = extractAiPriceDenied(error);

    expect(denied).toEqual({
      message: 'Upgrade required',
      upgradeUrl: '/subscription',
    });
  });

  it('preserves valid internal upgradeUrl', () => {
    const error = new ApiError('Upgrade to Plus', 403, undefined, {
      upgrade_url: '/subscription#addons',
    });
    const denied = extractAiPriceDenied(error);

    expect(denied).toEqual({
      message: 'Upgrade to Plus',
      upgradeUrl: '/subscription#addons',
    });
  });
});
