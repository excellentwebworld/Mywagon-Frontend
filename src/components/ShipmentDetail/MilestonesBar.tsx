import React, { useMemo } from 'react';
import type { Shipment } from '../../context/AppContext';
import {
  buildLaravelProgressSteps,
  type LaravelProgressStep,
} from '../../pages/ManageShipments/utils/listingUtils';

interface MilestonesBarProps {
  shipment: Shipment;
  t: (key: string, fallback?: string) => string;
  lang?: 'en' | 'el';
}

function stepStyle(step: LaravelProgressStep) {
  const isCur = step.state === 'cur';
  const isRed = step.state === 'pending';
  const isGreen = step.state === 'success';

  let dotBg = '#9B51E0';
  let ringClass = isCur ? 'ring-4 ring-[#9B51E0]/30 animate-pulse' : 'ring-3 ring-[#9B51E0]/15';
  let labelColor = isCur ? '#9B51E0' : '#18181B';

  if (isGreen) {
    dotBg = '#10B981';
    ringClass = isCur ? 'ring-4 ring-[#10B981]/30 animate-pulse' : 'ring-3 ring-[#10B981]/15';
    labelColor = '#10B981';
  } else if (isRed) {
    dotBg = '#EF4444';
    ringClass = isCur ? 'ring-4 ring-[#EF4444]/30 animate-pulse' : 'ring-3 ring-[#EF4444]/15';
    labelColor = '#EF4444';
  }

  return { dotBg, ringClass, labelColor, isCur, isRed };
}

export const MilestonesBar: React.FC<MilestonesBarProps> = ({
  shipment,
  t,
}) => {
  const steps = useMemo(
    () =>
      buildLaravelProgressSteps(shipment, (key, opts) => {
        if (opts?.defaultValue && typeof opts.defaultValue === 'string') {
          return t(key, opts.defaultValue);
        }
        return t(key);
      }).filter((step) => step.state !== 'skip'),
    [shipment, t]
  );

  if (steps.length === 0) {
    return null;
  }

  const status = shipment.status;
  const isCompleted = status === 'fullfilled' || status === 'delivered';
  const isCanceled =
    status === 'canceled' ||
    status === 'cancelled' ||
    status === 'not_fullfilled';

  return (
    <div className="rounded-2xl px-6 py-5 mb-4 bg-white border border-[#E4E4E8] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
      <div className="overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
        <div className="flex items-start w-full min-w-max">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const { dotBg, ringClass, labelColor, isCur, isRed } = stepStyle(step);
            const reasonLabel = step.reason ? t(step.reason, step.reason) : null;

            return (
              <div
                key={step.id}
                className={`flex flex-col items-start group ${
                  isLast ? 'flex-1 min-w-[130px]' : 'flex-1 min-w-[140px] max-w-[240px] pr-2'
                }`}
              >
                <div className="flex items-center w-full h-6">
                  <span
                    className={`w-3 h-3 rounded-full flex-shrink-0 z-10 transition-transform group-hover:scale-110 ${ringClass}`}
                    style={{ backgroundColor: dotBg }}
                    aria-hidden="true"
                  />

                  {!isLast && (
                    <span
                      className="flex-1 h-[2px] rounded-full transition-colors"
                      style={{
                        backgroundColor: step.state === 'done' || step.state === 'success' ? '#9B51E0' : '#E4E4E8',
                      }}
                      aria-hidden="true"
                    />
                  )}

                  {isLast && !isCompleted && !isCanceled && (
                    <span
                      className="flex-1 h-0 mr-2"
                      style={{
                        borderTop: '1.5px dashed #9B51E0',
                        opacity: 0.45,
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="flex flex-col items-start mt-2 w-full pr-2">
                  <span
                    className={`text-[13px] leading-snug break-words max-w-full ${
                      isCur || isRed ? 'font-bold' : 'font-semibold'
                    }`}
                    style={{ color: labelColor }}
                    title={step.label}
                  >
                    {step.label}
                  </span>

                  {reasonLabel && (
                    <span
                      className="text-[12px] font-semibold mt-0.5 leading-tight"
                      style={{ color: '#EF4444' }}
                    >
                      {reasonLabel}
                    </span>
                  )}

                  {step.dateLine && (
                    <span className="text-[11px] font-medium text-[#8E8E9A] mt-1 leading-tight whitespace-nowrap">
                      {step.dateLine}
                    </span>
                  )}
                  {step.timeLine && (
                    <span className="text-[11px] text-[#8E8E9A] mt-0.5 leading-tight whitespace-nowrap">
                      {step.timeLine}
                    </span>
                  )}
                  {!step.dateLine && !step.timeLine && step.sub ? (
                    <span className="text-[11px] text-[#8E8E9A] mt-1 leading-tight whitespace-nowrap">
                      {step.sub}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
