import React, { useEffect, useMemo } from 'react';
import { AppWindow } from 'lucide-react';
import { useTranslation } from '../../../../hooks/useTranslation';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { useCreateRequestForm } from '../../hooks/useCreateRequestForm';
import { RequestFormField } from './RequestFormField';
import { RequestAttachmentDropzone } from './RequestAttachmentDropzone';
import { RequestContextChips } from './RequestContextChips';
import { CreateRequestFormSkeleton } from './CreateRequestFormSkeleton';

interface CreateRequestFormProps {
  lang: string;
  disabled?: boolean;
}

export function CreateRequestForm({ lang, disabled = false }: CreateRequestFormProps) {
  const { t } = useTranslation();
  const form = useCreateRequestForm({ lang, disabled });

  useEffect(() => {
    const hasFieldErrors = Object.keys(form.fieldErrors).length > 0;
    if (hasFieldErrors || form.submitError || form.attachmentError) {
      const timer = setTimeout(() => {
        const firstErrorEl = document.querySelector('.form-error, .kb-message--error');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [form.fieldErrors, form.submitError, form.attachmentError]);

  const fieldError = (key: string) =>
    form.fieldErrors[key] ? t(`support.request.errors.${form.fieldErrors[key]}`) : undefined;

  const typeOptions = useMemo(
    () =>
      (form.options?.types ?? []).map((option) => ({
        value: option.name_en,
        label: form.optionLabel(option),
      })),
    [form.options?.types, form.optionLabel]
  );

  const categoryOptions = useMemo(
    () =>
      (form.options?.categories ?? []).map((option) => ({
        value: option.name_en,
        label: form.optionLabel(option),
      })),
    [form.options?.categories, form.optionLabel]
  );

  if (disabled) {
    return <div className="support-placeholder">{t('support.request.gatedMessage')}</div>;
  }

  if (form.loadingOptions) {
    return <CreateRequestFormSkeleton />;
  }

  if (form.loadError) {
    return <div className="kb-message kb-message--error">{t('support.request.loadError')}</div>;
  }

  return (
    <div className="ticket-form">
      {form.successTicketNumber ? (
        <div className="request-success-banner" role="status">
          {t('support.request.success', { ticketNumber: form.successTicketNumber })}
        </div>
      ) : null}

      {form.submitError ? (
        <div className="kb-message kb-message--error">{t('support.request.submitError')}</div>
      ) : null}

      <div className="ticket-form-app-ref">
        <div className="ticket-form-app-ref-icon" aria-hidden>
          <AppWindow size={16} strokeWidth={2} />
        </div>
        <div className="ticket-form-app-ref-copy">
          <span className="ticket-form-app-ref-label">{t('support.request.appReference')}</span>
          <span className="ticket-form-app-ref-value">{form.options?.appReference ?? '—'}</span>
        </div>
      </div>

      <div className="form-row">
        <RequestFormField
          label={t('support.request.type')}
          required
          error={fieldError('type')}
        >
          <SearchableSelect
            options={typeOptions}
            value={form.type}
            onChange={form.setType}
            placeholder={t('support.request.selectType')}
            disabled={form.submitting}
            searchable={false}
            direction="auto"
            hasError={Boolean(fieldError('type'))}
          />
        </RequestFormField>

        <RequestFormField
          label={t('support.request.category')}
          required
          error={fieldError('category')}
        >
          <SearchableSelect
            options={categoryOptions}
            value={form.category}
            onChange={form.setCategory}
            placeholder={t('support.request.selectCategory')}
            disabled={form.submitting}
            searchable={false}
            direction="auto"
            hasError={Boolean(fieldError('category'))}
          />
        </RequestFormField>
      </div>

      <div className="form-row full">
        <RequestFormField
          label={t('support.request.title')}
          required
          error={fieldError('title')}
        >
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => form.setTitle(e.target.value)}
            placeholder={t('support.request.titlePlaceholder')}
            disabled={form.submitting}
            maxLength={form.maxTitleLength}
          />
          <div className="form-char-count" aria-live="polite">
            {t('support.request.titleCount', {
              count: form.title.length,
              max: form.maxTitleLength,
            })}
          </div>
        </RequestFormField>
      </div>

      <div className="form-row full">
        <RequestFormField
          label={t('support.request.description')}
          required
          error={fieldError('description')}
        >
          <textarea
            className="form-input"
            value={form.description}
            onChange={(e) => form.setDescription(e.target.value)}
            placeholder={t('support.request.descriptionPlaceholder')}
            disabled={form.submitting}
            maxLength={form.maxDescriptionLength}
          />
          <div className="form-char-count" aria-live="polite">
            {t('support.request.descriptionCount', {
              count: form.description.length,
              max: form.maxDescriptionLength,
            })}
          </div>
          {form.guidedPromptKey ? (
            <div className="guided-prompt show">
              {t(`support.request.guide.${form.guidedPromptKey}`)}
            </div>
          ) : null}
        </RequestFormField>
      </div>

      <div className="form-row full">
        <RequestFormField label={t('support.request.attachments')}>
          <RequestAttachmentDropzone
            attachments={form.attachments}
            maxAttachments={form.maxAttachments}
            maxAttachmentSizeMb={form.maxAttachmentSizeMb}
            errorKey={form.attachmentError}
            disabled={form.submitting}
            onAdd={form.addAttachments}
            onRemove={form.removeAttachment}
          />
        </RequestFormField>
      </div>

      <div className="form-row full">
        <RequestContextChips />
      </div>

      <div className="form-footer">
        <p className="form-footer-note">{t('support.request.footerNote')}</p>
        <div className="form-footer-actions">
          <button
            type="button"
            className="support-request-btn support-request-btn--secondary"
            onClick={form.reset}
            disabled={form.submitting}
          >
            {t('support.request.cancel')}
          </button>
          <button
            type="button"
            className="support-request-btn support-request-btn--primary"
            onClick={form.submit}
            disabled={form.submitting}
          >
            {form.submitting ? t('support.request.submitting') : t('support.request.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
