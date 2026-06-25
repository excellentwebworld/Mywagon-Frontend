export const QTY_UNIT_OPTIONS = ['EUR Pallets', 'US Pallets', 'Boxes', 'Units','Big Bags'] as const;
export const WEIGHT_UNIT_OPTIONS = ['Tonnes', 'Kgs'] as const;

export type QtyUnit = (typeof QTY_UNIT_OPTIONS)[number];
export type WeightUnit = (typeof WEIGHT_UNIT_OPTIONS)[number];
