import { describe, expect, it } from 'vitest';
import type { LocationItem } from '../../context/AppContext';
import { buildStickyCreateForceTool, type StickyOrderRow } from './StickyOrdersPanel';
import { measureStickyLanes, pointForLocation, stickyLanesToMeasure } from './stickyRouteMeasure';
import type { ErpDraftLocationSeed } from './seedDraftFromErpOrder';

const loc = (id: string, lat: number, lng: number) => ({ id, lat, lng }) as unknown as LocationItem;
const book = [loc('11', 37.98, 23.72), loc('loc-22', 40.64, 22.94), loc('33', 0, 0)];
const seed = (orderId: string, pickup?: string, delivery?: string): ErpDraftLocationSeed => ({
  orderId,
  orderReference: `REF-${orderId}`,
  shipFrom: '',
  shipTo: '',
  ...(pickup ? { pickup: { locationId: pickup, locationName: pickup } } : {}),
  ...(delivery ? { delivery: { locationId: delivery, locationName: delivery } } : {}),
});

describe('sticky Create route measurement', () => {
  it('places only geocoded Address Book locations', () => {
    expect(pointForLocation('11', book)).toEqual({ lat: 37.98, lng: 23.72 });
    expect(pointForLocation('22', book)).toEqual({ lat: 40.64, lng: 22.94 });
    expect(pointForLocation('33', book)).toBeNull();
    expect(pointForLocation('99', book)).toBeNull();
  });

  it('measures each distinct lane once and skips lanes it cannot place', () => {
    const lanes = stickyLanesToMeasure(
      [seed('1', '11', '22'), seed('2', '11', '22'), seed('3', '11', '33'), seed('4', '11')],
      book,
    );
    expect(lanes.map((l) => l.stopLocationIds)).toEqual([['11', '22']]);
  });

  it('returns keyed summaries and drops failed or zero measurements', async () => {
    const out = await measureStickyLanes([seed('1', '11', '22')], book, async () => ({
      totalDistKm: 512,
      totalDriveMin: 372,
      usedGoogle: true,
    }));
    expect(out).toEqual([{ stop_location_ids: ['11', '22'], total_dist_km: 512, total_drive_min: 372 }]);
    const none = await measureStickyLanes([seed('1', '11', '22')], book, async () => ({
      totalDistKm: 0,
      totalDriveMin: 0,
      usedGoogle: false,
    }));
    expect(none).toEqual([]);
    const slow = await measureStickyLanes([seed('1', '11', '22')], book, () => new Promise(() => {}), 10);
    expect(slow).toEqual([]);
  });

  it('carries route_summaries on the forceTool only when measured', () => {
    const row = { id: '7' } as StickyOrderRow;
    const summaries = [{ stop_location_ids: ['11', '22'], total_dist_km: 512 }];
    expect(buildStickyCreateForceTool([row]).forceTool.arguments).toEqual({ order_id: '7' });
    expect(buildStickyCreateForceTool([row], summaries).forceTool.arguments).toEqual({
      order_id: '7',
      route_summaries: summaries,
    });
    expect(buildStickyCreateForceTool([row, { id: '8' } as StickyOrderRow], summaries).forceTool.arguments).toEqual({
      order_ids: ['7', '8'],
      async: true,
      route_summaries: summaries,
    });
  });
});