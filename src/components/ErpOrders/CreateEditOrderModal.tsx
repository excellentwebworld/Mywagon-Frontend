import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Formik, Form, useFormikContext } from 'formik';
import { ScrollToFormError } from '../ui/ScrollToFormError';
import * as Yup from 'yup';
import { SearchableSelect } from '../ui/SearchableSelect';
import { DatePicker, getTodayDateString } from '../ui/DatePicker';
import { ToggleField } from '../AddressBook';
import { OrderProductLinesEditor } from './OrderProductLinesEditor';
import { FormFieldError } from '../AddressBook/FormFieldError';
import type { ApiErpOrderCustomer } from '../../api/types/erpOrders';
import type { LocationItem, SKU } from '../../context/AppContext';
import type { ErpOrderFormState, ErpOrderLine } from '../../pages/ErpOrders/types';

type Props = {
  t: (key: string, options?: Record<string, string | number>) => string;
  isOpen: boolean;
  isEdit: boolean;
  form: ErpOrderFormState;
  setForm: React.Dispatch<React.SetStateAction<ErpOrderFormState>>;
  onClose: () => void;
  onSubmit: (values: ErpOrderFormState) => void;
  saving: boolean;
  companies: ApiErpOrderCustomer[];
  locations: LocationItem[];
  skus: SKU[];
  onAddLocationOrigin?: () => void;
  onAddLocationDest?: () => void;
  onAddProduct?: (lineIndex: number) => void;
};

// FormikStateSync links the Formik values back to the parent state,
// allowing quick modal dialogs (location/product additions) to preserve forms.
const FormikStateSync: React.FC<{
  setForm: React.Dispatch<React.SetStateAction<ErpOrderFormState>>;
}> = ({ setForm }) => {
  const { values } = useFormikContext<ErpOrderFormState>();
  useEffect(() => {
    setForm(values);
  }, [values, setForm]);
  return null;
};

const getNextDay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
};

