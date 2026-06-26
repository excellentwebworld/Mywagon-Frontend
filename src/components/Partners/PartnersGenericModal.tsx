import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { FormFieldError } from '../AddressBook/FormFieldError';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';

type Props = Pick<
  PartnersState,
  | 't'
  | 'genericModal'
  | 'closeGenericModal'
  | 'saveContractLane'
> & {
  laneLoading?: boolean;
};

interface FormValues {
  origin_city: string;
  destination_city: string;
  price: string;
  unit: 'load' | 'pallet';
}

function fieldClass(hasError: boolean): string {
  return hasError ? 'mf has-error' : 'mf';
}

export const PartnersGenericModal: React.FC<Props> = ({
  t,
  genericModal,
  closeGenericModal,
  saveContractLane,
  laneLoading = false,
}) => {
  const validationSchema = React.useMemo(() => {
    return Yup.object().shape({
      origin_city: Yup.string()
        .trim()
        .required(t('originCityRequired') || 'Origin city is required.'),
      destination_city: Yup.string()
        .trim()
        .required(t('destCityRequired') || 'Destination city is required.'),
      price: Yup.number()
        .typeError(t('priceMustBeNumber') || 'Price must be a number.')
        .required(t('priceRequired') || 'Price is required.')
        .min(0, t('priceMinZero') || 'Price must be greater than or equal to 0.'),
    });
  }, [t]);

  if (genericModal !== 'addLane') return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeGenericModal();
  };

  const initialValues: FormValues = {
    origin_city: '',
    destination_city: '',
    price: '',
    unit: 'load',
  };

  const handleSubmit = (values: FormValues) => {
    saveContractLane({
      origin_city: values.origin_city.trim(),
      destination_city: values.destination_city.trim(),
      price: parseFloat(values.price),
      unit: values.unit,
    });
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        submitCount,
      }) => {
        const showError = (field: keyof FormValues) =>
          Boolean((touched[field] || submitCount > 0) && errors[field]);

        return (
          <div className="modal-backdrop open" onClick={handleOverlayClick} id="generic-modal">
            <Form className="modal modal-lg ptn-gm-modal" noValidate>
              <div className="modal-header">
                <h2>{t('addLaneTitle')}</h2>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeGenericModal} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className={fieldClass(showError('origin_city'))}>
                    <label className="form-label">{t('originCity')} <span className="rq">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      id="lane-origin"
                      name="origin_city"
                      placeholder="Athens"
                      value={values.origin_city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('origin_city') ? errors.origin_city : undefined} />
                  </div>
                  <div className={fieldClass(showError('destination_city'))}>
                    <label className="form-label">{t('destCity')} <span className="rq">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      id="lane-dest"
                      name="destination_city"
                      placeholder="Thessaloniki"
                      value={values.destination_city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('destination_city') ? errors.destination_city : undefined} />
                  </div>
                </div>
                <div className="mf" style={{ marginBottom: 12 }}>
                  <label className="form-label">{t('pricingMode')}</label>
                  <div className="ptn-tag-chips">
                    {(['load', 'pallet'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        className={`ptn-tag-chip${values.unit === u ? ' selected' : ''}`}
                        onClick={() => setFieldValue('unit', u)}
                      >
                        {u === 'load' ? t('perLoad') : t('perPallet')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={fieldClass(showError('price'))}>
                  <label className="form-label">{t('priceEur')} <span className="rq">*</span></label>
                  <input
                    type="number"
                    className="form-input"
                    id="lane-price"
                    name="price"
                    placeholder="0"
                    min="0"
                    value={values.price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormFieldError message={showError('price') ? errors.price : undefined} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeGenericModal} disabled={laneLoading}>{t('cancel') || 'Cancel'}</button>
                <button type="submit" className="btn btn-primary" disabled={laneLoading}>{laneLoading ? t('saving') || 'Saving...' : (t('save') || 'Save')}</button>
              </div>
            </Form>
          </div>
        );
      }}
    </Formik>
  );
};
