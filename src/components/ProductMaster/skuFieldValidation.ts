import * as Yup from 'yup';
import { UOM_OPTIONS } from '../../pages/ProductMaster/constants';
import { productMasterService } from '../../api/services/productMasterService';

export const SKU_NAME_MIN = 2;
export const SKU_NAME_MAX = 30;
export const SKU_NAME_NO_SPACE_PATTERN = /^\S+$/;
export const SKU_NUMBER_MIN = 3;
export const SKU_NUMBER_MAX = 30;
export const SKU_NUMBER_PATTERN = /^[A-Z0-9_-]+$/;
export const BARCODE_MAX_DIGITS = 14;
export const WEIGHT_MAX_KG = 50_000;
export const WEIGHT_MAX_DECIMALS = 3;
export const SKU_NUMBER_UNIQUE_DEBOUNCE_MS = 400;

export type TranslateFn = (key: string, fallback?: string) => string;

/** Normalize SKU number: trim, uppercase, strip invalid chars. */
export function normalizeSkuNumber(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

/** SKU name: no spaces/whitespace, hard-capped at 30 characters. */
export function sanitizeSkuNameInput(value: string): string {
  return value.replace(/\s/g, '').slice(0, SKU_NAME_MAX);
}

/** Keep only characters allowed while typing SKU number (auto-uppercase), max 30. */
export function sanitizeSkuNumberInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, SKU_NUMBER_MAX);
}

/** Digits only for barcode input; hard-capped at 14 digits. */
export function sanitizeBarcodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, BARCODE_MAX_DIGITS);
}

/**
 * Weight input: digits and a single decimal separator; blocks e/+/- and letters.
 * Allows comma as decimal separator while typing (normalized on validate).
 */
export function sanitizeWeightInput(value: string): string {
  const cleaned = value.replace(/[^0-9.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, sepIndex).replace(/[.,]/g, '');
  const fracPart = cleaned
    .slice(sepIndex + 1)
    .replace(/[.,]/g, '')
    .slice(0, WEIGHT_MAX_DECIMALS);
  return `${intPart}${cleaned[sepIndex]}${fracPart}`;
}

/** Optional barcode: digits only, max 14. */
export function isValidBarcode(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  const code = String(value).trim();
  if (!code) return true;
  return /^\d+$/.test(code) && code.length <= BARCODE_MAX_DIGITS;
}

export function isValidSkuWeight(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  const str = String(value).trim();
  if (!str) return true;
  if (/[eE+]/.test(str)) return false;
  const normalized = str.replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) return false;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 && n <= WEIGHT_MAX_KG;
}

/**
 * True when no other SKU uses this number.
 * When `excludeNumber` matches (edit same value), treat as unique.
 */
export async function isSkuNumberUnique(
  skuNumber: string,
  excludeNumber?: string
): Promise<boolean> {
  const normalized = normalizeSkuNumber(skuNumber);
  if (!normalized) return true;

  const exclude = excludeNumber ? normalizeSkuNumber(excludeNumber) : '';
  if (exclude && exclude === normalized) return true;

  try {
    const result = await productMasterService.listSkus({
      search: normalized,
      page: 1,
      per_page: 50,
    });
    return !result.items.some(
      (item) => normalizeSkuNumber(item.number ?? '') === normalized
    );
  } catch {
    // Don't block create if search/API is unavailable
    return true;
  }
}

export function createSkuValidationSchema(t: TranslateFn) {
  return Yup.object().shape({
    catId: Yup.string()
      .trim()
      .required(t('productMaster.categoryRequired', 'Category is required')),
    typeId: Yup.string()
      .trim()
      .required(t('productMaster.productTypeRequired', 'Please select a product type')),
    name: Yup.string()
      .required(t('productMaster.skuNameRequired', 'SKU Name is required'))
      .matches(
        SKU_NAME_NO_SPACE_PATTERN,
        t('productMaster.skuNameNoSpaces', 'SKU Name cannot contain spaces')
      )
      .min(
        SKU_NAME_MIN,
        t('productMaster.skuNameMin', 'SKU Name must be at least 2 characters')
      )
      .max(
        SKU_NAME_MAX,
        t('productMaster.skuNameMax', 'SKU Name must be at most 30 characters')
      ),
    number: Yup.string()
      .transform((v) => (typeof v === 'string' ? normalizeSkuNumber(v) : v))
      .required(t('productMaster.skuNumberRequired', 'SKU Number is required'))
      .min(
        SKU_NUMBER_MIN,
        t('productMaster.skuNumberMin', 'SKU Number must be at least 3 characters')
      )
      .max(
        SKU_NUMBER_MAX,
        t('productMaster.skuNumberMax', 'SKU Number must be at most 30 characters')
      )
      .matches(
        SKU_NUMBER_PATTERN,
        t(
          'productMaster.skuNumberFormat',
          'SKU Number may only contain A-Z, 0-9, hyphen and underscore'
        )
      ),
    barcode: Yup.string()
      .trim()
      .matches(
        /^\d*$/,
        t('productMaster.barcodeDigitsOnly', 'Barcode must contain digits only')
      )
      .max(
        BARCODE_MAX_DIGITS,
        t('productMaster.barcodeMax', 'Barcode must be at most 14 digits')
      ),
    uom: Yup.string()
      .trim()
      .required(t('productMaster.uomRequired', 'Unit of Measure is required'))
      .oneOf(
        [...UOM_OPTIONS],
        t('productMaster.uomInvalid', 'Please select a valid unit of measure')
      ),
    weight: Yup.string()
      .trim()
      .test(
        'weight-rules',
        t(
          'productMaster.weightInvalid',
          'Weight must be greater than 0, up to 3 decimals, max 50,000'
        ),
        (val) => isValidSkuWeight(val)
      ),
  });
}

export const skuValidationSchema = createSkuValidationSchema((_key, fallback) => fallback || _key);
