import { describe, expect, it } from 'vitest';
import type { ApiStop } from '../../../api/types/createShipment';
import {
  buildDeliveryStopEmailRows,
  dedupeOrderEmailsAgainstStops,
  isValidTrackingEmail,
  normalizeStopTrackingEmails,
  normalizeStopTrackingEmailsAuto,
  stopTrackingEmailsPayload,
  userEditedStopTrackingEmails,
} from './stopTrackingEmails';
import {
  draftToFormValues,
  formValuesToStepThreePayload,
} from '../../../api/mappers/createShipmentMapper';
import { buildDefaultWizardValues } from '../types';
import { applyCarriedStep3Values, rememberStep3Values } from '../wizardCarry';

const stop = (id: string, locationId: string, action: 'pickup' | 'dropoff', orderId = ''): ApiStop => ({
  id,
  locationId,
  lines: [{ id: `l-${id}`, productId: '7', orderId, action, qty: '1', weight: '1' }],
});

const stops: ApiStop[] = [
  stop('s1', '10', 'pickup', 'ORD-1'),
  stop('s2', '20', 'dropoff', 'ORD-1'),
  stop('s3', '30', 'dropoff'),
  stop('s4', '40', 'dropoff'),
];

describe('MS3-414 stop receiver tracking emails', () => {
  it('reads the server maps, including an empty PHP map sent as []', () => {
    expect(normalizeStopTrackingEmails([])).toEqual({});
    expect(normalizeStopTrackingEmails({ s2: ['a@x.com'], s3: [] })).toEqual({ s2: ['a@x.com'], s3: [] });
    expect(normalizeStopTrackingEmailsAuto({ s2: { locationId: 20, emails: ['a@x.com'] } })).toEqual({
      s2: { locationId: '20', emails: ['a@x.com'] },
    });
  });

  it('builds one row per delivery stop, each with its own email, empty slot when none', () => {
    const rows = buildDeliveryStopEmailRows(
      stops,
      { s2: ['receiver.a@example.com'], s3: [] },
      { s2: { locationId: '20', emails: ['receiver.a@example.com'] } }
    );
    expect(rows.map((r) => [r.stopId, r.stopIndex, r.emails, r.fromAddressBook])).toEqual([
      ['s2', 1, ['receiver.a@example.com'], true],
      ['s3', 2, [''], false],
      ['s4', 3, [''], false],
    ]);
  });

  it('marks a row as edited once it differs from the Address Book pre-fill', () => {
    const [row] = buildDeliveryStopEmailRows(
      [stops[1]],
      { s2: ['other@example.com'] },
      { s2: { locationId: '20', emails: ['receiver.a@example.com'] } }
    );
    expect(row.fromAddressBook).toBe(false);
  });

  it('sends only stops the form has an entry for; an emptied stop is sent as []', () => {
    expect(
      stopTrackingEmailsPayload(stops, {
        s2: [' receiver.a@example.com ', 'RECEIVER.A@example.com', '', 'typo@'],
        s3: [''],
        gone: ['ghost@example.com'],
      })
    ).toEqual({ s2: ['receiver.a@example.com'], s3: [] });
  });

  it('validates addresses the way the server will', () => {
    expect(isValidTrackingEmail('a.b@example.co')).toBe(true);
    expect(isValidTrackingEmail('a@b')).toBe(false);
    expect(isValidTrackingEmail('a@b.com, c@d.com')).toBe(false);
  });

  it('hides an order email only when every delivery stop of that order already sends to it', () => {
    const split: ApiStop[] = [...stops, stop('s5', '50', 'dropoff', 'ORD-1')];
    const orders = { 'ORD-1': ['buyer@example.com', 'Receiver.A@example.com'] };

    expect(dedupeOrderEmailsAgainstStops(orders, { s2: ['receiver.a@example.com'] }, stops)).toEqual({
      'ORD-1': ['buyer@example.com'],
    });
    // Split delivery: s5 does not send to it, so the order keeps it.
    expect(dedupeOrderEmailsAgainstStops(orders, { s2: ['receiver.a@example.com'] }, split)).toBe(orders);
  });

  it('round-trips through the draft mapper and the step-3 payload', () => {
    const defaults = buildDefaultWizardValues('SID-1') as Parameters<typeof draftToFormValues>[1];
    const values = draftToFormValues(
      {
        auto_id: 'SID-1',
        wizard_state: {
          stops,
          trackingEmails: { 'ORD-1': ['buyer@example.com', 'receiver.a@example.com'] },
          stopTrackingEmails: { s2: ['receiver.a@example.com'], s3: [] },
          stopTrackingEmailsAuto: { s2: { locationId: '20', emails: ['receiver.a@example.com'] } },
        },
      },
      defaults
    );

    expect(values.stopTrackingEmails).toEqual({ s2: ['receiver.a@example.com'], s3: [] });
    expect(values.trackingEmails).toEqual({ 'ORD-1': ['buyer@example.com'] });

    const payload = formValuesToStepThreePayload(values, 'partial');
    expect(payload.stop_tracking_emails).toEqual({ s2: ['receiver.a@example.com'], s3: [] });
    expect(payload.tracking_emails).toEqual({ 'ORD-1': ['buyer@example.com'] });
  });

  it('an older draft without stop emails sends none (server may still pre-fill)', () => {
    const defaults = buildDefaultWizardValues('SID-2') as Parameters<typeof draftToFormValues>[1];
    const values = draftToFormValues({ auto_id: 'SID-2', wizard_state: { stops } }, defaults);
    expect(values.stopTrackingEmails).toEqual({});
    expect(formValuesToStepThreePayload(values, 'partial').stop_tracking_emails).toEqual({});
  });

  it('carries only user-edited stop emails across a Step 3 remount', () => {
    const edited = userEditedStopTrackingEmails(
      { s2: ['receiver.a@example.com'], s3: ['typed@example.com'], s4: [] },
      { s2: { locationId: '20', emails: ['receiver.a@example.com'] } }
    );
    expect(edited).toEqual({ s3: ['typed@example.com'], s4: [] });

    const defaults = buildDefaultWizardValues('SID-3') as Parameters<typeof draftToFormValues>[1];
    const before = {
      ...defaults,
      stops,
      stopTrackingEmails: { s2: ['receiver.a@example.com'], s3: ['typed@example.com'] },
      stopTrackingEmailsAuto: { s2: { locationId: '20', emails: ['receiver.a@example.com'] } },
    };
    rememberStep3Values(99, false, before);

    // Step 1 changed s2's location: the server re-filled it with the new location's email.
    const reloaded = {
      ...defaults,
      stops,
      stopTrackingEmails: { s2: ['receiver.z@example.com'] },
      stopTrackingEmailsAuto: { s2: { locationId: '90', emails: ['receiver.z@example.com'] } },
    };
    const merged = applyCarriedStep3Values(99, false, reloaded, true);
    expect(merged.stopTrackingEmails).toEqual({
      s2: ['receiver.z@example.com'],
      s3: ['typed@example.com'],
    });
  });
});
