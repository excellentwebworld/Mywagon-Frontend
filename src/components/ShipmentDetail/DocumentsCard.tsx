import React from 'react';
import { Paperclip, Plus, FileText, Image as ImageIcon, Download, ExternalLink, Trash2 } from 'lucide-react';
import type { DetailDocument } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface DocumentsCardProps {
  documents: DetailDocument[];
  expanded: boolean;
  onToggle: () => void;
  onUpload?: () => void;
  onDownload?: (doc: DetailDocument) => void;
  onDelete?: (doc: DetailDocument) => void;
  onToast: (msg: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const DocumentsCard: React.FC<DocumentsCardProps> = ({
  documents,
  expanded,
  onToggle,
  onUpload,
  onDownload,
  onDelete,
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
    >
      <div>
        <button
          type="button"
          onClick={onUpload || (() => onToast(t('uploadDocument', 'Upload document')))}
          className="text-[12px] font-semibold mb-3 flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
          style={{ color: '#9B51E0', background: 'none', border: 'none', padding: 0 }}
        >
          <Plus size={13} />
          <span>{t('upload', '+ Upload')}</span>
        </button>

        {documents.length === 0 ? (
          <p className="text-[12px] m-0 py-2" style={{ color: '#8E8E9A' }}>
            {t('noDocumentsUploaded', 'No documents uploaded yet. Click + Upload to attach documents.')}
          </p>
        ) : (
          <div className="space-y-0">
            {documents.map((doc, idx) => {
              const image = isImageDoc(doc.fileType, doc.fileName);

              return (
                <div
                  key={doc.id || idx}
                  className="flex items-center justify-between gap-3 py-3"
                  style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: image ? '#EFF6FF' : '#FEF2F2',
                        color: image ? '#3B82F6' : '#EF4444',
                        border: image ? '1px solid #DBEAFE' : '1px solid #FEE2E2',
                      }}
                    >
                      {image ? <ImageIcon size={18} /> : <FileText size={18} />}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#18181B] truncate flex items-center gap-1.5">
                        <span>{doc.name}</span>
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
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-[#5E5E6E] bg-[#FAFAFC] hover:bg-[#F0F0F3] border border-[#E4E4E8] transition-colors cursor-pointer"
                        title={t('viewInTab', 'View file in new tab')}
                      >
                        <ExternalLink size={12} />
                        <span>{t('view', 'View')}</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (onDownload) {
                          onDownload(doc);
                        } else if (doc.url) {
                          window.open(doc.url, '_blank');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-[#9B51E0] bg-[#9B51E0]/5 hover:bg-[#9B51E0]/10 border border-[#9B51E0]/20 transition-colors cursor-pointer"
                      title={t('downloadDocument', 'Download document')}
                    >
                      <Download size={12} />
                      <span>{t('download', 'Download')}</span>
                    </button>

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(doc)}
                        className="p-1.5 rounded-lg text-[#8E8E9A] hover:text-[#EF4444] hover:bg-red-50 transition-colors cursor-pointer"
                        style={{ background: 'none', border: 'none' }}
                        title={t('deleteDocument', 'Delete document')}
                      >
                        <Trash2 size={13} />
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
