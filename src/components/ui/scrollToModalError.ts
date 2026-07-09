const DEFAULT_ERROR_SELECTORS = '.has-error, .field-error';

function focusErrorField(errorEl: HTMLElement): void {
  const focusable =
    errorEl.tagName === 'INPUT' ||
    errorEl.tagName === 'TEXTAREA' ||
    errorEl.tagName === 'SELECT' ||
    errorEl.tagName === 'BUTTON'
      ? errorEl
      : errorEl.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
        );

  focusable?.focus({ preventScroll: true });
}

/**
 * Scrolls the first visible validation error into view inside a modal body.
 * Returns true when an error element was found and scrolled to.
 */
export function scrollToFirstModalError(
  container: ParentNode,
  modalBodySelector = '.modal-body',
  errorSelectors = DEFAULT_ERROR_SELECTORS
): boolean {
  const modalBody =
    container instanceof Element && container.matches(modalBodySelector)
      ? container
      : container.querySelector(modalBodySelector);

  const root = modalBody ?? container;
  const errorEl = root.querySelector<HTMLElement>(errorSelectors);
  if (!errorEl) return false;

  if (modalBody instanceof HTMLElement) {
    const bodyRect = modalBody.getBoundingClientRect();
    const errorRect = errorEl.getBoundingClientRect();
    const targetTop =
      errorRect.top - bodyRect.top + modalBody.scrollTop - bodyRect.height / 2 + errorRect.height / 2;

    modalBody.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  } else {
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  window.requestAnimationFrame(() => focusErrorField(errorEl));
  return true;
}
