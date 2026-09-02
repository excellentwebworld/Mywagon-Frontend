import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<void>;
  t: (key: string, fallback?: string) => string;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  t,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'];
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(ext)) {
      setError(t('invalidFileType', 'Only PDF, JPG, PNG, WEBP, and DOC files are allowed.'));
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError(t('fileTooLarge', 'File size exceeds the 20MB limit.'));
      return;
    }

    setFile(selectedFile);
    if (!name.trim()) {
      // Pre-fill name from file name without extension
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setName(baseName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('enterDocName', 'Please enter a document name.'));
      return;
    }
    if (!file) {
      setError(t('selectFile', 'Please choose a file to upload.'));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('file', file);

      await onUpload(formData);
      handleClose();
    } catch (err: any) {
      setError(err?.message || t('uploadFailed', 'Failed to upload document. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setFile(null);
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = file?.type.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid #E4E4E8' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E8] bg-[#FAFAFC] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#9B51E0]/10 flex items-center justify-center text-[#9B51E0]">
              <UploadCloud size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#18181B] m-0">
                {t('uploadDocument', 'Upload Document')}
              </h3>
              <p className="text-[11px] text-[#8E8E9A] m-0">
                {t('uploadDocSub', 'Attach PDF or images for this shipment')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-[#8E8E9A] hover:text-[#18181B] rounded-lg transition-colors cursor-pointer"
            style={{ background: 'none', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden m-0">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
              {t('documentName', 'Document Name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('docNamePlaceholder', 'e.g., CMR, Delivery Note, Invoice, Customs Declaration')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E8] text-xs text-[#18181B] bg-white outline-none focus:border-[#9B51E0] focus:ring-2 focus:ring-[#9B51E0]/10 transition-all"
              required
            />
          </div>

          {/* Quick preset suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-[#8E8E9A]">{t('quickFill', 'Quick fill:')}</span>
            {['CMR', 'POD', 'Invoice', 'Delivery Note', 'Customs Doc'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setName(preset)}
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F0F0F3] hover:bg-[#E4E4E8] text-[#5E5E6E] transition-colors cursor-pointer"
                style={{ border: 'none' }}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
              {t('description', 'Description / Notes')} <span className="text-[#8E8E9A] font-normal">({t('optional', 'Optional')})</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('docDescPlaceholder', 'Add extra details, reference numbers or notes about this document…')}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E4E4E8] text-xs text-[#18181B] bg-white outline-none focus:border-[#9B51E0] focus:ring-2 focus:ring-[#9B51E0]/10 transition-all resize-none"
            />
          </div>

          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
              {t('file', 'File (PDF, Images)')} <span className="text-red-500">*</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

            {!file ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#9B51E0] bg-[#9B51E0]/5'
                    : 'border-[#D4D4D8] hover:border-[#9B51E0] hover:bg-[#FAFAFC]'
                }`}
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-[#F0F0F3] flex items-center justify-center text-[#9B51E0] mb-2">
                  <UploadCloud size={20} />
                </div>
                <div className="text-xs font-semibold text-[#18181B]">
                  {t('clickToUpload', 'Click to choose file or drag and drop')}
                </div>
                <div className="text-[11px] text-[#8E8E9A] mt-1">
                  PDF, JPG, PNG, WEBP or DOC (Max 20MB)
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-[#E4E4E8] bg-[#FAFAFC] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isImage ? '#EFF6FF' : '#FEF2F2',
                      color: isImage ? '#3B82F6' : '#EF4444',
                    }}
                  >
                    {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#18181B] truncate">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-[#8E8E9A] flex items-center gap-1.5">
                      <span>{formatFileSize(file.size)}</span>
                      <span>·</span>
                      <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                        <CheckCircle size={10} /> {t('readyToUpload', 'Ready')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="px-2 py-1 text-[11px] font-semibold text-[#EF4444] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  style={{ background: 'none', border: 'none' }}
                >
                  {t('remove', 'Remove')}
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#E4E4E8] bg-[#FAFAFC] flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5E5E6E] bg-[#F5F5F7] hover:bg-[#E4E4E8] transition-colors cursor-pointer"
              style={{ border: 'none' }}
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#9B51E0] hover:bg-[#8A3FD5] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ border: 'none' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t('uploading', 'Uploading…')}</span>
                </>
              ) : (
                <>
                  <UploadCloud size={13} />
                  <span>{t('uploadDocumentAction', 'Upload Document')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
