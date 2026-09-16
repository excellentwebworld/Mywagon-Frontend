export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 5000;

export function mapSupportFieldValidationError(field: string, message: string): string {
  const normalized = message.toLowerCase();

  if (field === 'title' && (normalized.includes('255') || normalized.includes('greater') || normalized.includes('characters'))) {
    return 'title_too_long';
  }

  if (field === 'description' && (normalized.includes('5000') || normalized.includes('greater') || normalized.includes('characters'))) {
    return 'description_too_long';
  }

  if (normalized.includes('required')) {
    return 'required';
  }

  return 'invalid';
}

export function validateSupportField(field: string, value: string): string | null {
  const trimmed = (value || '').trim();
  if (field === 'type' || field === 'category') {
    return trimmed ? null : 'required';
  }
  if (field === 'title') {
    if (!trimmed) return 'required';
    if (trimmed.length > MAX_TITLE_LENGTH) return 'title_too_long';
    return null;
  }
  if (field === 'description') {
    if (!trimmed) return 'required';
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) return 'description_too_long';
    return null;
  }
  return null;
}
