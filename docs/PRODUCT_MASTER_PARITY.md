# Product Master — Blade vs React Parity Checklist

Reference: `mv-new-frontend-design-development` (client-approved Blade)

| Section | Blade | React (target) | Status |
|---------|-------|----------------|--------|
| 3-pane layout | Facet / list / detail | Facet / list / detail | Done |
| Facet sidebar | All, Unmapped, categories, types, STATUS | API `/summary` counts + Active/Inactive facet | Done |
| View toggle | SKUs / Types | SKUs / Types | Done |
| Sticky header | Page title + search bar sticky | `pm-sticky-header` in CSS | Done |
| Filter bar | Search only | Search only (category/status/unmapped removed) | Done |
| Column filters | Per-column status/category | Category + Status header filters in table | Done |
| KPI strip | Removed per client feedback | `KpiStrip` removed | Done |
| SKU table columns | SKU, Type, Category, Source, Updated, Status, attrs | Aligned | Done |
| Pagination | Default 12, server-side | API paginated list | Done |
| Add SKU modal | Category/type SearchableSelect, UOM label | `SearchableSelect` + `t('uom')` | Done |
| Edit SKU | PUT update | API update | Done |
| Toggle active | POST toggle-status | API toggle + facet STATUS | Done |
| Bulk archive | POST bulk-archive | API bulk-archive | Done |
| CSV import | Template + upload + progress + summary | Full import modal (form / progress / result) | Done |
| Excel export | GET export | API export download | Done |
| Types grid | AJAX types-grid | API `/types` (4 stat columns) | Done |
| SKU detail shipments | 30d / 90d / total stats | `shipments30/90/Total` on SKU detail | Done |
| Create Shipment wizard products | Product create | `POST /product-master/skus` + catalog refresh | Done |
| Subscription | `manage_product_master` | 403 banner | Done |
| Search filter | DataTable search + subscription | API `search` param | Done |
| Brand colors | `#9B51E0` accent | `product-master.css` + `globals.css` tokens | Done |
| Sidebar logo | grey/white mark | `/gray_white.png` | Done |
| AI Master Wizard | 4-step modal + interactive preview | `AiWizardModal` + `AiWizardPreviewPanel` | Done |
| Rename/merge type | Not in Blade | Removed from React | Done |
| Sync log / ERP sync | Not in Blade | Removed from React | Done |

## Staging QA script (manual)

Run side-by-side on staging (Blade vs React):

1. Facet counts match for All / Active / Inactive / Unmapped / per category
2. Sticky header: title + search remain visible while list scrolls
3. No KPI strip (TOTAL SKUS / UNMAPPED / INACTIVE row removed)
4. SKU list pagination default 12; page length 10/12/25/50/100 works
5. Search finds same records (name, number, barcode, type, category)
6. Facet filter by category and type narrows list correctly
7. Column filters for Category and Status match facet filters
8. Unmapped facet shows only unmapped SKUs
9. Create SKU — required fields enforced; SearchableSelect dropdowns; UOM label
10. Edit SKU — fields pre-filled; shipping defaults from type
11. Toggle active/inactive from detail panel + STATUS facet
12. Bulk archive selected rows
13. Export downloads Excel with expected columns
14. Import modal: template download, category index CSV, upload, progress, result stats
15. Types view grid loads shipment stats
16. SKU detail panel shows shipment stats (30d, 90d, total)
17. Subscription blocked user sees banner and cannot mutate
18. AI Wizard: upload valid messy CSV → preview → confirm import
19. Brand purple `#9B51E0` on primary buttons; grey/white sidebar logo

## Env

- `VITE_API_BASE_URL` — e.g. `https://staging.myvagon.com/api/shipper/v1`

## Implementation notes

- API routes: `MV_Backend_API/routes/api/shipper.php` under `/api/shipper/v1/product-master/*`
- React service: `shipper/src/api/services/productMasterService.ts`
- Hook: `shipper/src/pages/ProductMaster/hooks/useProductMaster.ts` (React Query)
- Shared UI: `shipper/src/components/ui/SearchableSelect.tsx`
- Feature tests: `MV_Backend_API/tests/Feature/Api/Shipper/ProductMaster/ProductMasterApiTest.php`
- AI Wizard tests: `MV_Backend_API/tests/Feature/Api/Shipper/ProductMaster/AiWizardApiTest.php`
- AI Wizard UI: `shipper/src/components/ProductMaster/AiWizardModal.tsx`
- QA fixture (messy CSV): `shipper/docs/fixtures/ai-wizard-messy-sample.csv`
