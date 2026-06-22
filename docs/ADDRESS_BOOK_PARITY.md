# Address Book — Blade vs React Parity Checklist

Reference: `mv-new-frontend-design-development` (client-approved Blade)

| Section | Blade | React (target) | Status |
|---------|-------|----------------|--------|
| 3-pane layout | Yes | Yes | Done |
| Directory (4 nodes only) | All/My/Customer/Archived | 4 system nodes + summary counts | Done |
| Filter bar | Search only 250ms | Search only, 250ms debounce | Done |
| List columns | Location, City, Location Type, Role, Ops (dock), Contact, Usage | City-only address; type badge; dock-only ops | Done |
| Column sort | Location name header sort | `toggleLocationSort` on name column | Done |
| Pagination | Default 12, page jump | Default 12 + page-length + jump input | Done |
| Export | Excel server | `GET /address-book/export` (.xlsx) | Done |
| Create 4-step wizard | Trimmed fields per client feedback | SearchableSelect; map at bottom; no lat/lng UI | Done |
| Edit modal | Aligned field set with create | Same removals + appointment preferred times | Done |
| Company modal | Google address + industry select | `CreateCompanyModal` + Places autofill | Done |
| Google Maps | Autocomplete + map preview | `GoogleMapAddressField` + `LocationMapPreview` | Done |
| Duplicate check | UI stub | API + Use existing selects record | Done |
| Restore archived | Row + detail | Edit/Archive/Restore only in detail | Done |
| Detail panel | Trimmed actions/stats | No duplicate/shipment/quick stats; read-only company | Done |
| Brand colors | `#9B51E0` accent | `globals.css` tokens | Done |
| Sidebar logo | grey/white mark | `/gray_white.png` | Done |
| Validation | Per-step + inline errors | `locationCreateValidation.ts` | Done |

## Staging QA script (manual)

Run side-by-side on staging (Blade vs React):

1. Directory counts match for All / My / Customer / Archived
2. Search finds same records (name, address, city)
3. Location Type column shows My/Customer badge only (no facility subtype line)
4. Operational column shows dock type only
5. Create My Location — required ops fields enforced; map preview at bottom
6. Create Customer Location — company SearchableSelect + inline company create
7. Edit location — aligned fields with create; appointment times when appt required
8. Archive → appears in Archived; Restore returns to active
9. Export downloads Excel with expected columns
10. Detail panel: Edit/Archive/Restore only; company contact read-only
11. Google autocomplete without visible lat/lng fields
12. Duplicate warning on review step; "Use existing" selects record
13. Pagination default 12; page jump works
14. Brand purple `#9B51E0`; grey/white sidebar logo

## Env

- `VITE_GOOGLE_MAPS_KEY` — Google Places autocomplete and detail map embed
- `VITE_API_BASE_URL` — e.g. `https://staging.myvagon.com/api/shipper/v1`

## Implementation notes

- Shared UI: `shipper/src/components/ui/SearchableSelect.tsx`
- Map: `GoogleMapAddressField.tsx`, `LocationMapPreview.tsx`
- Validation: `shipper/src/pages/AddressBook/validation/locationCreateValidation.ts`
- Hook: `shipper/src/pages/AddressBook/hooks/useAddressBook.ts`
