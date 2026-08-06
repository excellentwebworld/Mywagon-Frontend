import type { ApiContractLaneMetric, ApiContractLanePricingRow } from '../types/partners';

export function hasDuplicateMetricRows(rows: ApiContractLanePricingRow[]): boolean {
  const seen = new Set<ApiContractLaneMetric>();
  for (const row of rows) {
    if (seen.has(row.metric)) {
      return true;
    }
    seen.add(row.metric);
  }
  return false;
}

export function deriveEffectiveKm(totalKmDirect: number, tripType: 'direct' | 'roundtrip'): number {
  return tripType === 'roundtrip' ? totalKmDirect * 2 : totalKmDirect;
}

export function classifyLaneType(stopsCount: number): 'simple' | 'multistop' {
  return stopsCount > 2 ? 'multistop' : 'simple';
}

export function metricToLegacyUnit(metric: ApiContractLaneMetric): 'load' | 'pallet' {
  return metric === 'unit_transport' ? 'pallet' : 'load';
}
