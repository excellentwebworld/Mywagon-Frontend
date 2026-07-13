import type { CSSProperties } from 'react';

/** Laravel shipper panel white/black PICKUP vs DROPOFF styling. */

export const STOP_COLOR = {
  pickupBg: '#FFFFFF',
  pickupFg: '#000000',
  dropoffBg: '#000000',
  dropoffFg: '#FFFFFF',
  shadow: '0px 3px 6px #00000029',
} as const;

export function isDropoffPin(hasPickup: boolean, hasDropoff: boolean): boolean {
  return hasDropoff;
}

export function pinColors(hasPickup: boolean, hasDropoff: boolean): {
  background: string;
  color: string;
} {
  if (isDropoffPin(hasPickup, hasDropoff)) {
    return { background: STOP_COLOR.dropoffBg, color: STOP_COLOR.dropoffFg };
  }
  return { background: STOP_COLOR.pickupBg, color: STOP_COLOR.pickupFg };
}

export function badgeStyle(kind: 'pickup' | 'dropoff'): CSSProperties {
  if (kind === 'dropoff') {
    return {
      background: STOP_COLOR.dropoffBg,
      color: STOP_COLOR.dropoffFg,
      boxShadow: STOP_COLOR.shadow,
    };
  }
  return {
    background: STOP_COLOR.pickupBg,
    color: STOP_COLOR.pickupFg,
    boxShadow: STOP_COLOR.shadow,
    border: '1px solid #E5E7EB',
  };
}

export function actionChipStyle(action: 'pickup' | 'dropoff' | string): CSSProperties {
  return badgeStyle(action === 'dropoff' ? 'dropoff' : 'pickup');
}

/** SVG data-URL icon for google.maps.Marker (Laravel-style numbered chip). */
export function numberedMarkerIconUrl(
  number: number,
  hasPickup: boolean,
  hasDropoff: boolean
): string {
  const { background, color } = pinColors(hasPickup, hasDropoff);
  const label = String(number);
  const width = label.length > 1 ? 32 : 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" viewBox="0 0 ${width} 28">
  <rect x="1" y="1" width="${width - 2}" height="26" rx="10" ry="10" fill="${background}" stroke="#E5E7EB" stroke-width="1" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.16))"/>
  <text x="${width / 2}" y="18" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="${color}">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
