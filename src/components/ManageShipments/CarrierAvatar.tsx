import React, { useEffect, useMemo, useState } from 'react';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

type CarrierAvatarProps = {
  name?: string | null;
  initials?: string | null;
  avatar?: string | null;
  className?: string;
  size?: number;
};

function fallbackInitials(name?: string | null, initials?: string | null): string {
  if (initials?.trim()) return initials.trim().slice(0, 2).toUpperCase();
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CA';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Circular carrier/driver avatar — photo when available, initials fallback. */
export function CarrierAvatar({
  name,
  initials,
  avatar,
  className = 'carrier-av',
  size,
}: CarrierAvatarProps) {
  const url = useMemo(() => resolveMediaUrl(avatar), [avatar]);
  const [imgError, setImgError] = useState(false);
  const label = fallbackInitials(name, initials);

  useEffect(() => {
    setImgError(false);
  }, [url]);

  const style = size
    ? ({ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.4)) } as React.CSSProperties)
    : undefined;

  return (
    <span className={className} style={style} aria-hidden={!url || imgError}>
      {url && !imgError ? (
        <img src={url} alt="" onError={() => setImgError(true)} loading="lazy" />
      ) : (
        label
      )}
    </span>
  );
}
