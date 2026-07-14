import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const T = {
  sf: 'var(--surface)',
  sa: 'var(--surface-alt)',
  bd: 'var(--border)',
};

const sk = {
  baseColor: T.sa,
  highlightColor: T.sf,
};

const CHIP_WIDTHS = [72, 88, 80, 76, 68] as const;

/** Loading placeholder matching Step 3 RHS vehicle type cards. */
export const RhsVehicleTypesSkeleton: React.FC<{ cards?: number }> = ({ cards = 2 }) => (
  <div className="csw-rhs-veh border-b" style={{ borderColor: T.bd }} aria-busy="true">
    <div className="ch flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: T.bd }}>
      <Skeleton circle width={16} height={16} {...sk} />
      <Skeleton width={100} height={14} {...sk} />
    </div>
    <div className="px-4 py-3 space-y-2.5">
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          className="csw-rhs-veh__card"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent) 35%, var(--border))',
            background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
            boxShadow: 'none',
          }}
        >
          <div
            className="absolute"
            style={{ top: 8, right: 8 }}
            aria-hidden
          >
            <Skeleton circle width={18} height={18} {...sk} />
          </div>
          <div className="csw-rhs-veh__head">
            <Skeleton circle width={28} height={28} {...sk} />
            <Skeleton width={i === 0 ? 140 : 120} height={12} {...sk} />
          </div>
          <div className="csw-rhs-veh__specs">
            {CHIP_WIDTHS.slice(0, i === 0 ? 5 : 4).map((w) => (
              <Skeleton key={w} width={w} height={22} borderRadius={6} {...sk} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default RhsVehicleTypesSkeleton;
