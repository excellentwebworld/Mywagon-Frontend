import { describe, expect, it, vi } from 'vitest';
import * as fx from './fixtures/intakeFixtures';
import { canMeasureRouteFor, measureIntakeRoute, measureIntakeRouteInfo, routeForFinish, routeKeyOf, routePointsOf } from './intakeRoute';

const withPoints = (points: unknown) => ({ ...fx.summaryComplete({ routeNeeded: true }), route: { points } }) as never;
const ATHENS = { lat: 37.98, lng: 23.72 };
const IOANNINA = { lat: 39.66, lng: 20.85 };

describe('routePointsOf / canMeasureRouteFor', () => {
  it('reads the optional route.points; absent ⇒ cannot measure (Publish stays off with its reason)', () => {
    expect(routePointsOf(fx.summaryComplete({ routeNeeded: true }))).toBeNull();
    expect(canMeasureRouteFor(fx.summaryComplete({ routeNeeded: true }))).toBe(false);
  });
  it('needs two or more real positions', () => {
    expect(canMeasureRouteFor(withPoints([ATHENS, IOANNINA]))).toBe(true);
    expect(canMeasureRouteFor(withPoints([ATHENS]))).toBe(false);
    expect(canMeasureRouteFor(withPoints([]))).toBe(false);
  });
  it('a stop with no position makes the whole route unmeasurable — never a shorter route through the known stops', () => {
    expect(canMeasureRouteFor(withPoints([ATHENS, null, IOANNINA]))).toBe(false);
    expect(canMeasureRouteFor(withPoints([ATHENS, { lat: 'x', lng: 1 }]))).toBe(false);
    expect(canMeasureRouteFor(withPoints([ATHENS, { lat: NaN, lng: 1 }]))).toBe(false);
  });
});

describe('measureIntakeRoute', () => {
  it('turns measureRoute\'s answer into the routeSummary R5 wants (§6.7)', async () => {
    const measure = vi.fn().mockResolvedValue({ totalDistKm: 413, totalDriveMin: 318, usedGoogle: true });
    const out = await measureIntakeRoute(withPoints([ATHENS, IOANNINA]), measure);
    expect(out).toEqual({ total_dist_km: 413, total_drive_min: 318 });
    expect(measure).toHaveBeenCalledWith([ATHENS, IOANNINA]);
  });
  it('is null — and does not measure — without positions', async () => {
    const measure = vi.fn();
    expect(await measureIntakeRoute(fx.summaryComplete({ routeNeeded: true }), measure)).toBeNull();
    expect(await measureIntakeRoute(withPoints([ATHENS, null]), measure)).toBeNull();
    expect(measure).not.toHaveBeenCalled();
  });
  it('a zero distance is no distance (MYVAGON refuses it); a throw is null', async () => {
    expect(await measureIntakeRoute(withPoints([ATHENS, IOANNINA]), async () => ({ totalDistKm: 0, totalDriveMin: 0, usedGoogle: false }))).toBeNull();
    expect(await measureIntakeRoute(withPoints([ATHENS, IOANNINA]), async () => { throw new Error('maps down'); })).toBeNull();
  });
});

describe('routeForFinish — what goes with Save as draft / Publish now (§18.3)', () => {
  const route = { total_dist_km: 413, total_drive_min: 318 };
  const needs = fx.summaryComplete({ routeNeeded: true, withRoute: true });
  const noRoute = fx.summaryComplete({ routeNeeded: false });

  it('nothing is measured when the summary does not need a route', async () => {
    const measure = vi.fn();
    expect(await routeForFinish(noRoute, 'publish', measure, () => true)).toEqual({ blocked: false });
    expect(measure).not.toHaveBeenCalled();
  });
  it('Publish sends the measured route', async () => {
    expect(await routeForFinish(needs, 'publish', async () => route, () => true)).toEqual({ routeSummary: route, blocked: false });
  });
  it('Publish is blocked when the route cannot be measured: no measurer, no positions, or a failed measurement', async () => {
    expect((await routeForFinish(needs, 'publish', undefined, undefined)).blocked).toBe(true);
    expect((await routeForFinish(needs, 'publish', async () => route, () => false)).blocked).toBe(true);
    expect((await routeForFinish(needs, 'publish', async () => null, () => true)).blocked).toBe(true);
    expect((await routeForFinish(needs, 'publish', async () => { throw new Error('x'); }, () => true)).blocked).toBe(true);
  });
  it('Save as draft is NEVER blocked by the route — it just goes without one', async () => {
    expect(await routeForFinish(needs, 'save_draft', undefined, undefined)).toEqual({ blocked: false });
    expect(await routeForFinish(needs, 'save_draft', async () => null, () => true)).toEqual({ blocked: false });
    expect(await routeForFinish(needs, 'save_draft', async () => { throw new Error('x'); }, () => true)).toEqual({ blocked: false });
  });
  it('Save as draft sends the route when it can be measured', async () => {
    expect(await routeForFinish(needs, 'save_draft', async () => route, () => true)).toEqual({ routeSummary: route, blocked: false });
  });
});

describe('usedGoogle is the helper\'s, not the contract\'s (§19.8)', () => {
  it('flags a straight-line estimate for the UI and never puts the flag in the routeSummary', async () => {
    const info = await measureIntakeRouteInfo(withPoints([ATHENS, IOANNINA]), async () => ({ totalDistKm: 330, totalDriveMin: 330, usedGoogle: false }));
    expect(info).toEqual({ route: { total_dist_km: 330, total_drive_min: 330 }, estimated: true });
    expect(Object.keys(info!.route).sort()).toEqual(['total_dist_km', 'total_drive_min']);
    const real = await measureIntakeRouteInfo(withPoints([ATHENS, IOANNINA]), async () => ({ totalDistKm: 413, totalDriveMin: 318, usedGoogle: true }));
    expect(real?.estimated).toBe(false);
    expect(await measureIntakeRoute(withPoints([ATHENS, IOANNINA]), async () => ({ totalDistKm: 330, totalDriveMin: 330, usedGoogle: false }))).toEqual({ total_dist_km: 330, total_drive_min: 330 });
  });
  it('the same stops have the same key; an unmeasurable set has none', () => {
    expect(routeKeyOf(withPoints([ATHENS, IOANNINA]))).toBe(routeKeyOf(withPoints([ATHENS, IOANNINA])));
    expect(routeKeyOf(withPoints([ATHENS, IOANNINA]))).not.toBe(routeKeyOf(withPoints([IOANNINA, ATHENS])));
    expect(routeKeyOf(withPoints([ATHENS, null]))).toBeNull();
    expect(routeKeyOf(fx.summaryComplete({ routeNeeded: true }))).toBeNull();
  });
  it('a label on a point is accepted and ignored by the measurement (§19.9)', () => {
    expect(routePointsOf(withPoints([{ ...ATHENS, label: 'Athens DC' }, IOANNINA]))).toEqual([ATHENS, IOANNINA]);
  });
  it('contract.ts has no usedGoogle', () => {
    const src = Object.values(import.meta.glob('./contract.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0]!;
    expect(src.length).toBeGreaterThan(1000);
    expect(src).not.toMatch(/usedGoogle/);
  });
});
