import React, { useState } from 'react';
import { FileText, Plus, Send } from 'lucide-react';
import type { DetailNote } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface NotesCardProps {
  notes: DetailNote[];
  expanded: boolean;
  onToggle: () => void;
  onAddNote?: (body: string, visibility: 'internal' | 'carrier') => void;
  onToast: (msg: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const NotesCard: React.FC<NotesCardProps> = ({
  notes,
  expanded,
  onToggle,
  onAddNote,
  onToast,
  t,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'carrier'>('internal');

  const handleSave = () => {
    if (!newNote.trim()) return;
    if (onAddNote) {
      onAddNote(newNote, visibility);
    } else {
      onToast(t('noteAdded', 'Note added successfully'));
    }
    setNewNote('');
    setIsAdding(false);
  };

  return (
    <CollapsibleCard
      id="notes"
      icon={<FileText size={15} />}
      title={t('notesInstructions', 'Notes & instructions')}
      count={notes.length > 0 ? notes.length : undefined}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div>
        {!isAdding ? (
          <button
            type="button"
            className="text-[12px] font-semibold mb-2.5 flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
            style={{ color: '#9B51E0', background: 'none', border: 'none' }}
            onClick={() => setIsAdding(true)}
          >
            <Plus size={13} />
            <span>{t('addNote', '+ Add note')}</span>
          </button>
        ) : (
          <div className="mb-3 p-3 rounded-xl bg-[#F5F5F7] space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t('enterNotePlaceholder', 'Type note instructions…')}
              rows={2}
              className="w-full text-xs p-2 rounded-lg bg-white border border-[#E4E4E8] outline-none focus:border-[#9B51E0]"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-[#5E5E6E] flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="note-vis"
                    checked={visibility === 'internal'}
                    onChange={() => setVisibility('internal')}
                  />
                  <span>{t('internal', 'Internal')}</span>
                </label>
                <label className="text-[11px] text-[#5E5E6E] flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="note-vis"
                    checked={visibility === 'carrier'}
                    onChange={() => setVisibility('carrier')}
                  />
                  <span>{t('carrierVisible', 'Carrier visible')}</span>
                </label>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-[#E4E4E8] text-[#5E5E6E] cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#9B51E0] text-white cursor-pointer flex items-center gap-1"
                >
                  <Send size={11} />
                  <span>{t('save', 'Save')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-[12px]" style={{ color: '#8E8E9A' }}>
            {t('noNotesRecorded', 'No special notes recorded for this load.')}
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div
                key={n.id}
                className="p-2.5 rounded-lg"
                style={{ background: '#F5F5F7' }}
              >
                <div className="text-[13px] font-medium" style={{ color: '#18181B' }}>
                  {n.body}
                </div>
                <div
                  className="text-[11px] mt-1 flex items-center gap-2 flex-wrap"
                  style={{ color: '#8E8E9A' }}
                >
                  <span>{n.author}</span>
                  <span>·</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                    {n.timestamp}
                  </span>
                  <span>·</span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold"
                    style={{
                      background: n.visibility === 'carrier' ? '#EFF6FF' : '#F0F0F3',
                      color: n.visibility === 'carrier' ? '#2563EB' : '#5E5E6E',
                    }}
                  >
                    {n.visibility === 'carrier' ? t('carrier', 'Carrier') : t('internal', 'Internal')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
