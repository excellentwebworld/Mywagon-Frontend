import React from 'react';
import { Paperclip, Plus, FileText, Image as ImageIcon, Download, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import type { DetailDocument } from '../../pages/ShipmentDetail/detailViewModel';
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
  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageDoc = (fileType?: string | null, fileName?: string) => {
    const ft = (fileType || '').toLowerCase();
    const fn = (fileName || '').toLowerCase();
    return (
      ft.includes('image') ||
      ft === 'png' ||
      ft === 'jpg' ||
      ft === 'jpeg' ||
      ft === 'webp' ||
      fn.endsWith('.png') ||
      fn.endsWith('.jpg') ||
      fn.endsWith('.jpeg') ||
      fn.endsWith('.webp')
    );
  };

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
          <div className="text-center py-6 px-4 rounded-xl border border-dashed border-[#E4E4E8] bg-[#F8F7FC]/50">
            <p className="text-[12px] m-0 text-[#8E8E9A] font-medium">
              {t('noDocumentsUploaded', 'No documents uploaded yet. Click Upload to attach files.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E4E4E8]">
            {documents.map((doc, idx) => {
              const image = isImageDoc(doc.fileType, doc.fileName);

              return (
                <div
                  key={doc.id || idx}
                  className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                        image
                          ? 'bg-[#EFF6FF] text-[#3B82F6] border border-[#DBEAFE]'
                          : 'bg-[#FEF2F2] text-[#EF4444] border border-[#FEE2E2]'
                      }`}
                    >
                      {image ? <ImageIcon size={18} /> : <FileText size={18} />}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#18181B] truncate flex items-center gap-1.5">
                        <span className="truncate">{doc.name}</span>
                        {doc.fileName && (
                          <span className="text-[11px] font-normal text-[#8E8E9A] truncate">
                            ({doc.fileName})
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#8E8E9A] mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {doc.description && (
                          <>
                            <span className="text-[#5E5E6E] font-medium">{doc.description}</span>
                            <span>·</span>
                          </>
                        )}
                        {doc.uploadedBy && (
                          <>
                            <span>{doc.uploadedBy}</span>
                            <span>·</span>
                          </>
                        )}
                        {doc.createdAt && <span>{doc.createdAt}</span>}
                        {Boolean(doc.fileSize) && (
                          <>
                            <span>·</span>
                            <span>{formatSize(doc.fileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-[#5E5E6E] bg-white hover:bg-[#F8F7FC] hover:text-[#18181B] border border-[#E4E4E8] active:scale-95 transition-all cursor-pointer focus:outline-none"
                        title={t('viewInTab', 'View file in new tab')}
                      >
                        <ExternalLink size={12} />
                        <span>{t('view', 'View')}</span>
                      </a>
                    )}

                    <button
                      type="button"
                      disabled={downloadingDocId === doc.id || deletingDocId === doc.id}
                      onClick={() => {
                        if (onDownload) {
                          onDownload(doc);
                        } else if (doc.url) {
                          window.open(doc.url, '_blank');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-[#9B51E0] bg-[#F8F7FC] hover:bg-[#9B51E0]/15 border border-[#E9D5FF] active:scale-95 transition-all cursor-pointer focus:outline-none disabled:opacity-60"
                      title={t('downloadDocument', 'Download document')}
                    >
                      {downloadingDocId === doc.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      <span>{downloadingDocId === doc.id ? t('downloading', 'Downloading...') : t('download', 'Download')}</span>
                    </button>

                    {onDelete && (
                      <button
                        type="button"
                        disabled={downloadingDocId === doc.id || deletingDocId === doc.id}
                        onClick={() => onDelete(doc)}
                        className="p-1.5 rounded-lg text-[#EF4444] bg-white hover:bg-red-50 border border-[#FEE2E2] active:scale-95 transition-all cursor-pointer focus:outline-none disabled:opacity-60"
                        title={t('deleteDocument', 'Delete document')}
                      >
                        {deletingDocId === doc.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    )}
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
