import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import { HUBSPOT_EMBED_SCRIPT } from '../../hooks/useBookCall';

interface HubSpotMeetingEmbedProps {
  embedUrl: string;
  externalUrl: string;
}

declare global {
  interface Window {
    hbspt?: {
      meetings?: {
        create: (selector: string) => void;
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadHubSpotScript(): Promise<void> {
  if (window.hbspt?.meetings?.create) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${HUBSPOT_EMBED_SCRIPT}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.hbspt?.meetings?.create) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script_failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = HUBSPOT_EMBED_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script_failed'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export function HubSpotMeetingEmbed({ embedUrl, externalUrl }: HubSpotMeetingEmbedProps) {
  const { t } = useTranslation();
  const containerId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [embedError, setEmbedError] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadHubSpotScript()
      .then(() => {
        if (!cancelled) {
          setScriptReady(true);
          setEmbedError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmbedError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !embedUrl || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    container.innerHTML = '';
    container.className = 'meetings-iframe-container';
    container.setAttribute('data-src', embedUrl);

    try {
      window.hbspt?.meetings?.create('.meetings-iframe-container');
    } catch {
      setEmbedError(true);
    }
  }, [embedUrl, scriptReady]);

  if (embedError) {
    return (
      <div className="support-meeting-fallback">
        <div className="support-meeting-fallback-icon" aria-hidden>
          📅
        </div>
        <p className="support-meeting-fallback-text">{t('support.call.embedError')}</p>
        {externalUrl ? (
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="support-meeting-fallback-link">
            {t('support.call.openExternal')}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="support-meeting-embed">
      <div
        key={embedUrl}
        id={containerId}
        ref={containerRef}
        className="meetings-iframe-container"
        data-src={embedUrl}
      />
    </div>
  );
}
