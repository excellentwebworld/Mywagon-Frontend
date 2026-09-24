# MYVAGON Shipper — In-app brand guidelines (for developers)

Source handoff: `../MV Shipper Design System Normalization/design_handoff_shipper_visual_normalization/`

## Adopt in code

| File | Role |
|------|------|
| [`src/styles/mv-app-tokens.css`](../src/styles/mv-app-tokens.css) | Single source of colour, type, radius, shadow, light/dark |
| [`src/styles/mv-token-bridge.css`](../src/styles/mv-token-bridge.css) | Maps `--app-*` → legacy `--accent` / `--bg` / `--nav-*` |
| [`src/components/ui/mv-ui.jsx`](../src/components/ui/mv-ui.jsx) | Primitives: `LoadStatus`, `StatusBadge`, `Tag`, `Button`, `KpiCard`, `Money`, … |
| [`src/components/ui/mv.ts`](../src/components/ui/mv.ts) | Re-exports |

Import order in `main.tsx`: tokens → bridge → app.css → globals.css.

Root attributes: `data-theme="light|dark"` and `data-sidebar="navy|light"` (set by `ThemeContext`).

## Hard rules

1. **Poppins** everywhere in the panel (no monospace). Use `font-variant-numeric: tabular-nums` for numbers.
2. **Purple `#9B51E0`** resting; **blue `#4E5CDC`** hover only.
3. **Gradient buttons** only for **Vagon AI** and **New Shipment**.
4. Functional colour only via `LOAD_STATUS` / `STATUS_TONE` / ops dots — never invent status colours in pages.
5. KPI numbers are ink/black; colour only via 7px label dots. Max **2** analytics gradients per page.
6. Active filter chips = **navy** fill + white text.
7. Toggles ON = purple (never green). Usage meters = purple→blue gradient (amber ≥85%, red at limit).
8. €0.00 = grey (`--app-text-3`), never green.
9. Radius: tag 8 / control 10 / button 12 / card 16 / modal 20.
10. Auth/login/register stay on their own CSS — do not force Poppins there.

## Visual references

Open in a browser (needs `_ds/` + `support.js` alongside):

- `Shipper Pages Reworked.dc.html` — Dashboard, Manage Shipments, Billing, Subscription
- `Shipper UI Rules.dc.html` — full rulebook + PR checklist §11

## PR checklist

- [ ] No new hex / monospace / emoji outside tokens (or status maps)
- [ ] ≤1 primary header button; gradient only Vagon AI + New Shipment
- [ ] Verified light + dark
- [ ] Long Greek strings don’t break titles/tags/buttons

Optional check: `npm run lint:brand` (scans panel sources for JetBrains / DM Sans / raw green toggle patterns).
