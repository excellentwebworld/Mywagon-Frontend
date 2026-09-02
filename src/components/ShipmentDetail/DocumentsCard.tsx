import React, { useState } from 'react';
import {
  Paperclip,
  Plus,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Trash2,
  Loader2,
  FileType,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DetailDocument } from '../../pages/ShipmentDetail/detailViewModel';
import { formatUtcToDisplayDateTime } from '../../utils/timezone';
import { CollapsibleCard } from './CollapsibleCard';

interface DocumentsCardProps {
  documents: DetailDocument[];
  expanded: boolean;
  onToggle: () => void;
  onUpload?: () => void;
  onDownload?: (doc: DetailDocument) => void;
  downloadingDocId?: string | number | null;
  onDelete?: (doc: DetailDocument) => void;
  deletingDocId?: string | number | null;
  onToast: (msg: string) => void;
  t: (key: string, fallback?: string) => string;
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(fileName?: string, fileType?: string | null): string {
  const fromName = (fileName || '').split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const ft = (fileType || '').toLowerCase();
  if (ft.includes('/')) return ft.split('/').pop() || '';
  return ft || 'file';
}

type DocKind = 'image' | 'pdf' | 'doc' | 'other';

function getDocKind(fileType?: string | null, fileName?: string): DocKind {
  const ext = getExtension(fileName, fileType);
  if (
    ext === 'png' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'webp' ||
    ext === 'gif' ||
    (fileType || '').toLowerCase().includes('image')
  ) {
    return 'image';
  }
  if (ext === 'pdf' || (fileType || '').toLowerCase().includes('pdf')) return 'pdf';
  if (ext === 'doc' || ext === 'docx' || (fileType || '').toLowerCase().includes('word')) return 'doc';
  return 'other';
}

const kindStyles: Record<
  DocKind,
  { bg: string; text: string; border: string; badgeBg: string; badgeText: string }
> = {
  image: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#2563EB]',
    border: 'border-[#DBEAFE]',
    badgeBg: 'bg-[#DBEAFE]',
    badgeText: 'text-[#1D4ED8]',
  },
  pdf: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#DC2626]',
    border: 'border-[#FEE2E2]',
    badgeBg: 'bg-[#FEE2E2]',
    badgeText: 'text-[#B91C1C]',
  },
  doc: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#2563EB]',
    border: 'border-[#DBEAFE]',
    badgeBg: 'bg-[#DBEAFE]',
    badgeText: 'text-[#1D4ED8]',
  },
  other: {
    bg: 'bg-[#F5F5F7]',
    text: 'text-[#5E5E6E]',
    border: 'border-[#E4E4E8]',
    badgeBg: 'bg-[#E4E4E8]',
    badgeText: 'text-[#5E5E6E]',
  },
};

function DocIcon({ kind }: { kind: DocKind }) {
  const style = kindStyles[kind];
  const Icon = kind === 'image' ? ImageIcon : kind === 'pdf' ? FileType : FileText;
  return (
    <span
      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon size={17} strokeWidth={2} />
    </span>
  );
}

function formatUploadedAt(value?: string | null): string {
  if (!value) return '';
  const formatted = formatUtcToDisplayDateTime(value);
  return formatted || value;
}

const DESCRIPTION_MAX_LEN = 110;

interface DocItemProps {
  doc: DetailDocument;
  isBusy: boolean;
  downloadingDocId?: string | number | null;
  deletingDocId?: string | number | null;
  onDownload?: (doc: DetailDocument) => void;
  onDelete?: (doc: DetailDocument) => void;
  t: (key: string, fallback?: string) => string;
}

