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
}) => {
  // Only show events that have happened or are currently active
  const pastAndCurrentMilestones = vm.milestones.filter(
    (ms) => ms.state === 'done' || ms.state === 'cur'
  );

  if (pastAndCurrentMilestones.length === 0) {
    return null;
  }

  const isCompleted =
    vm.status === 'fullfilled' ||
    vm.status === 'delivered';

  const isCanceled =
    vm.status === 'canceled' ||
    vm.status === 'cancelled' ||
    vm.status === 'not_fullfilled';

  return (
    <div className="rounded-2xl px-6 py-5 mb-4 bg-white border border-[#E4E4E8] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200">
      <div className="overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
        <div className="flex items-start w-full min-w-max">
          {pastAndCurrentMilestones.map((ms, idx) => {
            const isLast = idx === pastAndCurrentMilestones.length - 1;
            const label = lang === 'el' ? ms.labelEl : ms.labelEn;
            const isCur = ms.state === 'cur';

            let dotBg = '#9B51E0';
            let ringClass = isCur ? 'ring-4 ring-[#9B51E0]/30 animate-pulse' : 'ring-3 ring-[#9B51E0]/15';
            let labelColor = isCur ? '#9B51E0' : '#18181B';

            if (ms.tone === 'green') {
              dotBg = '#10B981';
              ringClass = isCur ? 'ring-4 ring-[#10B981]/30 animate-pulse' : 'ring-3 ring-[#10B981]/15';
              labelColor = '#10B981';
            } else if (ms.tone === 'red') {
              dotBg = '#EF4444';
              ringClass = isCur ? 'ring-4 ring-[#EF4444]/30 animate-pulse' : 'ring-3 ring-[#EF4444]/15';
              labelColor = '#EF4444';
            }

            return (
              <div
                key={ms.key}
                className={`flex flex-col items-start group ${
                  isLast ? 'flex-1 min-w-[130px]' : 'flex-1 min-w-[140px] max-w-[240px] pr-2'
                }`}
              >
                {/* Track Row (Dot + Connecting line to next milestone) */}
                <div className="flex items-center w-full h-6">
                  {/* Dot */}
                  <span
                    className={`w-3 h-3 rounded-full flex-shrink-0 z-10 transition-transform group-hover:scale-110 ${ringClass}`}
                    style={{ backgroundColor: dotBg }}
                    aria-hidden="true"
                  />

                  {/* Line to next step */}
                  {!isLast && (
                    <span
                      className="flex-1 h-[2px] rounded-full transition-colors"
                      style={{
                        backgroundColor: ms.state === 'done' ? '#9B51E0' : '#E4E4E8',
                      }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Dashed Trailing Line */}
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

                {/* Text Label & Timestamp */}
                <div className="flex flex-col items-start mt-2 w-full pr-2">
                  {ms.actorName ? (
                    <div>
                      <div className="text-[12px] font-medium text-[#71717A] leading-tight">
                        {ms.actorRole || 'Transporter:'}
                      </div>
                      <div className="flex items-center flex-wrap gap-1 mt-0.5">
                        <span
                          className="text-[13px] font-bold leading-snug break-words"
                          style={{ color: '#9B51E0' }}
                        >
                          {ms.actorName}
                        </span>
                        {ms.badge && (
                          <span className="inline-block uppercase px-1.5 py-0.5 text-[9px] font-bold bg-[#E4E4E8] text-[#5E5E6E] rounded-md tracking-wider shadow-2xs">
                            {ms.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center flex-wrap gap-1">
                      <span
                        className="text-[13px] font-semibold leading-snug break-words max-w-full"
                        style={{ color: labelColor }}
                        title={label}
                      >
                        {label}
                      </span>
                      {ms.badge && (
                        <span className="inline-block uppercase px-1.5 py-0.5 text-[10px] font-bold bg-[#E4E4E8] text-[#5E5E6E] rounded-md tracking-wider shadow-2xs">
                          {ms.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {ms.date && (
                    <span className="text-[11px] font-medium text-[#8E8E9A] mt-1 leading-tight whitespace-nowrap">
                      {ms.date}
                    </span>
                  )}
                  {ms.time && (
                    <span className="text-[11px] text-[#8E8E9A] mt-0.5 leading-tight whitespace-nowrap">
                      {ms.time}
                    </span>
                  )}
                  {ms.subtitle && (
                    <span className="text-[11px] text-[#8E8E9A] mt-0.5 leading-tight">
                      {ms.subtitle}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
