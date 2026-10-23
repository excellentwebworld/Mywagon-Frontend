/** Resolve API media paths to a browser-loadable URL. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }

  const trimmed = url.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `${window.location.protocol}${trimmed}`;
  }

  const base = (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ?? '';

  if (trimmed.startsWith('/')) {
    return base ? `${base}${trimmed}` : trimmed;
  }

  return trimmed;
}

export function userAvatarUrl(
  profilePicture: string | null | undefined,
  firstName?: string | null,
  lastName?: string | null
): string | null {
  const resolved = resolveMediaUrl(profilePicture);
  if (resolved) {
    return resolved;
  }

  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  if (!name) {
    return null;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&color=9B51E0`;
}
