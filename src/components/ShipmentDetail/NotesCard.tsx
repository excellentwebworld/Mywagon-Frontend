import React, { useState } from 'react';
import { FileText, Plus, Send, ChevronDown, ChevronUp } from 'lucide-react';
import type { DetailNote } from '../../pages/ShipmentDetail/detailViewModel';
import { formatUtcToDisplayDateTime } from '../../utils/timezone';
import { CollapsibleCard } from './CollapsibleCard';

interface NotesCardProps {
  notes: DetailNote[];
  expanded: boolean;
  onToggle: () => void;
  onAddNote?: (body: string, visibility: 'internal' | 'carrier') => void;
  onToast: (msg: string) => void;
  t: (key: string, fallback?: string) => string;
}

const NOTE_MAX_LEN = 130;

function NoteItem({
  note,
  t,
}: {
  note: DetailNote;
  t: (key: string, fallback?: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = note.body || '';
  const isLong = text.length > NOTE_MAX_LEN;

  return (
    <div
      key={note.id}
      className="p-3 rounded-xl border border-[#EAEAEF] transition-all bg-[#F8F8FA] hover:bg-[#F2F2F6]"
    >
      <div className="text-[13px] text-[#18181B] leading-relaxed break-words font-medium">
        <span>{isLong && !expanded ? `${text.slice(0, NOTE_MAX_LEN)}…` : text}</span>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-1.5 text-[11px] font-bold text-[#9B51E0] hover:text-[#7E38C4] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            style={{ background: 'none', border: 'none' }}
          >
            {expanded ? (
              <>
                <span>{t('readLess', 'Read less')}</span>
                <ChevronUp size={11} />
              </>
            ) : (
              <>
                <span>{t('readMore', 'Read more')}</span>
                <ChevronDown size={11} />
              </>
            )}
          </button>
        )}
      </div>
      <div className="text-[11px] mt-1.5 flex items-center gap-2 flex-wrap text-[#8E8E9A]">
        <span className="font-semibold text-[#5E5E6E]">{note.author}</span>
        <span>·</span>
        <span className="font-mono text-[10px] text-[#71717A]">
          {formatUtcToDisplayDateTime(note.timestamp)}
        </span>
        <span>·</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
            note.visibility === 'carrier'
              ? 'bg-[#EFF6FF] text-[#1D4ED8]'
              : 'bg-[#F0F0F3] text-[#5E5E6E]'
          }`}
        >
          {note.visibility === 'carrier'
            ? t('carrierVisible', 'Carrier visible')
            : t('internal', 'Internal')}
        </span>
      </div>
    </div>
  );
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
          <div className="space-y-2.5">
            {notes.map((n) => (
              <NoteItem key={n.id} note={n} t={t} />
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