export const CreateEditOrderModal: React.FC<Props> = ({
  t,
  isOpen,
  isEdit,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
  companies,
  locations,
  skus,
  onAddLocationOrigin,
  onAddLocationDest,
  onAddProduct,
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);

  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: String(c.id),
        label: c.name,
        sublabel:
          c.is_partner && c.partner_company_name
            ? [c.vat_number, c.partner_company_name].filter(Boolean).join(' · ')
            : c.vat_number,
      })),
    [companies]
  );

  const locationOptions = useMemo(
    () =>
      locations.map((l) => ({
        value: String(l.id),
        label: l.name,
        sublabel: l.city || l.address,
      })),
    [locations]
  );

  // Formik Validation Schema
  const validationSchema = useMemo(() => {
    return Yup.object().shape({
      orderReference: Yup.string().trim().required(t('erpOrdersOrderIdRequired')),
      customerName: Yup.string().trim().required(t('erpOrdersCustomerRequired')),
      deliveryDate: Yup.string().trim().required(t('erpOrdersDeliveryDateRequired')),
      shipDate: Yup.string()
        .nullable()
        .test(
          'shipDate-before-deliveryDate',
          t('erpOrdersShipDateInvalid'),
          function (value) {
            const { deliveryDate } = this.parent;
            if (value && deliveryDate && value > deliveryDate) {
              return false;
            }
            return true;
          }
        ),
      lines: Yup.array()
        .of(
          Yup.object().shape({
            productSkuId: Yup.number().nullable(),
            quantity: Yup.number().nullable(),
            unit: Yup.string().nullable(),
            weight: Yup.number().nullable(),
            weightUnit: Yup.string().nullable(),
          })
        )
        .test('at-least-one-complete-product', function validateCompleteProduct(lines) {
          const orderLines = (lines ?? []) as ErpOrderLine[];

          const isComplete = (line: ErpOrderLine) =>
            line.productSkuId != null &&
            line.quantity != null &&
            Number(line.quantity) > 0 &&
            Boolean(String(line.unit || '').trim()) &&
            line.weight != null &&
            Number(line.weight) >= 0 &&
            Boolean(String(line.weightUnit || '').trim());

          const isBlank = (line: ErpOrderLine) =>
            line.productSkuId == null &&
            line.quantity == null &&
            line.weight == null &&
            !String(line.productName || '').trim();

          if (!orderLines.some(isComplete)) {
            return this.createError({
              message: String(t('erpOrdersProductLineRequired')),
            });
          }

          for (let i = 0; i < orderLines.length; i++) {
            const line = orderLines[i];
            if (isBlank(line) || isComplete(line)) continue;

            if (line.productSkuId == null) {
              return this.createError({
                message: String(
                  t('erpOrdersLineFieldLabel', {
                    line: i + 1,
                    field: t('erpOrdersSelectProduct'),
                  })
                ),
              });
            }
            if (line.quantity == null || Number(line.quantity) <= 0) {
              return this.createError({
                message: String(
                  t('erpOrdersFieldRequired', { field: `${t('qty')} (line ${i + 1})` })
                ),
              });
            }
            if (!String(line.unit || '').trim()) {
              return this.createError({
                message: String(
                  t('erpOrdersFieldRequired', { field: `${t('unit') || 'Unit'} (line ${i + 1})` })
                ),
              });
            }
            if (line.weight == null || Number(line.weight) < 0) {
              return this.createError({
                message: String(t('erpOrdersLineWeightMin', { line: i + 1 })),
              });
            }
            if (!String(line.weightUnit || '').trim()) {
              return this.createError({
                message: String(
                  t('erpOrdersFieldRequired', {
                    field: `${t('weight')} unit (line ${i + 1})`,
                  })
                ),
              });
            }
          }

          return true;
        })
        .test('line-weights', function validateLineWeights(lines) {
          const orderLines = (lines ?? []) as ErpOrderLine[];
          for (let i = 0; i < orderLines.length; i++) {
            const weight = orderLines[i]?.weight;
            if (weight != null && weight < 0) {
              return this.createError({
                message: String(t('erpOrdersLineWeightMin', { line: i + 1 })),
              });
            }
          }
          return true;
        })
        .test(
          'unique-products',
          t('erpOrdersDuplicateProduct'),
          (lines) => {
            if (!lines) return true;
            const ids = lines.map((l) => l.productSkuId).filter((id) => id != null);
            return ids.length === new Set(ids).size;
          }
        ),
    });
  }, [t]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-bg show">
      <Formik
        initialValues={form}
        validationSchema={validationSchema}
        onSubmit={(values) => onSubmit(values)}
        enableReinitialize={true}
      >
        {({ values, errors, touched, setFieldValue, submitCount }) => {
          const showError = (field: keyof ErpOrderFormState) =>
            Boolean((touched[field] || submitCount > 0) && errors[field]);

          return (
            <Form className="modal modal-form" noValidate>
              <FormikStateSync setForm={setForm} />
              <ScrollToFormError />

              <div className="modal-hd">
                <span>{isEdit ? t('erpOrdersEditOrder') : t('erpOrdersCreateOrder')}</span>
                <button type="button" className="modal-close" onClick={onClose}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="field">
                  <label className="field-l">{t('erpOrdersColOrderId')} <span className="req">*</span></label>
                  <input
                    className={`inp${showError('orderReference') ? ' has-error' : ''}`}
                    placeholder={t('erpOrdersOrderIdPlaceholder')}
                    value={values.orderReference}
                    onChange={(e) => setFieldValue('orderReference', e.target.value)}
                    disabled={isEdit}
                  />
                  <FormFieldError message={showError('orderReference') ? errors.orderReference : undefined} />
                </div>

                <div className="field">
                  <label className="field-l">{t('erpOrdersErpId')}</label>
                  <input
                    className={`inp${showError('erpReference') ? ' has-error' : ''}`}
                    placeholder={t('erpOrdersErpIdPlaceholder')}
                    value={values.erpReference}
                    onChange={(e) => setFieldValue('erpReference', e.target.value)}
                  />
                  <FormFieldError message={showError('erpReference') ? errors.erpReference : undefined} />
                </div>

                <div className="field">
                  <label className="field-l">{t('erpOrdersColCustomer')} <span className="req">*</span></label>
                  <SearchableSelect
                    options={companyOptions}
                    value={values.companyEntityId ? String(values.companyEntityId) : ''}
                    onChange={(val, opt) => {
                      setFieldValue('companyEntityId', val ? Number(val) : null);
                      setFieldValue('customerName', opt?.label ?? '');
                    }}
                    placeholder={t('erpOrdersSelectCustomer')}
                    hasError={showError('customerName')}
                  />
                  <FormFieldError message={showError('customerName') ? errors.customerName : undefined} />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label className="field-l">{t('erpOrdersShipDate')}</label>
                    <DatePicker
                      value={values.shipDate}
                      onChange={(val) => {
                        setFieldValue('shipDate', val);
                        if (val) {
                          setFieldValue('deliveryDate', getNextDay(val));
                        }
                      }}
                      min={todayStr}
                      hasError={showError('shipDate')}
                    />
                    <FormFieldError message={showError('shipDate') ? errors.shipDate : undefined} />
                  </div>
                  <div className="field">
                    <label className="field-l">{t('erpOrdersColDeliveryDate')} <span className="req">*</span></label>
                    <DatePicker
                      value={values.deliveryDate}
                      onChange={(val) => setFieldValue('deliveryDate', val)}
                      min={values.shipDate || todayStr}
                      hasError={showError('deliveryDate')}
                    />
                    <FormFieldError message={showError('deliveryDate') ? errors.deliveryDate : undefined} />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field">
                    <label className="field-l">{t('erpOrdersColShipFrom')}</label>
                    <SearchableSelect
                      options={locationOptions}
                      value={values.originLocationId ? String(values.originLocationId) : ''}
                      onChange={(val) => setFieldValue('originLocationId', val ? Number(val) : null)}
                      placeholder={t('erpOrdersSelectLocation')}
                      headerAction={onAddLocationOrigin ? { label: `+ ${t('erpOrdersAddAddress')}`, onClick: onAddLocationOrigin } : undefined}
                    />
                  </div>
                  <div className="field">
                    <label className="field-l">{t('erpOrdersColShipTo')}</label>
                    <SearchableSelect
                      options={locationOptions}
                      value={values.destLocationId ? String(values.destLocationId) : ''}
                      onChange={(val) => setFieldValue('destLocationId', val ? Number(val) : null)}
                      placeholder={t('erpOrdersSelectLocation')}
                      headerAction={onAddLocationDest ? { label: `+ ${t('erpOrdersAddAddress')}`, onClick: onAddLocationDest } : undefined}
                    />
                  </div>
                </div>


                <div className='my-3'>
                  <ToggleField
                    label={t('erpOrdersHighPriority')}
                    value={values.highPriority}
                    onChange={(highPriority) => setFieldValue('highPriority', highPriority)}
                  />
                </div>

                <div className="field">
                  <label className="field-l">{t('erpOrdersOrderValue')}</label>
                  <input
                    type="text"
                    className="inp"
                    inputMode="decimal"
                    placeholder={t('erpOrdersOrderValuePlaceholder')}
                    value={values.orderValue != null ? String(values.orderValue) : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.,]/g, '');
                      setFieldValue('orderValue', raw ? Number(raw.replace(',', '.')) : null);
                    }}
                  />
                  <div className="text-[11px] text-slate-400 mt-1">{t('orderValueHint')}</div>
                </div>

                <div className="field">
                  <label className="field-l">{t('notes')}</label>
                  <textarea
                    className="inp"
                    rows={2}
                    value={values.notes}
                    onChange={(e) => setFieldValue('notes', e.target.value)}
                  />
                </div>

                <OrderProductLinesEditor
                  t={t}
                  lines={values.lines}
                  skus={skus}
                  onChange={(lines) => setFieldValue('lines', lines)}
                  onAddProduct={onAddProduct}
                />
                <FormFieldError message={showError('lines') ? (errors.lines as string) : undefined} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-md" onClick={onClose}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-p btn-md" disabled={saving}>
                  {saving ? t('saving') : isEdit ? t('save') : t('create')}
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>,
    document.body
  );
};
