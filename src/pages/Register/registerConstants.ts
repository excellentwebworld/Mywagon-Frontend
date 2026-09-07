export const HEAR_ABOUT_OPTIONS = [
  'Facebook Ad',
  'Instagram Ad',
  'Linkedin Ad',
  'Google Search',
  'Email Marketing',
  'Friend/Colleague Word of Mouth',
  'Carrier Partner',
  'Shipper Colleague',
  'Other',
] as const;

export function laravelAssetBase(): string {
  return (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ?? '';
}

export function termsUrl(type: 'shipper' | 'carrier' | 'driver', lang: string): string {
  const base = laravelAssetBase();
  return `${base}/terms-condition/terms_and_conditions/${type}/${lang}`;
}

export function privacyUrl(type: 'shipper' | 'carrier' | 'driver', lang: string): string {
  const base = laravelAssetBase();
  return `${base}/privacy-policy/privacy_policy/${type}/${lang}`;
}

export function sampleDocUrl(): string {
  const base = laravelAssetBase();
  return `${base}/sample_documents/sample_documents.pdf`;
}

export function signupVideoUrl(): string {
  // Same stock video used on Laravel shipper register (relative CDN path via Laravel AWS_URL is
  // not available here; fall back to known staging CDN if env unset).
  const aws = (import.meta.env.VITE_AWS_URL as string | undefined)?.replace(/\/$/, '');
  if (aws) return `${aws}/stock-video-sign-up-shipper-no-mockup.mp4`;
  return '';
}

export function appendIfPresent(fd: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;
  if (value instanceof File) {
    fd.append(key, value);
    return;
  }
  if (typeof value === 'boolean') {
    fd.append(key, value ? '1' : '0');
    return;
  }
  fd.append(key, String(value));
}
