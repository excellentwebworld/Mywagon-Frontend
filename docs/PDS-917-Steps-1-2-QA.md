# PDS-917 Steps 1 & 2 — QA Checklist

## Step 1 — Create Load (Details)

### Location picker
- [ ] My Locations / Customer Locations tabs switch correctly
- [ ] Search matches name, company, address, city (including collapsed accordion groups)
- [ ] Create New Location saves and auto-selects on stop
- [ ] Preview (Eye) works
- [ ] Click outside closes location dropdown

### Cargo table
- [ ] Column order: Order → Customer → Product
- [ ] Order auto-fills customer; clear order clears dependent fields
- [ ] Product dropdown disabled until order selected; only order line SKUs
- [ ] Qty/weight auto-fill from order line; manual override works
- [ ] Unmapped order lines show helper text
- [ ] Copy row duplicates line
- [ ] Quick Fill creates lines from ERP order
- [ ] Orders load from ERP API; loading/error states visible

### Scheduling & validation
- [ ] Self-Scheduling removed; Fixed Time only
- [ ] Load Balance bar works
- [ ] Continue blocked on real conflict data (not mocks)

## Step 2 — Itinerary + Vehicle

### PDS-917 removals
- [ ] No timeline toggle / horizontal chart
- [ ] No AI Analysis panel or weather warnings
- [ ] No share/PDF buttons

### Layout (Page 2 design)
- [ ] Vertical route stops timeline with expand/collapse
- [ ] Customer pills (max 2 + overflow)
- [ ] Expanded stop shows customer groups with order chips
- [ ] Map / Satellite tabs
- [ ] Trip summary 2×2 or 3×2 based on customers
- [ ] Orders card grouped by customer
- [ ] Vehicle selector below itinerary (per-column specs)

### Footer & persistence
- [ ] Save Draft calls partial step-2 save
- [ ] Confirm & Continue saves complete step-2 and advances to Step 3
- [ ] Missing locations block continue
- [ ] Vehicle selection required
- [ ] Draft reload restores itinerary + vehicle state

### i18n
- [ ] EN and EL strings for new Step 2 footer and Step 1 order errors
