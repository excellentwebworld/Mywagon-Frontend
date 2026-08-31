import React from 'react';
import { Paperclip, Plus, Check, X, Clock } from 'lucide-react';
import type { DetailDocument } from '../../pages/ShipmentDetail/detailViewModel';
import { CollapsibleCard } from './CollapsibleCard';

interface DocumentsCardProps {
  documents: DetailDocument[];
  expanded: boolean;
  onToggle: () => void;
  onUpload?: () => void;
  onDownload?: (doc: DetailDocument) => void;
  onToast: (msg: string) => void;
  t: (key: string, fallback?: string) => string;
}

export const DocumentsCard: React.FC<DocumentsCardProps> = ({
  documents,
  expanded,
  onToggle,
  onUpload,
  onDownload,
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
    >
      <div>
        <button
          type="button"
          onClick={onUpload || (() => onToast(t('uploadDocument', 'Upload document')))}
          className="text-[12px] font-semibold mb-2.5 flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
          style={{ color: '#9B51E0', background: 'none', border: 'none' }}
        >
          <Plus size={13} />
          <span>{t('upload', '+ Upload')}</span>
        </button>

        {documents.length === 0 ? (
          <p className="text-[12px]" style={{ color: '#8E8E9A' }}>
            {t('noDocumentsUploaded', 'No documents uploaded yet.')}
          </p>
        ) : (
          <div className="space-y-0">
            {documents.map((doc, idx) => {
              const isOk = doc.status === 'ok';
              const isMiss = doc.status === 'miss';
              const isRev = doc.status === 'rev';

              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 py-2.5"
                  style={{ borderTop: idx > 0 ? '1px solid #E4E4E8' : 'none' }}
                >
                  <span
                    className="rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                    style={{
                      width: 30,
                      height: 30,
                      fontSize: 14,
                      background: isOk ? '#ECFDF5' : isMiss ? '#FEF2F2' : '#EFF6FF',
                      color: isOk ? '#10B981' : isMiss ? '#EF4444' : '#3B82F6',
                    }}
                  >
                    {isOk ? <Check size={16} /> : isMiss ? <X size={16} /> : <Clock size={16} />}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: '#18181B' }}>
                      {doc.name}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: '#8E8E9A' }}>
                      {doc.subtitle}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {doc.actions?.map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => {
                          if (act.toLowerCase().includes('download') && onDownload) {
                            onDownload(doc);
                          } else {
                            onToast(`${act}: ${doc.name}`);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors hover:bg-black/5"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E4E4E8',
                          color: '#5E5E6E',
                        }}
                      >
                        {act}
                      </button>
                    ))}
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