const DocItem: React.FC<DocItemProps> = ({
  doc,
  isBusy,
  downloadingDocId,
  deletingDocId,
  onDownload,
  onDelete,
  t,
}) => {
  const [descExpanded, setDescExpanded] = useState(false);
  const kind = getDocKind(doc.fileType, doc.fileName);
  const style = kindStyles[kind];
  const ext = getExtension(doc.fileName, doc.fileType).toUpperCase();
  const uploadedAt = formatUploadedAt(doc.createdAt);
  const sizeLabel = formatSize(doc.fileSize);
  const desc = (doc.description || '').trim();
  const hasLongDesc = desc.length > DESCRIPTION_MAX_LEN;

  return (
    <div className="p-3.5 rounded-xl bg-[#F8F8FA] hover:bg-[#F2F2F6] border border-[#EAEAEF] transition-all group">
      <div className="flex items-start gap-3">
        <DocIcon kind={kind} />

        <div className="flex-1 min-w-0">
          {/* Header Row: Title & Action Buttons */}
          <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-bold text-[#18181B] leading-snug break-words">
                  {doc.name}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${style.badgeBg} ${style.badgeText}`}
                >
                  {ext}
                </span>
              </div>

              {doc.fileName && doc.fileName !== doc.name && (
                <div
                  className="text-[11px] text-[#8E8E9A] mt-0.5 truncate font-mono"
                  title={doc.fileName}
                >
                  {doc.fileName}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-1 sm:mt-0">
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#5E5E6E] bg-white hover:bg-gray-50 hover:text-[#18181B] border border-[#DCDCE2] shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title={t('viewInTab', 'View file')}
                >
                  <ExternalLink size={12} />
                  <span>{t('view', 'View')}</span>
                </a>
              )}

              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (onDownload) onDownload(doc);
                  else if (doc.url) window.open(doc.url, '_blank');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#9B51E0] bg-white hover:bg-[#9B51E0]/10 border border-[#E9D5FF] shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                title={t('downloadDocument', 'Download')}
              >
                {downloadingDocId === doc.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                <span>{t('download', 'Download')}</span>
              </button>

              {onDelete && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onDelete(doc)}
                  className="p-1.5 rounded-lg text-[#8E8E9A] hover:text-[#EF4444] hover:bg-red-50 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                  title={t('deleteDocument', 'Delete document')}
                  style={{ background: 'none', border: 'none' }}
                >
                  {deletingDocId === doc.id ? (
                    <Loader2 size={13} className="animate-spin text-red-500" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Description with Show More / Show Less */}
          {desc && (
            <div className="mt-2 text-[12px] text-[#4B4B58] leading-relaxed break-words bg-white/70 p-2 rounded-lg border border-[#ECECEF]">
              <span>
                {hasLongDesc && !descExpanded
                  ? `${desc.slice(0, DESCRIPTION_MAX_LEN)}…`
                  : desc}
              </span>
              {hasLongDesc && (
                <button
                  type="button"
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="ml-1 text-[11px] font-bold text-[#9B51E0] hover:text-[#7E38C4] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  style={{ background: 'none', border: 'none' }}
                >
                  {descExpanded ? (
                    <>
                      <span>{t('showLess', 'Show less')}</span>
                      <ChevronUp size={11} />
                    </>
                  ) : (
                    <>
                      <span>{t('showMore', 'Show more')}</span>
                      <ChevronDown size={11} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Meta Info Row */}
          <div className="text-[11px] mt-2 flex items-center gap-2 flex-wrap text-[#8E8E9A]">
            {doc.uploadedBy && (
              <span className="font-semibold text-[#5E5E6E]">{doc.uploadedBy}</span>
            )}
            {doc.uploadedBy && uploadedAt && <span>·</span>}
            {uploadedAt && (
              <span className="font-mono text-[10px] text-[#71717A] tracking-tight">
                {uploadedAt}
              </span>
            )}
            {sizeLabel && (doc.uploadedBy || uploadedAt) && <span>·</span>}
            {sizeLabel && (
              <span className="font-medium text-[#71717A]">{sizeLabel}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DocumentsCard: React.FC<DocumentsCardProps> = ({
  documents,
  expanded,
  onToggle,
  onUpload,
  onDownload,
  downloadingDocId = null,
  onDelete,
  deletingDocId = null,
  onToast,
  t,
}) => {
  return (
    <CollapsibleCard
      id="docs"
      icon={<Paperclip size={15} />}
      title={t('documentsAttachments', 'Documents & attachments')}
      count={documents.length > 0 ? documents.length : undefined}
      expanded={expanded}
      onToggle={onToggle}
      headerExtra={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onUpload) onUpload();
            else onToast(t('uploadDocument', 'Upload document'));
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-[#9B51E0] hover:bg-[#883cd1] active:scale-95 shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
        >
          <Plus size={12} />
          <span>{t('upload', 'Upload')}</span>
        </button>
      }
    >
      <div>
        {documents.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#E4E4E8] bg-[#F8F7FC]/50">
            <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-[#F0F0F3] flex items-center justify-center text-[#8E8E9A]">
              <Paperclip size={18} />
            </div>
            <p className="text-[12px] m-0 text-[#8E8E9A] font-medium leading-relaxed">
              {t('noDocumentsUploaded', 'No documents uploaded yet. Click Upload to attach files.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc, idx) => (
              <DocItem
                key={doc.id || idx}
                doc={doc}
                isBusy={downloadingDocId === doc.id || deletingDocId === doc.id}
                downloadingDocId={downloadingDocId}
                deletingDocId={deletingDocId}
                onDownload={onDownload}
                onDelete={onDelete}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};

