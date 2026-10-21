/**
 * Touch targets (QA-1). A finger needs ≥ 44 px: on a phone every intake button, link-button and chip is at least
 * `TAP_MIN_PX` tall; from the `md` breakpoint up the desktop sizes are untouched (the class is a MINIMUM, so a control
 * that is already taller — the 44 px answer buttons — is unchanged). Tailwind scans `.ts`, so the class names below are real.
 */
export const TAP_MIN_PX = 44;
/** A bordered button / chip: at least 44 px on a phone, its own size on a desktop. */
export const TAP_CLASS = 'min-h-[44px] md:min-h-0';
/** A text link built from a `<button>` (underlined): 44 px of tappable height on a phone, the text line on a desktop. */
export const TAP_LINK_CLASS = 'inline-flex items-center min-h-[44px] md:min-h-0';
