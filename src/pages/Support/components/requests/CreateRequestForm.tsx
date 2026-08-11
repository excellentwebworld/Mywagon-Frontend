import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useTheme } from '../../../../hooks/useTheme';
import { useCreateRequestForm } from '../../hooks/useCreateRequestForm';
import { RequestFormField } from './RequestFormField';
import { RequestAttachmentDropzone } from './RequestAttachmentDropzone';

interface CreateRequestFormProps {
  lang: string;
  disabled?: boolean;
}

export function CreateRequestForm({ lang, disabled = false }: CreateRequestFormProps) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const form = useCreateRequestForm({ lang, disabled });

  const fieldError = (key: string) =>
    form.fieldErrors[key] ? t(`support.request.errors.${form.fieldErrors[key]}`) : undefined;

  if (disabled) {
    return (
      <div
        className="support-placeholder"
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: T.t3,
          background: T.sa,
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        {t('support.request.gatedMessage')}
      </div>
    );
  }

  if (form.loadingOptions) {
    return <div className="kb-message">{t('support.request.loading')}</div>;
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

      <div className="form-row">
        <RequestFormField
          label={t('support.request.appReference')}
          required
        >
          <input
            className="form-input"
            value={form.options?.appReference ?? ''}
            readOnly
            aria-readonly
          />
        </RequestFormField>

        <RequestFormField
          label={t('support.request.type')}
          required
          error={fieldError('type')}
        >
          <select
            className="form-input"
            value={form.type}
            onChange={(e) => form.setType(e.target.value)}
            disabled={form.submitting}
          >
            <option value="">{t('support.request.selectType')}</option>
            {form.options?.types.map((option) => (
              <option key={option.id} value={option.name_en}>
                {form.optionLabel(option)}
              </option>
            ))}
          </select>
        </RequestFormField>
      </div>

      <div className="form-row">
        <RequestFormField
          label={t('support.request.category')}
          required
          error={fieldError('category')}
        >
          <select
            className="form-input"
            value={form.category}
            onChange={(e) => form.setCategory(e.target.value)}
            disabled={form.submitting}
          >
            <option value="">{t('support.request.selectCategory')}</option>
            {form.options?.categories.map((option) => (
              <option key={option.id} value={option.name_en}>
                {form.optionLabel(option)}
              </option>
            ))}
          </select>
        </RequestFormField>

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
          />
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
          />
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
            errorKey={form.attachmentError}
            disabled={form.submitting}
            onAdd={form.addAttachments}
            onRemove={form.removeAttachment}
          />
        </RequestFormField>
      </div>

      <div className="form-footer">
        <div />
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
