import { useMemo } from 'react';

export interface Conflict {
  code: string;
  severity: 'blocker' | 'warning' | 'info';
  stopIndex: number;
  lineIndex: number;
  message: string;
  resolution: string;
}

export default function useConflicts(stops: any[], options: any = {}) {
  const {
    locations = [],
    loadingPoints = [],
    blackouts = [],
    products = [],
    orders = [],
    templates = [],
    rules = [],
  } = options;

  return useMemo(() => {
    const conflicts: Conflict[] = [];
    const add = (
      code: string,
      severity: 'blocker' | 'warning' | 'info',
      stopIdx: number,
      lineIdx: number,
      message: string,
      resolution: string
    ) => {
      conflicts.push({ code, severity, stopIndex: stopIdx, lineIndex: lineIdx, message, resolution });
    };

    if (!stops || stops.length === 0) return empty();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ═══ X — STRUCTURE ═══
    if (stops.length < 2) {
      add(
        'X1',
        'blocker',
        -1,
        -1,
        'Less than 2 stops — need at least one pickup and one dropoff',
        'Add at least 2 stops'
      );
    }

    const allLines = stops.flatMap((s, si) => (s.lines || []).map((l: any) => ({ ...l, stopIndex: si })));
    const prodLines = allLines.filter((l) => l.productId);
    const hasPickup = prodLines.some((l) => l.action === 'pickup');
    const hasDropoff = prodLines.some((l) => l.action === 'dropoff');
    if (prodLines.length > 0) {
      if (hasPickup && !hasDropoff) {
        add('X2', 'blocker', -1, -1, 'All cargo lines are pickups — nothing is being delivered', 'Add at least one dropoff');
      }
      if (hasDropoff && !hasPickup) {
        add('X3', 'blocker', -1, -1, 'All cargo lines are dropoffs — nothing is being collected', 'Add at least one pickup');
      }
    }

    // ═══ PER-STOP ═══
    stops.forEach((stop, si) => {
      // L1
      if (!stop.locationId) {
        add('L1', 'blocker', si, -1, `Stop ${si + 1}: No location selected`, 'Select a location');
      }
      // L2
      if (si > 0 && stop.locationId && stop.locationId === stops[si - 1].locationId) {
        add(
          'L2',
          'warning',
          si,
          -1,
          `Stop ${si + 1}: Same location as Stop ${si} (${stop.locationName})`,
          'Merge into one stop or verify'
        );
      }
      // L4
      if (stop.locationId && locations.length > 0) {
        const loc = locations.find((l: any) => l.id === stop.locationId);
        if (loc && loc.status !== 'active') {
          add('L4', 'blocker', si, -1, `Stop ${si + 1}: "${stop.locationName}" is inactive`, 'Select an active location');
        }
      }

      // D1
      if (!stop.dateFrom && stop.appointmentMode === 'fixed') {
        add('D1', 'blocker', si, -1, `Stop ${si + 1}: No FROM date set`, 'Set a date');
      }
      // D2
      if (stop.dateFrom && stop.appointmentMode === 'fixed') {
        const sd = new Date(stop.dateFrom);
        sd.setHours(0, 0, 0, 0);
        if (sd < today) {
          add('D2', 'blocker', si, -1, `Stop ${si + 1}: Date ${stop.dateFrom} is in the past`, 'Select a future date');
        }
      }
      // D4
      if (stop.dateFrom && stop.dateTo && stop.appointmentMode === 'fixed') {
        const f = new Date(`${stop.dateFrom}T${stop.timeFrom || '00:00'}`);
        const t2 = new Date(`${stop.dateTo}T${stop.timeTo || '23:59'}`);
        if (t2 < f) {
          add('D4', 'blocker', si, -1, `Stop ${si + 1}: TO is before FROM`, 'Adjust TO to be after FROM');
        }
      }
      // D3 — Chronological order
      if (si > 0) {
        const prevStart =
          stops[si - 1].appointmentMode === 'self_scheduling'
            ? stops[si - 1].windowStart
            : stops[si - 1].dateFrom
            ? `${stops[si - 1].dateFrom}T${stops[si - 1].timeFrom || '00:00'}`
            : null;
        const currStart =
          stop.appointmentMode === 'self_scheduling'
            ? stop.windowStart
            : stop.dateFrom
            ? `${stop.dateFrom}T${stop.timeFrom || '00:00'}`
            : null;
        if (prevStart && currStart && new Date(currStart) < new Date(prevStart)) {
          add('D3', 'blocker', si, -1, `Stop ${si + 1}: Start is before Stop ${si}`, 'Fix chronological order');
        }
      }
      // D5 — Overlap
      if (si > 0) {
        const prevEnd =
          stops[si - 1].appointmentMode === 'self_scheduling'
            ? stops[si - 1].windowEnd
            : stops[si - 1].dateTo
            ? `${stops[si - 1].dateTo}T${stops[si - 1].timeTo || '23:59'}`
            : null;
        const currStart =
          stop.appointmentMode === 'self_scheduling'
            ? stop.windowStart
            : stop.dateFrom
            ? `${stop.dateFrom}T${stop.timeFrom || '00:00'}`
            : null;
        if (prevEnd && currStart && new Date(currStart) < new Date(prevEnd)) {
          add(
            'D5',
            'blocker',
            si,
            -1,
            `Stop ${si + 1}: Overlaps with Stop ${si} — end of Stop ${si} must be before start of Stop ${si + 1}`,
            "Adjust dates so stops don't overlap"
          );
        }
      }
      // D7
      if (stop.appointmentMode === 'self_scheduling' && (!stop.windowStart || !stop.windowEnd)) {
        add('D7', 'blocker', si, -1, `Stop ${si + 1}: Self-scheduling but no date window`, 'Set from/to dates');
      }
      // D8
      if (stop.appointmentMode === 'self_scheduling' && stop.windowStart && stop.windowEnd) {
        const h = (new Date(stop.windowEnd).getTime() - new Date(stop.windowStart).getTime()) / 36e5;
        if (h < 24) {
          add('D8', 'warning', si, -1, `Stop ${si + 1}: Scheduling window < 24h`, 'Widen the window');
        }
      }

      // C1
      const pLines = (stop.lines || []).filter((l: any) => l.productId);
      if (pLines.length === 0) {
        add('C1', 'blocker', si, -1, `Stop ${si + 1}: No cargo — add at least one product`, 'Add a cargo line');
      }

      // Per-line
      (stop.lines || []).forEach((ln: any, li: number) => {
        if (!ln.productId && !ln.qty) return;
        if (!ln.productId && (ln.qty || ln.weight)) {
          add('C2', 'blocker', si, li, `Stop ${si + 1}, line ${li + 1}: Qty set but no product`, 'Select a product');
        }
        if (ln.productId && (!ln.qty || parseFloat(ln.qty) <= 0)) {
          add('C3', 'blocker', si, li, `Stop ${si + 1}, line ${li + 1}: ${ln.productName || 'Product'} has zero qty`, 'Enter qty > 0');
        }
        if (ln.action === 'dropoff' && ln.productId && !ln.customerId) {
          add('O1', 'warning', si, li, `Stop ${si + 1}, line ${li + 1}: Dropoff of ${ln.productName || 'product'} has no customer`, 'Assign a customer');
        }
      });

      // S1 — Blackout
      if (stop.dateFrom && stop.locationId && blackouts.length > 0) {
        const hit = blackouts.find(
          (b: any) =>
            b.locationId === stop.locationId &&
            stop.dateFrom >= b.dateFrom &&
            stop.dateFrom <= (b.dateTo || b.dateFrom)
        );
        if (hit) {
          add('S1', 'blocker', si, -1, `Stop ${si + 1}: Blackout period (${hit.reason})`, 'Choose a different date');
        }
      }

      // S2 — Outside operating hours
      if (stop.timeFrom && stop.locationId && stop.appointmentMode === 'fixed') {
        const hour = parseInt(stop.timeFrom);
        const lpAtLoc = loadingPoints.filter((lp: any) => lp.locationId === stop.locationId && lp.active);
        if (lpAtLoc.length > 0) {
          let covered = false;
          lpAtLoc.forEach((lp: any) => {
            const tpl = templates.find((t: any) => t.loadingPointId === lp.id && t.active);
            const rs = tpl ? rules.filter((r: any) => r.templateId === tpl.id) : [];
            rs.forEach((r: any) => {
              if (hour >= parseInt(r.startTime) && hour < parseInt(r.endTime)) covered = true;
            });
          });
          if (!covered) {
            add('S2', 'warning', si, -1, `Stop ${si + 1}: Time ${stop.timeFrom} outside operating hours`, 'Check schedule config');
          }
        }
      }
    });

    // L3
    if (
      stops.length >= 2 &&
      stops[0].locationId &&
      stops[stops.length - 1].locationId &&
      stops[0].locationId === stops[stops.length - 1].locationId &&
      stops.length === 2
    ) {
      add(
        'L3',
        'warning',
        -1,
        -1,
        'First and last stop are the same location',
        'Add intermediate stops or verify'
      );
    }

    // L5
    const countries = new Set(stops.filter((s) => s.locationCountry).map((s) => s.locationCountry));
    if (countries.size > 1) {
      add(
        'L5',
        'info',
        -1,
        -1,
        `Route crosses borders (${[...countries].join(', ')}) — prepare customs docs`,
        'Add customs reference'
      );
    }

    // ═══ C4 — SKU-level balance ═══
    const skuP: Record<string, number> = {};
    const skuD: Record<string, number> = {};
    const skuN: Record<string, string> = {};
    stops.forEach((s) =>
      (s.lines || []).forEach((l: any) => {
        if (!l.productId || !l.qty) return;
        const q = parseFloat(l.qty) || 0;
        if (l.action === 'pickup') {
          skuP[l.productId] = (skuP[l.productId] || 0) + q;
        } else {
          skuD[l.productId] = (skuD[l.productId] || 0) + q;
        }
        skuN[l.productId] = l.productName;
      })
    );
    const allSkus = new Set([...Object.keys(skuP), ...Object.keys(skuD)]);
    allSkus.forEach((id) => {
      const p = skuP[id] || 0;
      const d = skuD[id] || 0;
      const nm = skuN[id] || id;
      if (p > 0 && d > 0 && p !== d) {
        add(
          'C4',
          'warning',
          -1,
          -1,
          `${nm}: ${p} picked up vs ${d} dropped off (${Math.abs(p - d)} ${
            p > d ? 'remain on truck' : 'over-delivered'
          })`,
          'Match pickup and dropoff per SKU'
        );
      }
      if (p > 0 && d === 0) {
        add('X4', 'warning', -1, -1, `${nm}: ${p} picked up but never dropped off`, 'Add a dropoff for this product');
      }
    });

    // C5 — Dropoff before pickup (per SKU)
    const skuFirstPick: Record<string, number> = {};
    stops.forEach((s, si) =>
      (s.lines || []).forEach((l: any) => {
        if (l.action === 'pickup' && l.productId && !(l.productId in skuFirstPick)) {
          skuFirstPick[l.productId] = si;
        }
      })
    );
    stops.forEach((s, si) =>
      (s.lines || []).forEach((l: any, li: number) => {
        if (l.action !== 'dropoff' || !l.productId) return;
        const fp = skuFirstPick[l.productId];
        if (fp === undefined) {
          add(
            'C5',
            'blocker',
            si,
            li,
            `Stop ${si + 1}: ${l.productName || 'Product'} dropped off but never picked up`,
            'Add a pickup at an earlier stop'
          );
        } else if (si <= fp) {
          add(
            'C5',
            'blocker',
            si,
            li,
            `Stop ${si + 1}: ${l.productName || 'Product'} dropped off before pickup (Stop ${fp + 1})`,
            'Reorder stops'
          );
        }
      })
    );

    // C6 + C9 — Running weight
    let rw = 0;
    stops.forEach((s, si) => {
      (s.lines || []).forEach((l: any) => {
        if (!l.productId) return;
        const w = parseFloat(l.weight) || 0;
        rw += l.action === 'pickup' ? w : -w;
      });
      if (rw > 28000) {
        add(
          'C6',
          'warning',
          si,
          -1,
          `After Stop ${si + 1}: ${(rw / 1000).toFixed(1)}t on truck — exceeds 28t`,
          'Reduce cargo or split loads'
        );
      }
      if (rw < -0.01) {
        add('C9', 'blocker', si, -1, `After Stop ${si + 1}: Negative weight (${(rw / 1000).toFixed(1)}t)`, 'Check quantities');
      }
    });

    // C7 — ADR mixed
    if (products.length > 0) {
      const pids = prodLines.filter((l) => l.action === 'pickup').map((l) => l.productId);
      const adr = pids.some((id) => products.find((p: any) => p.id === id)?.adr);
      const noAdr = pids.some((id) => {
        const p = products.find((pr: any) => pr.id === id);
        return p && !p.adr;
      });
      if (adr && noAdr) {
        add('C7', 'warning', -1, -1, 'ADR + non-ADR goods on same load', 'Verify compatibility or split');
      }
    }
    // C8 — Temp conflict
    if (products.length > 0) {
      const pids = prodLines.filter((l) => l.action === 'pickup').map((l) => l.productId);
      const temp = pids.some((id) => products.find((p: any) => p.id === id)?.tempControlled);
      const amb = pids.some((id) => {
        const p = products.find((pr: any) => pr.id === id);
        return p && !p.tempControlled;
      });
      if (temp && amb) {
        add('C8', 'warning', -1, -1, 'Temp-controlled + ambient goods on same load', 'Verify reefer compatibility');
      }
    }

    // O2 — Duplicate order ref
    const ors = prodLines.filter((l) => l.orderId).map((l) => l.orderId);
    const dups = ors.filter((v, i, a) => a.indexOf(v) !== i);
    if (dups.length) {
      add('O2', 'warning', -1, -1, `Duplicate order ref: ${[...new Set(dups)].join(', ')}`, 'Verify intentional');
    }

    // O3 — Order already shipped
    if (orders.length > 0) {
      prodLines.forEach((l) => {
        if (!l.orderId) return;
        const o = orders.find((x: any) => x.id === l.orderId);
        if (o && (o.status === 'shipped' || o.status === 'completed')) {
          add(
            'O3',
            'warning',
            l.stopIndex,
            -1,
            `Order ${l.orderRef || l.orderId} is ${o.status} — additional qty?`,
            'Verify'
          );
        }
      });
    }

    // S4 — Loading side compatibility
    if (loadingPoints.length > 0) {
      stops.forEach((s, si) => {
        if (!s.locationId) return;
        const dropLines = s.lines.filter((l: any) => l.action === 'dropoff' && l.productId);
        if (!dropLines.length) return;
        const dLPs = loadingPoints.filter((lp: any) => lp.locationId === s.locationId && lp.active);
        const rearOnly = dLPs.length > 0 && dLPs.every((lp: any) => lp.type === 'dock_ramp');
        if (!rearOnly) return;
        dropLines.forEach((dl: any) => {
          const pickStop = stops.find((ps, psi) =>
            psi < si && ps.lines.some((pl: any) => pl.productId === dl.productId && pl.action === 'pickup')
          );
          if (!pickStop) return;
          const pLPs = loadingPoints.filter((lp: any) => lp.locationId === pickStop.locationId && lp.active);
          if (pLPs.length > 0 && !pLPs.some((lp: any) => lp.type === 'dock_ramp')) {
            add(
              'S4',
              'warning',
              si,
              -1,
              `Stop ${si + 1}: ${dl.productName || 'Product'} needs rear unloading but was side-loaded at ${
                pickStop.locationName
              }`,
              'Verify loading compatibility'
            );
          }
        });
      });
    }

    // Build
    const blockers = conflicts.filter((c) => c.severity === 'blocker');
    const warnings = conflicts.filter((c) => c.severity === 'warning');
    const infos = conflicts.filter((c) => c.severity === 'info');
    const byStop: Record<number, Conflict[]> = {};
    conflicts.forEach((c) => {
      if (c.stopIndex >= 0) {
        if (!byStop[c.stopIndex]) byStop[c.stopIndex] = [];
        byStop[c.stopIndex].push(c);
      }
    });
    return {
      blockers,
      warnings,
      infos,
      all: conflicts,
      byStop,
      hasBlockers: blockers.length > 0,
      total: conflicts.length,
    };
  }, [stops, locations, loadingPoints, blackouts, products, orders, templates, rules]);
}

function empty() {
  return { blockers: [], warnings: [], infos: [], all: [], byStop: {}, hasBlockers: false, total: 0 };
}
