import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { CarrierAccordionsSkeleton } from "./CarrierListSkeleton";

const T = {
  sf: "var(--surface)",
  sa: "var(--surface-alt)",
  bd: "var(--border)",
};

const sk = {
  baseColor: T.sa,
  highlightColor: T.sf,
};

export const Step3PricingSkeleton: React.FC = () => (
  <div
    className="pb-24 wizard-step3-skeleton animate-fade-in mt-4"
    aria-busy="true"
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left column — ~70% */}
      <div className="lg:col-span-2 space-y-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: T.sf, border: `1px solid ${T.bd}` }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: `1px solid ${T.bd}` }}
          >
            <Skeleton width={140} height={16} {...sk} />
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={96} borderRadius={12} {...sk} />
              ))}
            </div>
            <Skeleton className="mb-2" height={36} borderRadius={8} {...sk} />
            <Skeleton height={36} borderRadius={8} {...sk} />
            <CarrierAccordionsSkeleton companyRows={4} freelancerRows={2} />
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: T.sf, border: `1px solid ${T.bd}` }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: `1px solid ${T.bd}` }}
          >
            <Skeleton width={120} height={16} {...sk} />
          </div>
          <div className="p-5 space-y-3">
            <Skeleton height={40} borderRadius={8} {...sk} />
            <Skeleton height={88} borderRadius={8} {...sk} />
          </div>
        </div>
      </div>

      {/* Right column — ~30% */}
      <div className="space-y-4 lg:sticky lg:top-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: T.sf, border: `1px solid ${T.bd}` }}
        >
          <Skeleton height={200} {...sk} />
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${T.bd}` }}
          >
            <Skeleton width={70} height={14} {...sk} />
            <Skeleton width={48} height={24} borderRadius={6} {...sk} />
          </div>
          <div className="p-4 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton circle width={10} height={10} {...sk} />
                <div className="flex-1">
                  <Skeleton width="55%" height={12} {...sk} />
                  <Skeleton
                    width="35%"
                    height={10}
                    {...sk}
                    style={{ marginTop: 6 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div
            className="grid grid-cols-2 gap-px bg-slate-200 border-t"
            style={{ borderColor: T.bd }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-3">
                <Skeleton width={50} height={9} {...sk} />
                <Skeleton
                  width={64}
                  height={16}
                  {...sk}
                  style={{ marginTop: 6 }}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: T.sf, border: `1px solid ${T.bd}` }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: `1px solid ${T.bd}` }}
          >
            <Skeleton width={60} height={14} {...sk} />
          </div>
          <div className="p-4 space-y-3">
            <Skeleton height={36} borderRadius={8} {...sk} />
            <Skeleton height={52} borderRadius={12} {...sk} />
            <Skeleton height={32} borderRadius={8} {...sk} />
            <div
              className="pt-3 border-t space-y-2"
              style={{ borderColor: T.bd }}
            >
              <Skeleton width="50%" height={12} {...sk} />
              <Skeleton height={40} borderRadius={8} {...sk} />
            </div>
            <div
              className="flex items-center justify-between pt-3 border-t"
              style={{ borderColor: T.bd }}
            >
              <div className="flex-1 space-y-1">
                <Skeleton width="45%" height={12} {...sk} />
                <Skeleton width="65%" height={10} {...sk} />
              </div>
              <Skeleton width={42} height={22} borderRadius={99} {...sk} />
            </div>
          </div>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: T.sf, border: `1px solid ${T.bd}` }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: `1px solid ${T.bd}` }}
          >
            <Skeleton width={90} height={14} {...sk} />
          </div>
          <div className="p-4">
            <Skeleton height={72} borderRadius={8} {...sk} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Step3PricingSkeleton;
