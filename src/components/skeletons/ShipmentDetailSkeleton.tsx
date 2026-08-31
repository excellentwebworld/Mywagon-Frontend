import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';

interface ShipmentDetailSkeletonProps {
  t: (key: string, fallback?: string) => string;
}

export const ShipmentDetailSkeleton: React.FC<ShipmentDetailSkeletonProps> = ({ t }) => {
  return (
    <div className="w-full min-h-screen bg-[#F7F7FA] font-sans antialiased animate-pulse">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-7 py-4 pb-10 w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-[12px] mb-3 text-[#8E8E9A]">
          <Link
            to="/shipments"
            className="flex items-center gap-1 font-medium text-[#9B51E0] hover:underline"
          >
            <ArrowLeft size={12} />
            <span>{t('manageShipments', 'Manage shipments')}</span>
          </Link>
          <span>›</span>
          <span className="text-[#71717A]">{t('loadDetails', 'Load details')}</span>
        </div>

        {/* Command Header Skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-[#E4E4E8] mb-3.5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left: ID & Lane */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-36 h-7 rounded-lg bg-[#E4E4E8]" />
                <div className="w-20 h-6 rounded-full bg-[#EDE9FE]" />
              </div>
              <div className="w-64 h-5 rounded-md bg-[#E4E4E8]" />
              <div className="flex items-center gap-2 pt-1">
                <div className="w-24 h-5 rounded bg-[#F4F4F5]" />
                <div className="w-20 h-5 rounded bg-[#F4F4F5]" />
                <div className="w-28 h-5 rounded bg-[#F4F4F5]" />
              </div>
            </div>

            {/* Mid: Key Metric Tiles */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 w-28">
                <div className="w-12 h-2.5 rounded bg-[#CBD5E1]" />
                <div className="w-20 h-5 rounded bg-[#94A3B8]" />
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 w-28">
                <div className="w-14 h-2.5 rounded bg-[#CBD5E1]" />
                <div className="w-16 h-5 rounded bg-[#94A3B8]" />
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 w-28">
                <div className="w-10 h-2.5 rounded bg-[#CBD5E1]" />
                <div className="w-16 h-5 rounded bg-[#94A3B8]" />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-9 rounded-xl bg-[#F4F4F5] border border-[#E4E4E8]" />
              <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] border border-[#E4E4E8]" />
              <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] border border-[#E4E4E8]" />
            </div>
          </div>
        </div>

        {/* Jump Navigation Skeleton */}
        <div className="bg-white rounded-2xl px-4 py-2.5 border border-[#E4E4E8] mb-3.5 shadow-sm flex items-center gap-2 overflow-hidden">
          {['w-20', 'w-32', 'w-24', 'w-28', 'w-20', 'w-24', 'w-20'].map((w, idx) => (
            <div key={idx} className={`${w} h-7 rounded-xl bg-[#F4F4F5] flex-shrink-0`} />
          ))}
        </div>

        {/* Milestones Bar Skeleton */}
        <div className="bg-white rounded-2xl p-4 border border-[#E4E4E8] mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((step, idx) => (
              <div key={step} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#E4E4E8] flex-shrink-0" />
                <div className="space-y-1 flex-1 min-w-0 hidden sm:block">
                  <div className="w-16 h-3 rounded bg-[#E4E4E8]" />
                  <div className="w-10 h-2 rounded bg-[#F4F4F5]" />
                </div>
                {idx < 4 && <div className="h-0.5 flex-1 bg-[#E4E4E8] mx-2 hidden md:block" />}
              </div>
            ))}
          </div>
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
          {/* Left Column */}
          <div className="flex-1 min-w-0 w-full space-y-3.5">
            {/* Card 1: Stops Skeleton */}
            <div className="bg-white rounded-2xl p-5 border border-[#E4E4E8] shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E8]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#9B51E0]/30" />
                  <div className="w-40 h-4 rounded bg-[#E4E4E8]" />
                </div>
                <ChevronDown size={16} className="text-[#8E8E9A]" />
              </div>

              {/* Stop 1 */}
              <div className="py-4 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#18181B]/20 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="w-48 h-4 rounded bg-[#E4E4E8]" />
                    <div className="w-72 h-3 rounded bg-[#F4F4F5]" />
                  </div>
                  <div className="w-24 h-5 rounded bg-[#F4F4F5]" />
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                  <div className="w-3/4 h-3.5 rounded bg-[#E2E8F0]" />
                  <div className="w-1/2 h-3 rounded bg-[#E2E8F0]" />
                </div>
              </div>

              {/* Stop 2 */}
              <div className="py-4 border-t border-[#E4E4E8] space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#18181B]/40 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="w-40 h-4 rounded bg-[#E4E4E8]" />
                    <div className="w-64 h-3 rounded bg-[#F4F4F5]" />
                  </div>
                  <div className="w-24 h-5 rounded bg-[#F4F4F5]" />
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                  <div className="w-2/3 h-3.5 rounded bg-[#E2E8F0]" />
                  <div className="w-1/3 h-3 rounded bg-[#E2E8F0]" />
                </div>
              </div>
            </div>

            {/* Card 2: Load Summary Skeleton */}
            <div className="bg-white rounded-2xl p-5 border border-[#E4E4E8] shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E8]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#9B51E0]/30" />
                  <div className="w-32 h-4 rounded bg-[#E4E4E8]" />
                </div>
                <ChevronDown size={16} className="text-[#8E8E9A]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="w-24 h-2.5 rounded bg-[#CBD5E1]" />
                    <div className="w-32 h-4 rounded bg-[#E4E4E8]" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 space-y-3.5">
            {/* Map Area Placeholder */}
            <div className="bg-white rounded-2xl border border-[#E4E4E8] overflow-hidden shadow-sm">
              <div className="h-[240px] bg-[#E2E8F0] relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/60 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#9B51E0]/40" />
                </div>
              </div>
            </div>

            {/* Trip Summary Card Skeleton */}
            <div className="bg-white rounded-2xl p-5 border border-[#E4E4E8] shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E8]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#9B51E0]/30" />
                  <div className="w-28 h-4 rounded bg-[#E4E4E8]" />
                </div>
                <ChevronDown size={16} className="text-[#8E8E9A]" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                    <div className="w-12 h-2.5 rounded bg-[#CBD5E1]" />
                    <div className="w-20 h-5 rounded bg-[#94A3B8]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Instructions Skeleton */}
            <div className="bg-white rounded-2xl p-5 border border-[#E4E4E8] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E8]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#9B51E0]/30" />
                  <div className="w-36 h-4 rounded bg-[#E4E4E8]" />
                </div>
                <ChevronDown size={16} className="text-[#8E8E9A]" />
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-3 rounded bg-[#CBD5E1]" />
                  <div className="w-16 h-3 rounded bg-[#E2E8F0]" />
                </div>
                <div className="w-full h-3 rounded bg-[#E2E8F0]" />
              </div>
            </div>

            {/* Documents & Attachments Skeleton */}
            <div className="bg-white rounded-2xl p-5 border border-[#E4E4E8] shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E8]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#9B51E0]/30" />
                  <div className="w-40 h-4 rounded bg-[#E4E4E8]" />
                </div>
                <ChevronDown size={16} className="text-[#8E8E9A]" />
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="w-3/4 h-3 rounded bg-[#E2E8F0]" />
                <div className="w-1/2 h-2.5 rounded bg-[#CBD5E1]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
