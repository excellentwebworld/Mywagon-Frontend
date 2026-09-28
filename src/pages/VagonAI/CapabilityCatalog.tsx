/**
 * CapabilityCatalog — the answer to "what else can I ask you?".
 *
 * The welcome screen's two tiers are the six things a shipper does most and the
 * six questions they ask most, and they are deliberately weighted so the one
 * real decision on the page stands out. That weighting is also why they cannot
 * simply be extended: the gateway exposes 45 tools, and thirty more equal-sized
 * cards would flatten the twelve that matter into noise.
 *
 * So this is a disclosure, not a third tier. Collapsed, it is one line. Opened,
 * it is the whole surface area grouped by the module it belongs to — the same
 * grouping as the shipper's own left-hand navigation, because a shipper looking
 * for "can it suspend a carrier?" thinks in modules and not in tools.
 *
 * Every chip sends its prompt as the shipper's own message, exactly as the hero
 * chips do. Nothing here is privileged: a tapped chip is worth precisely what
 * typing the same sentence is worth, and a write still stops at a confirmation
 * card. That is what lets the catalogue advertise `remove_partner` without the
 * catalogue itself having to be a permission boundary.
 *
 * What it does NOT do is call a tool directly or link to a page. The point is to
 * teach the composer, so the shipper's second visit needs no catalogue at all.
 */
import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { CAPABILITY_MODULES } from './capabilities';

interface Props {
  /** Sends the chip's prompt as the shipper's next message. */
  onPick: (prompt: string) => void;
  /**
   * Closed on arrival. The hero above it is what a first-time shipper should
   * read, and an open catalogue pushes it off the screen — so this opens only
   * when they have looked at the twelve offers and want more.
   */
  defaultOpen?: boolean;
}

export default function CapabilityCatalog({ onPick, defaultOpen = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="vai-cat" aria-labelledby="vai-cat-toggle">
      <button
        type="button"
        id="vai-cat-toggle"
        className="vai-cat-toggle"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-controls="vai-cat-panel"
      >
        <Sparkles size={14} aria-hidden="true" />
        <span className="vai-cat-toggle-label">{t('vagonai.capabilities.heading')}</span>
        {/*
          The count is the message. "Everything I can do" is a claim; "38 things"
          is the reason to open it, and it is read off the catalogue rather than
          written into the copy so it can never drift from what is inside.
        */}
        <span className="vai-cat-count">
          {CAPABILITY_MODULES.reduce((n, module) => n + module.items.length, 0)}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`vai-cat-chevron${open ? ' vai-cat-chevron--open' : ''}`}
        />
      </button>

      {/*
        Unmounted rather than hidden when closed. Thirty-eight buttons left in
        the DOM behind `display: none` are thirty-eight things a screen reader
        has to be told to skip, and nothing here needs to keep state between
        openings.
      */}
      {open && (
        <div className="vai-cat-panel" id="vai-cat-panel">
          <p className="vai-cat-hint">{t('vagonai.capabilities.hint')}</p>

          {CAPABILITY_MODULES.map(({ key, icon: Icon, items }) => (
            <div className="vai-cat-module" key={key}>
              <h3 className="vai-cat-module-head" id={`vai-cat-${key}`}>
                <Icon size={14} />
                {t(`vagonai.capabilities.modules.${key}`)}
              </h3>
              <div className="vai-chips" role="group" aria-labelledby={`vai-cat-${key}`}>
                {items.map((item) => {
                  const title = t(`vagonai.capabilities.items.${item.key}.title`);
                  const prompt = t(`vagonai.capabilities.items.${item.key}.prompt`);
                  return (
                    <button
                      type="button"
                      key={item.key}
                      className="vai-chip"
                      /*
                        The visible label is the short title; the accessible name
                        carries the whole question, so a screen reader user hears
                        what will be sent rather than a two-word noun. Same rule
                        the hero's own chips follow (WCAG label in name).
                      */
                      aria-label={`${title}: ${prompt}`}
                      onClick={() => onPick(prompt)}
                    >
                      {title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
