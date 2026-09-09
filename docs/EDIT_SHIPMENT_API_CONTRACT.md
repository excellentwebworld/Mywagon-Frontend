# Edit Shipment SPA API Contract (PDS-959 Phase 0–1)

Id-based API mirroring create-shipment. **No PHP/Laravel session.**

Base: `/api/shipper/v1/edit-shipment/{id}`  
`{id}` = shipment id (not draft-only). Drafts stay on `/create-shipment/drafts/{id}`.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/edit-shipment/{id}` | Load/seed `wizard_state` + locks |
| PUT | `/edit-shipment/{id}/step-1` | Save stops / refs into `wizard_state` |
| PUT | `/edit-shipment/{id}/step-2` | Save itinerary / vehicles |
| PUT | `/edit-shipment/{id}/step-3` | Save pricing / partners / notes |
| POST | `/edit-shipment/{id}/preview-diff` | Diff live vs `wizard_state` |
| POST | `/edit-shipment/{id}/apply` | Persist update; clear wizard |
| POST | `/edit-shipment/{id}/cancel` | Clear `wizard_state` / `wizard_step` |

Working copy: `shipments.wizard_state` + `shipments.wizard_step` (same columns as create drafts).

## Eligibility

- Shipper must own the shipment.
- `status = draft` → use create-shipment APIs (edit API returns 404).
- Block mutating endpoints with **403** when `status = on_trip` and more than one distinct non-null `driver_id` on live pickup locations.
- If pending update already exists (`updated_shipment` set or any location `updated_status = 1`): GET allowed; **apply → 409**.

## Locked stops

Location statuses `{3,4,5,6,7,8}` are locked. Returned as `locked_stop_ids` (shipment_location ids). Mutating or removing those lines on step-1/apply → **422**.

## Apply persistence

- **pending**: rewrite live rows (`updated_status = 0`), same idea as create publish.
- **other statuses**: pending shadow only — `shipments.updated_shipment` + new location/truck rows with `updated_status = 1`. Live rows stay `0` until carrier/driver accept/reject.
- **cancel**: clears wizard fields only; does not remove an already-applied pending shadow.

## Diff shape (`preview-diff`)

```json
{
  "has_changes": true,
  "difference": {
    "0": { "qty": { "old": "10", "new": "12" } }
  },
  "old_itinerary": [],
  "updated_itinerary": []
}
```

## Auth

Same Sanctum shipper stack as create-shipment.
