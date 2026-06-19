import type { FormikErrors, FormikTouched } from 'formik';
import type { LocationFormValues } from '../validation/locationFormSchema';

/** Field order used when scrolling to the first validation error. */
const EDIT_FIELD_ORDER: (keyof LocationFormValues)[] = [
  'name',
  'address',
  'lat',
  'lng',
  'city',
  'postalCode',
  'email',
  'role',
  'type',
  'dock',
  'maxTruck',
  'maxWeight',
  'loadTime',
  'timeRanges',
  'contacts',
];

const FIELD_SELECTORS: Partial<Record<keyof LocationFormValues, string>> = {
  name: '#edit-name',
  address: '#ab-address-input',
  lat: '#ab-address-input',
  lng: '#ab-address-input',
  city: '#edit-city',
  postalCode: '#edit-postal',
  email: '#edit-email',
  role: '#edit-role',
  type: '#edit-type',
  dock: '#edit-dock',
  maxTruck: '#edit-max-truck',
  maxWeight: '#edit-max-weight',
  loadTime: '#edit-load-time',
};

function resolveErrorField(errors: FormikErrors<LocationFormValues>): keyof LocationFormValues | null {
  for (const field of EDIT_FIELD_ORDER) {
    if (errors[field]) return field;
  }
  const firstKey = Object.keys(errors)[0] as keyof LocationFormValues | undefined;
  return firstKey ?? null;
}

export function scrollToFirstFormError(errors: FormikErrors<LocationFormValues>, modalBodySelector = '.ab-modal-body'): void {
  const field = resolveErrorField(errors);
  if (!field) return;

  const selector = FIELD_SELECTORS[field] ?? `[name="${field}"]`;
  const modalBody = document.querySelector(modalBodySelector);
  const target = modalBody?.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>(selector);

  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  window.requestAnimationFrame(() => {
    if (typeof target.focus === 'function' && target.tagName !== 'DIV') {
      target.focus({ preventScroll: true });
    }
  });
}

export function touchAllLocationFields(values: LocationFormValues): FormikTouched<LocationFormValues> {
  const touched = Object.fromEntries(Object.keys(values).map((key) => [key, true]));
  return touched as FormikTouched<LocationFormValues>;
}
