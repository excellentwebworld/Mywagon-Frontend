import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Send,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import type { DetailNote } from '../../pages/ShipmentDetail/detailViewModel';
import { formatUtcToDisplayDateTime } from '../../utils/timezone';
import { CollapsibleCard } from './CollapsibleCard';

interface NotesCardProps {
  notes: DetailNote[];
  expanded: boolean;
  onToggle: () => void;
  onAddNote?: (body: string, visibility: 'internal' | 'carrier') => void;
  onUpdateNote?: (
    noteId: string,
    body: string,
    visibility: 'internal' | 'carrier'
  ) => Promise<void> | void;
  onDeleteNote?: (noteId: string) => Promise<void> | void;
  updatingNoteId?: string | null;
  deletingNoteId?: string | null;
  onToast: (msg: string) => void;
  t: (key: string, fallback?: string) => string;
}

const NOTE_MAX_LEN = 130;

function NoteItem({
  note,
  t,
  onUpdateNote,
  onDeleteNote,
  isUpdating,
  isDeleting,
}: {
  note: DetailNote;
  t: (key: string, fallback?: string) => string;
  onUpdateNote?: (
    noteId: string,
    body: string,
    visibility: 'internal' | 'carrier'
  ) => Promise<void> | void;
  onDeleteNote?: (noteId: string) => Promise<void> | void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(note.body || '');
  const [editVisibility, setEditVisibility] = useState<'internal' | 'carrier'>(
    note.visibility === 'carrier' ? 'carrier' : 'internal'
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const text = note.body || '';
  const isLong = text.length > NOTE_MAX_LEN;
  const isBusy = Boolean(isUpdating || isDeleting);
  const canEdit = Boolean(onUpdateNote);
  const canDelete = Boolean(onDeleteNote);

  const startEdit = () => {
    setEditBody(note.body || '');
    setEditVisibility(note.visibility === 'carrier' ? 'carrier' : 'internal');
    setConfirmDelete(false);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const trimmed = editBody.trim();
    if (!trimmed || !onUpdateNote || isBusy) return;
    await onUpdateNote(note.id, trimmed, editVisibility);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDeleteNote || isBusy) return;
    await onDeleteNote(note.id);
    setConfirmDelete(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
        <textarea
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          rows={2}
          disabled={isBusy}
          className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-purple-500 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name={`note-edit-vis-${note.id}`}
                checked={editVisibility === 'internal'}
                onChange={() => setEditVisibility('internal')}
                disabled={isBusy}
              />
              <span>{t('internal', 'Internal')}</span>
            </label>
            <label className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name={`note-edit-vis-${note.id}`}
                checked={editVisibility === 'carrier'}
                onChange={() => setEditVisibility('carrier')}
                disabled={isBusy}
              />
              <span>{t('carrierVisible', 'Carrier visible')}</span>
            </label>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isBusy}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-60"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={isBusy || !editBody.trim()}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#9B51E0] hover:bg-[#883cd1] text-white cursor-pointer flex items-center gap-1 disabled:opacity-60"
            >
              {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              <span>{t('save', 'Save')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 transition-all bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/90">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-slate-900 dark:text-white leading-relaxed break-words font-medium">
            <span>{isLong && !expanded ? `${text.slice(0, NOTE_MAX_LEN)}…` : text}</span>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="ml-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer bg-transparent border-0"
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
          <div className="text-[11px] mt-1.5 flex items-center gap-2 flex-wrap text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{note.author}</span>
            <span>·</span>
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
              {formatUtcToDisplayDateTime(note.timestamp)}
            </span>
            <span>·</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                note.visibility === 'carrier'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              {note.visibility === 'carrier'
                ? t('carrierVisible', 'Carrier visible')
                : t('internal', 'Internal')}
            </span>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
            {canEdit && (
              <button
                type="button"
                disabled={isBusy}
                onClick={startEdit}
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-60 bg-transparent border-0"
                title={t('editNote', 'Edit note')}
              >
                <Pencil size={13} />
              </button>
            )}
            {canDelete && !confirmDelete && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 active:scale-95 transition-all cursor-pointer disabled:opacity-60 bg-transparent border-0"
                title={t('deleteNote', 'Delete note')}
              >
                {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            )}
            {canDelete && confirmDelete && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleDelete()}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-60"
                >
                  {isDeleting ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    t('delete', 'Delete')
                  )}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmDelete(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-0 cursor-pointer"
                  title={t('cancel', 'Cancel')}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const NotesCard: React.FC<NotesCardProps> = ({
  notes,
  expanded,
  onToggle,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  updatingNoteId = null,
  deletingNoteId = null,
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
            className="text-[12px] font-semibold mb-2.5 flex items-center gap-1 cursor-pointer text-purple-600 dark:text-purple-400 hover:underline bg-transparent border-0"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={13} />
            <span>{t('addNote', '+ Add note')}</span>
          </button>
        ) : (
          <div className="mb-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t('enterNotePlaceholder', 'Type note instructions…')}
              rows={2}
              className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-purple-500"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="note-vis"
                    checked={visibility === 'internal'}
                    onChange={() => setVisibility('internal')}
                  />
                  <span>{t('internal', 'Internal')}</span>
                </label>
                <label className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
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
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#9B51E0] hover:bg-[#883cd1] text-white cursor-pointer flex items-center gap-1"
                >
                  <Send size={11} />
                  <span>{t('save', 'Save')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {t('noNotesRecorded', 'No special notes recorded for this load.')}
          </p>
        ) : (
          <div className="space-y-2.5">
            {notes.map((n) => (
              <NoteItem
                key={n.id}
                note={n}
                t={t}
                onUpdateNote={onUpdateNote}
                onDeleteNote={onDeleteNote}
                isUpdating={updatingNoteId === n.id}
                isDeleting={deletingNoteId === n.id}
              />
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
