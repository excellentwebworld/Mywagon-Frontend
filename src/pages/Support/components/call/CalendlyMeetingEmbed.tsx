import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';

interface CalendlyMeetingEmbedProps {
  url: string;
}

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: Record<string, unknown>;
        utm?: Record<string, unknown>;
      }) => void;
      initPopupWidget?: (options: { url: string }) => void;
    };
  }
}

const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_CSS = 'https://assets.calendly.com/assets/external/widget.css';

let scriptPromise: Promise<void> | null = null;

function loadCalendlyAssets(): Promise<void> {
  if (window.Calendly?.initInlineWidget) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    // Inject CSS if not already in document head
    if (!document.querySelector(`link[href="${CALENDLY_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CALENDLY_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${CALENDLY_SCRIPT}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.Calendly?.initInlineWidget) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('calendly_script_failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = CALENDLY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('calendly_script_failed'));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export function CalendlyMeetingEmbed({ url }: CalendlyMeetingEmbedProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadCalendlyAssets()
      .then(() => {
        if (!cancelled && containerRef.current && window.Calendly?.initInlineWidget) {
          containerRef.current.innerHTML = '';
          window.Calendly.initInlineWidget({
            url,
            parentElement: containerRef.current,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loadError) {
    return (
      <div className="support-meeting-fallback">
        <div className="support-meeting-fallback-icon" aria-hidden>
          <Calendar size={24} strokeWidth={1.75} />
        </div>
        <p className="support-meeting-fallback-text">
          {t('support.call.embedError', 'Scheduler failed to load. Try opening in a new tab.')}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="support-meeting-fallback-link"
        >
          <ExternalLink size={14} style={{ marginRight: 6 }} />
          {t('support.call.openExternal', 'Open scheduler in new tab')}
        </a>
      </div>
    );
  }

  return (
    <div className="support-calendly-container">
      <div
        ref={containerRef}
        className="calendly-inline-widget"
        data-url={url}
        style={{ minWidth: '320px', height: '700px', width: '100%' }}
      />
    </div>
  );
}
