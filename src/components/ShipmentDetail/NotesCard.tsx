import React from 'react';
import type { DetailNote } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface NotesCardProps {
  notes: DetailNote[];
  expanded: boolean;
  onToggle: () => void;
  onToast: (msg: string) => void;
  t: (key: string) => string;
}

export const NotesCard: React.FC<NotesCardProps> = ({ notes, expanded, onToggle, onToast, t }) => (
  <CollapsibleCard title={<>📝 {t('notesInstructions')}</>} expanded={expanded} onToggle={onToggle}>
    <button type="button" className="ld-card-link" onClick={() => onToast(t('addNote'))}>
      + {t('addNote')}
    </button>
    {notes.map((note) => (
      <div key={note.id} className="ld-note">
        <div className="ld-note-meta">
          <strong>{note.author}</strong> · {note.timestamp}{' '}
          <span className={`ld-bg ${note.visibility === 'internal' ? 'ld-bg-gr' : 'ld-bg-ac'}`} style={{ fontSize: 9 }}>
            {note.visibility === 'internal' ? t('internal') : t('carrierVisible')}
          </span>
        </div>
        {note.body}
      </div>
    ))}
  </CollapsibleCard>
);
