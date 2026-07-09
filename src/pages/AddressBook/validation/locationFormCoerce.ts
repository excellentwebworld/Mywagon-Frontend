/** Coerce form/API values to strings so `.trim()` and Yup string rules never throw. */
export function coerceFormString(value: unknown): string {
  return value == null ? '' : String(value);
}
