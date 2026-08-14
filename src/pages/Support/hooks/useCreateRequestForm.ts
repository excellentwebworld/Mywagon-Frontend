import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../api/client';
import { supportService } from '../../../api/services/supportService';
import type { RequestAttachmentPreview, SupportFormOptions } from '../types';
import { filesToBase64Attachments, isImageFile, isWithinSizeLimit, MAX_ATTACHMENT_COUNT, MAX_ATTACHMENT_SIZE_MB } from '../utils/attachments';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  mapSupportFieldValidationError,
} from '../utils/requestValidation';

const MAX_ATTACHMENTS = MAX_ATTACHMENT_COUNT;

interface UseCreateRequestFormOptions {
  lang: string;
  disabled?: boolean;
}

export function useCreateRequestForm({ lang, disabled = false }: UseCreateRequestFormOptions) {
  const [options, setOptions] = useState<SupportFormOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successTicketNumber, setSuccessTicketNumber] = useState<string | null>(null);

  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<RequestAttachmentPreview[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      setOptions(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingOptions(true);
      setLoadError(null);
      try {
        const data = await supportService.getFormOptions();
        if (!cancelled) setOptions(data);
      } catch {
        if (!cancelled) {
          setLoadError('load_failed');
          setOptions(null);
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  const optionLabel = useCallback(
    (option: { name_en: string; name_el: string }) =>
      lang === 'el' ? option.name_el : option.name_en,
    [lang]
  );

  const guidedPromptKey = useMemo(() => {
    const normalized = type.toLowerCase();
    if (normalized.includes('bug')) return 'bug';
    if (normalized.includes('feedback') || normalized.includes('feature')) return 'feature';
    if (normalized.includes('billing')) return 'billing';
    return null;
  }, [type]);

  const addAttachments = useCallback(
    async (files: FileList | File[]) => {
      setAttachmentError(null);
      const incoming = Array.from(files);
      if (incoming.length === 0) return;

      const invalid = incoming.find((file) => !isImageFile(file));
      if (invalid) {
        setAttachmentError('invalid_type');
        return;
      }

      const oversized = incoming.find((file) => !isWithinSizeLimit(file));
      if (oversized) {
        setAttachmentError('file_too_large');
        return;
      }

      const remaining = MAX_ATTACHMENTS - attachments.length;
      if (remaining <= 0) {
        setAttachmentError('max_reached');
        return;
      }

      const toAdd = incoming.slice(0, remaining);
      if (incoming.length > remaining) {
        setAttachmentError('max_reached');
      }

      const previews: RequestAttachmentPreview[] = toAdd.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setAttachments((prev) => [...prev, ...previews]);
    },
    [attachments.length]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
    setAttachmentError(null);
  }, []);

  const reset = useCallback(() => {
    attachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setType('');
    setCategory('');
    setTitle('');
    setDescription('');
    setAttachments([]);
    setAttachmentError(null);
    setFieldErrors({});
    setSubmitError(null);
    setSuccessTicketNumber(null);
  }, [attachments]);

  const submit = useCallback(async () => {
    setSubmitError(null);
    setFieldErrors({});
    setSuccessTicketNumber(null);

    const clientErrors: Record<string, string> = {};
    if (!type) clientErrors.type = 'required';
    if (!category) clientErrors.category = 'required';
    if (!title.trim()) clientErrors.title = 'required';
    else if (title.trim().length > MAX_TITLE_LENGTH) clientErrors.title = 'title_too_long';
    if (!description.trim()) clientErrors.description = 'required';
    else if (description.trim().length > MAX_DESCRIPTION_LENGTH) clientErrors.description = 'description_too_long';

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const attachmentPayload =
        attachments.length > 0 ? await filesToBase64Attachments(attachments.map((a) => a.file)) : undefined;

      const result = await supportService.createRequest({
        type,
        category,
        title: title.trim(),
        description: description.trim(),
        attachments: attachmentPayload,
      });

      attachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setAttachments([]);
      setType('');
      setCategory('');
      setTitle('');
      setDescription('');
      setSuccessTicketNumber(result.ticketNumber);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(err.fieldErrors).forEach(([key, messages]) => {
          const message = messages[0] ?? '';
          if (key.startsWith('attachments')) {
            if (/mb|size|large/i.test(message)) {
              setAttachmentError('file_too_large');
            } else if (key === 'attachments') {
              setAttachmentError('max_reached');
            } else {
              setAttachmentError('invalid_type');
            }
            return;
          }
          mapped[key] = mapSupportFieldValidationError(key, message);
        });
        setFieldErrors(mapped);
      } else if (err instanceof ApiError && err.message) {
        const message = err.message.toLowerCase();
        const nextErrors: Record<string, string> = {};
        if (message.includes('title')) {
          nextErrors.title = mapSupportFieldValidationError('title', err.message);
        }
        if (message.includes('description')) {
          nextErrors.description = mapSupportFieldValidationError('description', err.message);
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
        } else {
          setSubmitError('submit_failed');
        }
      } else if (err instanceof Error && err.message === 'file_too_large') {
        setAttachmentError('file_too_large');
      } else {
        setSubmitError('submit_failed');
      }
    } finally {
      setSubmitting(false);
    }
  }, [attachments, category, description, title, type]);

  return {
    options,
    loadingOptions,
    loadError,
    submitting,
    submitError,
    fieldErrors,
    successTicketNumber,
    type,
    setType,
    category,
    setCategory,
    title,
    setTitle,
    description,
    setDescription,
    attachments,
    attachmentError,
    addAttachments,
    removeAttachment,
    optionLabel,
    guidedPromptKey,
    reset,
    submit,
    maxAttachments: MAX_ATTACHMENTS,
    maxAttachmentSizeMb: MAX_ATTACHMENT_SIZE_MB,
    maxTitleLength: MAX_TITLE_LENGTH,
    maxDescriptionLength: MAX_DESCRIPTION_LENGTH,
  };
}
