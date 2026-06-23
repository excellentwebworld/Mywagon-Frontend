import * as Yup from 'yup';
import type { LocationFormValues } from './locationFormSchema';
import { locationEditValidationSchema } from './locationFormSchema';

export type EditStepErrors = Partial<Record<keyof LocationFormValues, string>>;

function mapYupErrors(err: unknown): EditStepErrors {
  if (!Yup.ValidationError.isError(err)) return {};
  const errors: EditStepErrors = {};
  for (const inner of err.inner) {
    const path = inner.path as keyof LocationFormValues | undefined;
    if (path && !errors[path]) errors[path] = inner.message;
  }
  if (err.path && !errors[err.path as keyof LocationFormValues]) {
    errors[err.path as keyof LocationFormValues] = err.message;
  }
  return errors;
}

const STEP_FIELDS: Record<number, (keyof LocationFormValues)[]> = {
  1: ['type'],
  2: ['name', 'address', 'city', 'lat', 'lng', 'role'],
  3: ['dock', 'maxTruck', 'maxWeight', 'loadTime', 'appt', 'timeRanges'],
};

export async function validateEditStep(
  step: number,
  values: LocationFormValues
): Promise<EditStepErrors> {
  const fields = STEP_FIELDS[step];
  if (!fields?.length) return {};

  try {
    await locationEditValidationSchema.pick(fields).validate(values, {
      abortEarly: false,
    });
    return {};
  } catch (err) {
    return mapYupErrors(err);
  }
}
