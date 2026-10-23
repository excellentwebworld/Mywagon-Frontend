/**
 * MS3-407: "Continue your unfinished shipment" on the welcome screen. A shipper who closed the browser in the middle of
 * creating a load is offered to carry on: Continue opens that chat, whose load comes back live at the step it stopped
 * at (`intake.resume`). The gateway read (R1c) writes nothing; a failed read shows nothing.
 */
import { useEffect, useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { findUnfinishedIntake } from './intakeService';
import { unfinishedOf, type UnfinishedLoad } from './unfinishedModel';

export function UnfinishedLoadBanner({
  enabled, lang, t, onContinue, load = findUnfinishedIntake,
}: {
  /** Only on the empty welcome screen with the gateway ready. */
  enabled: boolean;
  lang: string;
  t: (key: string, params?: Record<string, string>) => string;
  onContinue: (conversationId: string) => void;
  /** Test seam. */
  load?: typeof findUnfinishedIntake;
}) {
  const [found, setFound] = useState<UnfinishedLoad | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!enabled || dismissed) return;
    const controller = new AbortController();
    load(lang, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setFound(unfinishedOf(res));
      })
      .catch(() => { /* nothing to offer */ });
    return () => controller.abort();
  }, [enabled, dismissed, lang, load]);

  if (!enabled || dismissed || !found) return null;
  return (
    <section className="vai-resume" data-testid="vai-resume-intake" aria-label={t('vagonai.empty.resumeTitle')}>
      <span className="vai-resume-icon" aria-hidden="true"><PackageOpen size={18} /></span>
      <span className="vai-resume-text">
        <span className="vai-resume-title">{t('vagonai.empty.resumeTitle')}</span>
        <span className="vai-resume-sub">{found.route ?? t('vagonai.empty.resumeUnnamed')}</span>
      </span>
      <span className="vai-resume-actions">
        <button type="button" className="vai-resume-go" data-testid="vai-resume-continue" onClick={() => onContinue(found.conversationId)}>
          {t('vagonai.empty.resumeContinue')}
        </button>
        <button type="button" className="vai-resume-later" data-testid="vai-resume-dismiss" onClick={() => setDismissed(true)}>
          {t('vagonai.empty.resumeDismiss')}
        </button>
      </span>
    </section>
  );
}
