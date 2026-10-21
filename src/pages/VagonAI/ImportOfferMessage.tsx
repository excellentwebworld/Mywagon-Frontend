/**
 * The assistant's question when files arrive with words that do not ask for an
 * import (MS3-366): "Do you want me to import the orders in these files?"
 * [Import] [Not now]. Once answered it stays in the thread as a record of the
 * answer, with nothing left to click.
 */
import { useTranslation } from '../../hooks/useTranslation';
import type { ThreadMessage } from './threadCards';

export function ImportOfferMessage({
  offer, available, disabled, onAnswer,
}: {
  offer: NonNullable<ThreadMessage['importOffer']>;
  /** False once the files are gone from this page's memory (a reload): they must be attached again. */
  available: boolean;
  disabled: boolean;
  onAnswer: (accept: boolean) => void;
}) {
  const { t } = useTranslation();
  const count = offer.files.length;
  if (offer.state === 'accepted') return <p className="vai-offer-note" data-testid="import-offer" data-state="accepted">{t('vagonai.compose.offer.accepted', { count })}</p>;
  if (offer.state === 'declined') return <p className="vai-offer-note" data-testid="import-offer" data-state="declined">{t('vagonai.compose.offer.declined', { count })}</p>;
  if (!available) return <p className="vai-offer-note" data-testid="import-offer" data-state="expired">{t('vagonai.compose.offer.expired', { count })}</p>;
  return (
    <div data-testid="import-offer" data-state="open">
      <p className="vai-offer-question">{t('vagonai.compose.offer.question', { count })}</p>
      <p className="vai-offer-note">{t('vagonai.compose.offer.why')}</p>
      <div className="vai-offer-actions">
        <button type="button" className="vai-linkbtn vai-linkbtn--solid" disabled={disabled} onClick={() => onAnswer(true)} data-testid="import-offer-accept">
          {t('vagonai.compose.offer.import', { count })}
        </button>
        <button type="button" className="vai-linkbtn" disabled={disabled} onClick={() => onAnswer(false)} data-testid="import-offer-decline">
          {t('vagonai.compose.offer.notNow')}
        </button>
      </div>
    </div>
  );
}
