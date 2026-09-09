import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './onboarding-tour.css';
import { buildOnboardingSteps, type TourTranslate } from './tourSteps';

export const FORCE_TOUR_SESSION_KEY = 'shipper_force_onboarding_tour';

let activeDriver: Driver | null = null;
let persistOnDestroy = true;

function scrollTourTargetIntoView(el: Element | null | undefined) {
  if (!el) return;
  const sidebar = document.getElementById('sidebar');
  if (sidebar?.contains(el)) {
    (el as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function ensureSidebarExpanded(expandSidebar?: () => void) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar?.classList.contains('collapsed')) {
    expandSidebar?.();
  }
  // Mobile: open sidebar when highlighting nav targets
  if (sidebar && !sidebar.classList.contains('mobile-open') && window.matchMedia('(max-width: 1024px)').matches) {
    document.getElementById('sbOverlay')?.classList.add('active');
    sidebar.classList.add('mobile-open');
  }
}

function syncPopoverChrome(
  popover: {
    wrapper?: HTMLElement | null;
    previousButton?: HTMLElement | null;
    nextButton?: HTMLElement | null;
    closeButton?: HTMLElement | null;
  },
  d: Driver,
  t: TourTranslate,
) {
  const index = d.getActiveIndex() ?? 0;
  const isFirst = index === 0;
  const isLast = d.isLastStep();
  const wrapper = popover.wrapper;

  wrapper?.classList.toggle('mv-tour-hide-back', isFirst);
  wrapper?.classList.toggle('mv-tour-last-step', isLast);

  // First step: no Back
  if (popover.previousButton) {
    popover.previousButton.style.display = isFirst ? 'none' : '';
    popover.previousButton.setAttribute('aria-hidden', isFirst ? 'true' : 'false');
  }

  // Last step: Finish only (driver already swaps label; ensure no "Next")
  if (popover.nextButton) {
    if (isFirst) {
      popover.nextButton.innerText = t('tour.controls.start', 'Start');
    } else if (isLast) {
      popover.nextButton.innerText = t('tour.controls.finish', 'Finish');
    } else {
      popover.nextButton.innerText = t('tour.controls.next', 'Next');
    }
  }

  if (popover.closeButton) {
    const skipLabel = t('tour.controls.skip', 'Skip');
    popover.closeButton.setAttribute('aria-label', skipLabel);
    popover.closeButton.title = skipLabel;
    // Laravel hides Skip on final step
    popover.closeButton.style.display = isLast ? 'none' : '';
  }
}

export function destroyOnboardingTour(options?: { persist?: boolean }) {
  persistOnDestroy = options?.persist ?? false;
  try {
    activeDriver?.destroy();
  } catch {
    // ignore
  }
  activeDriver = null;
  document.body.classList.remove('mv-onboarding-active');
  persistOnDestroy = true;
}

export function isOnboardingTourRunning(): boolean {
  return activeDriver !== null;
}

export interface StartOnboardingTourOptions {
  t: TourTranslate;
  onComplete: () => void | Promise<void>;
  expandSidebar?: () => void;
}

export function startOnboardingTour(options: StartOnboardingTourOptions): Driver {
  destroyOnboardingTour({ persist: false });
  ensureSidebarExpanded(options.expandSidebar);
  persistOnDestroy = true;

  const steps = buildOnboardingSteps(options.t).map((step) => {
    if (!step.element || typeof step.element !== 'string') return step;
    const el = document.querySelector(step.element);
    if (!el) {
      return { popover: step.popover };
    }
    return step;
  });

  let completed = false;
  const finish = async () => {
    if (completed) return;
    completed = true;
    document.body.classList.remove('mv-onboarding-active');
    activeDriver = null;
    await options.onComplete();
  };

  activeDriver = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    disableActiveInteraction: true,
    overlayOpacity: 0.62,
    stagePadding: 8,
    stageRadius: 12,
    smoothScroll: true,
    popoverClass: 'mv-tour-popover',
    overlayClickBehavior: () => undefined,
    steps,
    nextBtnText: options.t('tour.controls.next', 'Next'),
    prevBtnText: options.t('tour.controls.back', 'Back'),
    doneBtnText: options.t('tour.controls.finish', 'Finish'),
    progressText: '{{current}} / {{total}}',
    onPopoverRender: (popover, { driver: d }) => {
      syncPopoverChrome(popover, d, options.t);
    },
    onHighlightStarted: (_el, _step, { driver: d }) => {
      document.body.classList.add('mv-onboarding-active');
      ensureSidebarExpanded(options.expandSidebar);
      scrollTourTargetIntoView(d.getActiveElement());
      // Re-apply chrome after highlight (driver re-renders footer)
      requestAnimationFrame(() => {
        const pop = d.getState?.('popover') as
          | {
              wrapper?: HTMLElement | null;
              previousButton?: HTMLElement | null;
              nextButton?: HTMLElement | null;
              closeButton?: HTMLElement | null;
            }
          | undefined;
        if (pop) syncPopoverChrome(pop, d, options.t);
      });
    },
    onDestroyStarted: (_el, _step, { driver: d }) => {
      const shouldPersist = persistOnDestroy;
      if (!d.isActive()) return;
      d.destroy();
      if (shouldPersist) {
        void finish();
      }
    },
  });

  activeDriver.drive();
  return activeDriver;
}
