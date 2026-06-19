import { addressBookService } from '../../../api';

export const DUPLICATE_LOCATION_MESSAGE =
  'A location with this name already exists for this company.';

export async function checkLocationDuplicate(
  locationName: string,
  companyName: string,
  excludeLocationId?: string
): Promise<boolean> {
  const name = locationName.trim();
  const company = companyName.trim();
  if (!name || !company) return false;

  const result = await addressBookService.checkDuplicate(name, company, excludeLocationId);
  return Boolean(result.duplicate);
}
