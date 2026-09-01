MYVAGON — Load Details HTML reference pack
==========================================

One file per shipment status, exported as an SSR snapshot of the real
React page (production markup + compiled CSS inlined). Open directly in
any browser; no server needed. Interactivity (collapses, modals,
dropdowns, hover tooltips) is NOT wired — these are structure/pixel
references, not working pages.

Files
  load-details_draft_SHP-0071.html
  load-details_pending_SHP-4482.html                bids section on top
  load-details_scheduled_SHP-5122.html              carrier assigned + update-request tabs
  load-details_ready_SHP-3050.html                  driver visible pre-trip
  load-details_on_trip_SHP-1399.html                live tracking + ETA chips
  load-details_fulfilled_SHP-8890.html              rating + billing/POD
  load-details_partially_fulfilled_SHP-6671.html
  load-details_unfulfilled_SHP-4410.html
  load-details_cancelled_SHP-3311.html              read-only banner + audit

Layout contract (also fixed in the React app in this round)
  ≥1024px: TWO independently-stacking flex columns —
    LEFT : Stops & Appointments · Carrier/Driver · Load Summary · Notes
    RIGHT: Live Tracking (on-trip) / Route Map · Trip Summary · Rating ·
           Billing · Incidents · Documents
  Status-conditional cards render nothing and the stack closes ranks:
  no empty slots, no void beside tall cards (the previous grid grew its
  row to the tallest cell). <1024px: single column, same order
  left-then-right. Cards never split across columns (break-inside:avoid).

Reference build: MV_Web_Panel (React 18 + Vite + Tailwind), page
src/pages/shared/LoadDetailsPage.jsx + src/pages/shared/loaddetails/*.
