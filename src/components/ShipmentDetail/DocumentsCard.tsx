import React from 'react';
import type { DetailDocument } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface DocumentsCardProps {
  documents: DetailDocument[];
  expanded: boolean;
  onToggle: () => void;
  onToast: (msg: string) => void;
  t: (key: string) => string;
}

const DOC_ICON: Record<DetailDocument['status'], string> = {
  ok: '✓',
  miss: '✕',
  rev: '◎',
};

export const DocumentsCard: React.FC<DocumentsCardProps> = ({
  documents,
  expanded,
  onToggle,
  onToast,
  t,
}) => (
  <CollapsibleCard id="docs" title={<>📎 {t('documentsAttachments')}</>} expanded={expanded} onToggle={onToggle}>
    <button type="button" className="ld-card-link" onClick={() => onToast(t('upload'))}>
      + {t('upload')}
    </button>
    {documents.map((doc) => (
      <div key={doc.id} className="ld-doc-row">
        <div className={`ld-doc-icon ${doc.status}`}>{DOC_ICON[doc.status]}</div>
        <div className="ld-doc-info">
          <div className="dn">{doc.name}</div>
          <div className="ds">{doc.subtitle}</div>
        </div>
        <div className="ld-doc-acts">
          {doc.actions.map((action) => (
            <button
              key={action}
              type="button"
              className={`btn btn-sm ${action.includes('Request') ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onToast(action)}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    ))}
  </CollapsibleCard>
);
