import { describe, expect, it } from 'vitest';
import type { ShipperUser } from '../api/auth';
import { isWhatsNewPending } from './whatsNewVisibility';

function baseUser(overrides: Partial<ShipperUser> = {}): ShipperUser {
  return {
    id: 1,
    email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    company_name: 'Acme',
    type: 'shipper',
    locale: 'en',
    profile_picture: null,
    kyc_status: 'accepted',
    status: '1',
    is_sub_user: false,
    parent_shipper_id: null,
    company_address_complete: true,
    signup_complete: true,
    whats_new_revamp_seen: false,
    onboarding_completed: true,
    ...overrides,
  };
}

describe('isWhatsNewPending', () => {
  it('shows for primary when gates are clear and not yet seen', () => {
    expect(isWhatsNewPending(baseUser())).toBe(true);
  });

  it('hides for primary when already seen', () => {
    expect(isWhatsNewPending(baseUser({ whats_new_revamp_seen: true }))).toBe(false);
  });

  it('hides for primary when company KYC gate is active', () => {
    expect(isWhatsNewPending(baseUser({ kyc_status: 'pending' }))).toBe(false);
  });

  it('hides for primary when company address is incomplete', () => {
    expect(
      isWhatsNewPending(baseUser({ company_address_complete: false })),
    ).toBe(false);
  });

  it('shows for sub-user even when mirrored parent KYC is pending', () => {
    expect(
      isWhatsNewPending(
        baseUser({
          is_sub_user: true,
          type: 'sub_user',
          parent_shipper_id: 99,
          kyc_status: 'pending',
          onboarding_completed: false,
        }),
      ),
    ).toBe(true);
  });

  it('shows for sub-user even when mirrored parent address is incomplete', () => {
    expect(
      isWhatsNewPending(
        baseUser({
          is_sub_user: true,
          type: 'sub_user',
          parent_shipper_id: 99,
          company_address_complete: false,
        }),
      ),
    ).toBe(true);
  });

  it('hides for sub-user after they dismiss the guide', () => {
    expect(
      isWhatsNewPending(
        baseUser({
          is_sub_user: true,
          type: 'sub_user',
          parent_shipper_id: 99,
          whats_new_revamp_seen: true,
          kyc_status: 'pending',
        }),
      ),
    ).toBe(false);
  });
});
