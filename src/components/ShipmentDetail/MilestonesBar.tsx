import React from 'react';
import type { ShipmentDetailViewModel } from '../../pages/ShipmentDetail/detailViewModel';

interface MilestonesBarProps {
  vm: ShipmentDetailViewModel;
  lang?: 'en' | 'el';
  onExceptionClick?: (target: string) => void;
}

export const MilestonesBar: React.FC<MilestonesBarProps> = ({
  vm,
  lang = 'en',
  onExceptionClick,
}) => {
  return (
    <div
      className="rounded-2xl px-5 py-4 mb-4"
      style={{ background: '#FFFFFF', border: '1px solid #E4E4E8' }}
    >
      <div className="flex items-center w-full overflow-x-auto overflow-y-visible pb-1 pt-4">
        {vm.milestones.map((ms, idx) => {
          const isFirst = idx === 0;
          const label = lang === 'el' ? ms.labelEl : ms.labelEn;
          const tooltip = ms.time || (ms.state === 'skip' ? 'Not reached yet' : 'In progress');

          let dotBg = '#E4E4E8';
          let dotShadow = 'none';
          let labelColor = '#8E8E9A';

          if (ms.state === 'done') {
            dotBg = '#10B981';
            labelColor = '#18181B';
          } else if (ms.state === 'cur') {
            dotBg = '#9B51E0';
            dotShadow = '0 0 0 4px #F3E8FF';
            labelColor = '#18181B';
          }

          if (isFirst) {
            return (
              <div
                key={ms.key}
                className="flex items-center"
                style={{ flex: '0 0 auto', minWidth: 72 }}
              >
                <div
                  className="relative flex flex-col items-center px-1 flex-shrink-0 group cursor-default"
                  style={{ minWidth: 72 }}
                >
                  <span
                    className="rounded-full"
                    style={{ width: 11, height: 11, background: dotBg, boxShadow: dotShadow }}
                    aria-hidden="true"
                  />
                  <span
                    className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap z-20"
                    style={{
                      background: '#18181B',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,.2)',
                    }}
                    role="tooltip"
                  >
                    {tooltip}
                  </span>
                  <span
                    className="mt-1.5 text-[10px] font-semibold text-center"
                    style={{ color: labelColor }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            );
          }

          // Subsequent steps have a preceding line
          const prevMs = vm.milestones[idx - 1];
          const lineBg = prevMs.state === 'done' ? '#10B981' : '#E4E4E8';

          return (
            <div
              key={ms.key}
              className="flex items-center"
              style={{ flex: '1 1 0%', minWidth: 96 }}
            >
              <span
                className="relative flex-1 group cursor-default"
                style={{ minWidth: 20, padding: '6px 0' }}
              >
                <span className="block" style={{ height: 2, background: lineBg }} aria-hidden="true" />
                <span
                  className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap z-20"
                  style={{
                    background: '#18181B',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,.2)',
                  }}
                  role="tooltip"
                >
                  {prevMs.state === 'done' ? 'Completed' : 'Pending'}
                </span>
              </span>

              <div
                className="relative flex flex-col items-center px-1 flex-shrink-0 group cursor-default"
                style={{ minWidth: 72 }}
              >
                <span
                  className="rounded-full"
                  style={{ width: 11, height: 11, background: dotBg, boxShadow: dotShadow }}
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap z-20"
                  style={{
                    background: '#18181B',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,.2)',
                  }}
                  role="tooltip"
                >
                  {tooltip}
                </span>
                <span
                  className="mt-1.5 text-[10px] font-semibold text-center"
                  style={{ color: labelColor }}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {vm.exceptionChips && vm.exceptionChips.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {vm.exceptionChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onExceptionClick?.(chip.target)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
            >
              <span>⚠️</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
