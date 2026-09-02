import React from 'react';
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
      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon size={18} strokeWidth={2} />
    </span>
  );
}

function formatUploadedAt(value?: string | null): string {
  if (!value) return '';
  const formatted = formatUtcToDisplayDateTime(value);
  return formatted || value;
}

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
          <div className="space-y-2">
            {documents.map((doc, idx) => {
              const kind = getDocKind(doc.fileType, doc.fileName);
              const style = kindStyles[kind];
              const ext = getExtension(doc.fileName, doc.fileType).toUpperCase();
              const uploadedAt = formatUploadedAt(doc.createdAt);
              const sizeLabel = formatSize(doc.fileSize);
              const isBusy = downloadingDocId === doc.id || deletingDocId === doc.id;

              return (
                <div
                  key={doc.id || idx}
                  className="p-3 rounded-xl bg-[#F5F5F7] border border-transparent hover:border-[#E4E4E8] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <DocIcon kind={kind} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className="text-[13px] font-semibold text-[#18181B] m-0 leading-snug break-words"
                              title={doc.name}
                            >
                              {doc.name}
                            </h4>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${style.badgeBg} ${style.badgeText}`}
                            >
                              {ext}
                            </span>
                          </div>

                          {doc.fileName && doc.fileName !== doc.name && (
                            <p
                              className="text-[11px] text-[#8E8E9A] m-0 mt-0.5 truncate"
                              title={doc.fileName}
                            >
                              {doc.fileName}
                            </p>
                          )}

                          {doc.description && (
                            <p className="text-[12px] text-[#5E5E6E] m-0 mt-1.5 leading-relaxed break-words">
                              {doc.description}
                            </p>
                          )}

                          <div className="text-[11px] mt-1.5 flex items-center gap-1.5 flex-wrap text-[#8E8E9A]">
                            {doc.uploadedBy && <span className="font-medium text-[#5E5E6E]">{doc.uploadedBy}</span>}
                            {doc.uploadedBy && uploadedAt && <span aria-hidden>·</span>}
                            {uploadedAt && (
                              <span
                                className="font-mono text-[10px] tracking-tight"
                                title={doc.createdAt || undefined}
                              >
                                {uploadedAt}
                              </span>
                            )}
                            {sizeLabel && (doc.uploadedBy || uploadedAt) && <span aria-hidden>·</span>}
                            {sizeLabel && <span>{sizeLabel}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-lg text-[#5E5E6E] bg-white hover:bg-[#F8F7FC] hover:text-[#18181B] border border-[#E4E4E8] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/40"
                              title={t('viewInTab', 'View file in new tab')}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (onDownload) onDownload(doc);
                              else if (doc.url) window.open(doc.url, '_blank');
                            }}
                            className="p-2 rounded-lg text-[#9B51E0] bg-white hover:bg-[#9B51E0]/10 border border-[#E9D5FF] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/40 disabled:opacity-60"
                            title={
                              downloadingDocId === doc.id
                                ? t('downloading', 'Downloading...')
                                : t('downloadDocument', 'Download document')
                            }
                          >
                            {downloadingDocId === doc.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>

                          {onDelete && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onDelete(doc)}
                              className="p-2 rounded-lg text-[#EF4444] bg-white hover:bg-red-50 border border-[#FEE2E2] active:scale-95 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:opacity-60"
                              title={t('deleteDocument', 'Delete document')}
                            >
                              {deletingDocId === doc.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};
