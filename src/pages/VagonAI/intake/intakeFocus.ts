/**
 * Where keyboard focus goes after the shipper acts (QA-1).
 *
 * Pressing "Discard this load", answering a step, "Save as draft", "Undo" … replaces or disables the control that had
 * focus, and the browser drops focus to `<body>`: a keyboard or screen-reader user has to Tab from the top of the page
 * again. The rule: an ACTION arms a short-lived "focus intent"; the next card that ARRIVES (the next step, the saved
 * draft, the fresh summary, the "discarded" note) takes the intent and moves focus to itself — once, without scrolling
 * the chat (MS3-399). No action ⇒ no intent ⇒ nothing steals focus (page load, history, a gateway event the shipper
 * did not wait for). An intent nobody takes (the request failed) expires.
 * Pure state (a module variable) — the React side is `LiveFocus` in `intakeUi.tsx`.
 */

/** How long an unclaimed intent stays valid. */
export const FOCUS_INTENT_TTL_MS = 15_000;

let armedAt: number | null = null;

/** The shipper just acted (press, answer, finish, undo, discard, new load): the next arriving card may take focus. */
export function armFocusIntent(now: number = Date.now()): void { armedAt = now; }

/** A card arrived: true once per arm, while it is fresh. */
export function takeFocusIntent(now: number = Date.now()): boolean {
  const fresh = armedAt !== null && now - armedAt <= FOCUS_INTENT_TTL_MS;
  armedAt = null;
  return fresh;
}

/** Test-only reset. */
export function resetFocusIntent(): void { armedAt = null; }
