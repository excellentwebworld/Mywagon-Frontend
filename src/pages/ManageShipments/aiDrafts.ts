/**
 * MS3-338 — which drafts Vagon AI created.
 *
 * Provenance is NOT on the shipment row. The core API has no created_by column,
 * so a shipment fetched from Laravel carries nothing that says who made it; the
 * chat gateway records what it drafted and serves the ids
 * (`aiDraftsService`). Everything here therefore works off a set of ids rather
 * than a field on the record — an earlier version read `row.created_by`, which
 * now silently answers "no" for every row.
 */
export const AI_CREATED_BY = 'vagon_ai' as const;

/** Ids come back as numbers from the gateway and strings from the list; compare as strings. */
export function toAiDraftIdSet(ids: readonly (number | string)[] | null | undefined): Set<string> {
  return new Set((ids ?? []).map(String));
}

/** Did Vagon AI create this shipment? Answered from the gateway's id set. */
export function isAiCreatedDraft(
  row: { id?: number | string | null } | null | undefined,
  aiDraftIds: Set<string>,
): boolean {
  const id = row?.id;
  return id !== null && id !== undefined && aiDraftIds.has(String(id));
}

