export const QTY_UNIT_OPTIONS = ['Pallets', 'Boxes', 'Pieces', 'Liters', 'Kg', 'Tons'] as const;
export const WEIGHT_UNIT_OPTIONS = ['T', 'Kg'] as const;

export type QtyUnit = (typeof QTY_UNIT_OPTIONS)[number];
export type WeightUnit = (typeof WEIGHT_UNIT_OPTIONS)[number];
