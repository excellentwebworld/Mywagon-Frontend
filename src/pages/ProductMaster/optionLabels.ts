/** Translate Product Master option values for display; keep English values for API storage. */

type TranslateFn = (key: string, fallback?: string) => string;

const UOM_LABEL_KEYS: Record<string, string> = {
  Case: 'productMaster.uomCase',
  Piece: 'productMaster.uomPiece',
  Bag: 'productMaster.uomBag',
  Box: 'productMaster.uomBox',
  Can: 'productMaster.uomCan',
  Pallet: 'productMaster.uomPallet',
};

const TEMP_LABEL_KEYS: Record<string, string> = {
  Ambient: 'productMaster.tempAmbient',
};

const PALLET_LABEL_KEYS: Record<string, string> = {
  Industrial: 'productMaster.palletIndustrial',
  Chemical: 'productMaster.palletChemical',
  Pharma: 'productMaster.palletPharma',
};

export function uomLabel(value: string, t: TranslateFn): string {
  const key = UOM_LABEL_KEYS[value];
  return key ? t(key, value) : value;
}

export function tempLabel(value: string, t: TranslateFn): string {
  const key = TEMP_LABEL_KEYS[value];
  return key ? t(key, value) : value;
}

export function palletLabel(value: string, t: TranslateFn): string {
  const key = PALLET_LABEL_KEYS[value];
  return key ? t(key, value) : value;
}

export function optionLabel(
  kind: 'uom' | 'temp' | 'pallet',
  value: string,
  t: TranslateFn
): string {
  if (kind === 'uom') return uomLabel(value, t);
  if (kind === 'temp') return tempLabel(value, t);
  return palletLabel(value, t);
}
