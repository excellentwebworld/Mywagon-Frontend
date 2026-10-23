import React from 'react';
import { Link } from 'react-router-dom';
import type { PublishedLoad } from './loadCopies';

type Translate = (key: string, fallbackOrOptions?: string | Record<string, unknown>, options?: Record<string, unknown>) => string;

interface PublishedCopiesModalProps {
  loads: PublishedLoad[];
  t: Translate;
  onClose: () => void;
}

/**
 * MS3-403: success screen after publishing N copies of one load. Lists every
 * created load (each its own SID, bid on individually) with a link to it.
 */
export const PublishedCopiesModal: React.FC<PublishedCopiesModalProps> = ({ loads, t, onClose }) => (
  <div className="modal-bg show" role="dialog" aria-modal="true" aria-labelledby="published-copies-title">
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-h">
        <span id="published-copies-title">
          {t('publishedCopiesTitle', `${loads.length} shipments created`, { count: loads.length })}
        </span>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label={t('createShipment.closeModal', 'Close modal')}
        >
          ✕
        </button>
      </div>
      <div className="modal-body">
        <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          {t('publishedCopiesBody', 'Each load was posted separately and receives its own bids.')}
        </p>
        <ul data-testid="published-copies-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {loads.map((load, index) => (
            <li
              key={load.id}
              className="flex items-center justify-between gap-3"
              style={{ padding: '8px 0', borderTop: index === 0 ? 'none' : '1px solid var(--border)' }}
            >
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {load.auto_id || `#${load.id}`}
              </span>
              <Link
                to={`/shipments/${load.id}`}
                className="text-xs font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                {t('publishedCopiesOpen', 'Open')}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-p btn-sm" onClick={onClose}>
          {t('publishedCopiesViewAll', 'Go to shipments')}
        </button>
      </div>
    </div>
  </div>
);

export default PublishedCopiesModal;
