import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Formik, Form, type FormikHelpers } from 'formik';
import { SearchableSelect } from '../ui/SearchableSelect';
import {
  UOM_OPTIONS,
  TEMP_OPTIONS,
  PALLET_OPTIONS,
} from '../../pages/ProductMaster/constants';
import { useTranslation } from '../../hooks/useTranslation';
import { EMPTY_NEW_SKU, type NewSkuForm } from '../../pages/ProductMaster/types';
import { ToggleField } from '../AddressBook';
import { FormFieldError } from '../AddressBook/FormFieldError';
import { ScrollToFormError } from '../ui/ScrollToFormError';
import { productMasterService } from '../../api/services/productMasterService';
import { mapReferenceToProductTypes } from '../../api/mappers/productMasterMapper';
import type { ApiReferenceCategory } from '../../api/types/productMaster';
import type { ProductType } from '../../context/AppContext';
import { optionLabel } from '../../pages/ProductMaster/optionLabels';
import {
  BARCODE_MAX_DIGITS,
  createSkuValidationSchema,
  isSkuNumberUnique,
  normalizeSkuNumber,
  sanitizeBarcodeInput,
  sanitizeSkuNameInput,
  sanitizeSkuNumberInput,
  sanitizeWeightInput,
  skuValidationSchema,
  SKU_NAME_MAX,
  SKU_NUMBER_MAX,
  SKU_NUMBER_UNIQUE_DEBOUNCE_MS,
} from './skuFieldValidation';
import '../../styles/product-master-sku-modal.css';

export { createSkuValidationSchema, skuValidationSchema };

function fieldClass(hasError: boolean): string {
  return hasError ? 'mf has-error' : 'mf';
}

export type ProductMasterSkuModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editMode?: boolean;
  initialValues?: NewSkuForm;
  onSubmit: (values: NewSkuForm) => void | Promise<void>;
  saving?: boolean;
  productTypes?: ProductType[];
  title?: string;
};

export const ProductMasterSkuModal: React.FC<ProductMasterSkuModalProps> = ({
  isOpen,
  onClose,
  editMode = false,
  initialValues = EMPTY_NEW_SKU,
  onSubmit,
  saving = false,
  productTypes: productTypesProp,
  title,
}) => {
  const { t } = useTranslation();
  const [apiCategories, setApiCategories] = useState<ApiReferenceCategory[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    productMasterService.getAllReferenceCategories().then(setApiCategories).catch(() => setApiCategories([]));
  }, [isOpen]);

  const productTypes = useMemo(() => {
    if (productTypesProp?.length) return productTypesProp;
    return mapReferenceToProductTypes(apiCategories);
  }, [productTypesProp, apiCategories]);

  const categoryOptions = useMemo(
    () => apiCategories.map((c) => ({ value: String(c.id), label: c.name })),
    [apiCategories]
  );

  const uomOptions = useMemo(
    () => UOM_OPTIONS.map((u) => ({ value: u, label: optionLabel('uom', u, t) })),
    [t]
  );
  const tempOptions = useMemo(
    () => TEMP_OPTIONS.map((v) => ({ value: v, label: optionLabel('temp', v, t) })),
    [t]
  );
  const palletOptions = useMemo(
    () => PALLET_OPTIONS.map((v) => ({ value: v, label: optionLabel('pallet', v, t) })),
    [t]
  );

  const validationSchema = useMemo(() => createSkuValidationSchema(t), [t]);

  const formInitialValues = useMemo(
    () => ({ ...EMPTY_NEW_SKU, ...initialValues }),
    [initialValues]
  );

  const handleSubmit = async (values: NewSkuForm, helpers: FormikHelpers<NewSkuForm>) => {
    const number = normalizeSkuNumber(values.number);
    const unique = await isSkuNumberUnique(
      number,
      editMode ? formInitialValues.number : undefined
    );
    if (!unique) {
      helpers.setFieldError(
        'number',
        t('productMaster.skuNumberTaken', 'SKU Number already exists')
      );
      helpers.setFieldTouched('number', true, false);
      return;
    }
    await onSubmit({
      ...values,
      name: values.name.trim(),
      number,
      barcode: values.barcode.trim(),
      weight: values.weight.trim().replace(',', '.'),
    });
  };

  if (!isOpen) return null;

  const modalTitle = title ?? (editMode ? t('editSku') : t('addSkuMenu'));

  return createPortal(
    <Formik
      initialValues={formInitialValues}
      validationSchema={validationSchema}
      enableReinitialize={editMode}
      validateOnChange
      validateOnBlur
      onSubmit={handleSubmit}
    >
      {(formik) => (
        <SkuModalForm
          formik={formik}
          onClose={onClose}
          editMode={editMode}
          saving={saving}
          modalTitle={modalTitle}
          categoryOptions={categoryOptions}
          typeOptions={(
            apiCategories.find((c) => String(c.id) === String(formik.values.catId))?.types ?? []
          ).map((tp) => ({ value: String(tp.id), label: tp.name }))}
          productTypes={productTypes}
          uomOptions={uomOptions}
          tempOptions={tempOptions}
          palletOptions={palletOptions}
          excludeSkuNumber={editMode ? formInitialValues.number : undefined}
          t={t}
        />
      )}
    </Formik>,
    document.body
  );
};

type SelectOption = { value: string; label: string };

type SkuModalFormProps = {
  formik: {
    values: NewSkuForm;
    errors: Partial<Record<keyof NewSkuForm, string>>;
    touched: Partial<Record<keyof NewSkuForm, boolean>>;
    submitCount: number;
    handleChange: React.ChangeEventHandler<HTMLInputElement>;
    handleBlur: React.FocusEventHandler<HTMLInputElement>;
    setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void | Promise<void>;
    setFieldTouched: (field: string, touched?: boolean, shouldValidate?: boolean) => void;
    setFieldError: (field: string, message: string | undefined) => void;
    setValues: (values: NewSkuForm, shouldValidate?: boolean) => void | Promise<void>;
    isSubmitting: boolean;
  };
  onClose: () => void;
  editMode: boolean;
  saving: boolean;
  modalTitle: string;
  categoryOptions: SelectOption[];
  typeOptions: SelectOption[];
  productTypes: ProductType[];
  uomOptions: SelectOption[];
  tempOptions: SelectOption[];
  palletOptions: SelectOption[];
  excludeSkuNumber?: string;
  t: (key: string, fallback?: string) => string;
};

function SkuModalForm({
  formik,
  onClose,
  editMode,
  saving,
  modalTitle,
  categoryOptions,
  typeOptions,
  productTypes,
  uomOptions,
  tempOptions,
  palletOptions,
  excludeSkuNumber,
  t,
}: SkuModalFormProps) {
  const {
    values,
    errors,
    touched,
    submitCount,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    setValues,
    isSubmitting,
  } = formik;

  const showError = (field: keyof NewSkuForm) =>
    Boolean((touched[field] || submitCount > 0) && errors[field]);

  const uniqueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uniqueRequestRef = useRef(0);
  const numberRef = useRef(values.number);
  numberRef.current = values.number;

  useEffect(() => {
    return () => {
      if (uniqueTimerRef.current) clearTimeout(uniqueTimerRef.current);
      uniqueRequestRef.current += 1;
    };
  }, []);

  const scheduleUniqueCheck = (normalized: string) => {
    if (uniqueTimerRef.current) clearTimeout(uniqueTimerRef.current);
    if (normalized.length < 3) return;

    const requestId = ++uniqueRequestRef.current;
    uniqueTimerRef.current = setTimeout(() => {
      void (async () => {
        const unique = await isSkuNumberUnique(normalized, excludeSkuNumber);
        if (requestId !== uniqueRequestRef.current) return;
        if (normalizeSkuNumber(numberRef.current) !== normalized) return;
        if (!unique) {
          setFieldError(
            'number',
            t('productMaster.skuNumberTaken', 'SKU Number already exists')
          );
          setFieldTouched('number', true, false);
        }
      })();
    }, SKU_NUMBER_UNIQUE_DEBOUNCE_MS);
  };

  return (
    <div className="modal-bg show pm-sku-modal" onClick={onClose}>
      <Form className="modal modal-lg" onClick={(e) => e.stopPropagation()} noValidate>
        <ScrollToFormError />
        <div className="modal-h">
          <h3>{modalTitle}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mf-row">
            <div className={fieldClass(showError('catId'))}>
              <label>
                {t('category')} <span className="req">*</span>
              </label>
              <SearchableSelect
                options={categoryOptions}
                value={values.catId}
                onChange={(catId) => {
                  void setValues(
                    {
                      ...values,
                      catId,
                      typeId: '',
                    },
                    true
                  );
                  setFieldTouched('catId', true, false);
                  setFieldTouched('typeId', false, false);
                }}
                placeholder={t('selectCategory')}
                hasError={showError('catId')}
              />
              <FormFieldError message={showError('catId') ? errors.catId : undefined} />
            </div>
            <div className={fieldClass(showError('typeId'))}>
              <label>
                {t('productType')} <span className="req">*</span>
              </label>
              <SearchableSelect
                options={typeOptions}
                value={values.typeId}
                onChange={(typeId) => {
                  const next: NewSkuForm = { ...values, typeId };
                  if (!editMode && typeId) {
                    const tp = productTypes.find((x) => String(x.id) === String(typeId));
                    if (tp) {
                      next.temperature = tp.defaults.temp;
                      next.palletType = tp.defaults.palletType;
                      next.hazardous = tp.defaults.hazard;
                      next.stackable = tp.defaults.stackable;
                    }
                  }
                  void setValues(next, true);
                  setFieldTouched('typeId', true, false);
                }}
                placeholder={t('selectType')}
                disabled={!values.catId}
                hasError={showError('typeId')}
              />
              <FormFieldError message={showError('typeId') ? errors.typeId : undefined} />
            </div>
          </div>
          <div className={fieldClass(showError('name'))}>
            <label>
              {t('skuName')} <span className="req">*</span>
            </label>
            <input
              name="name"
              value={values.name}
              maxLength={SKU_NAME_MAX}
              onChange={(e) => {
                void setFieldValue('name', sanitizeSkuNameInput(e.target.value), true);
              }}
              onBlur={handleBlur}
            />
            <FormFieldError message={showError('name') ? errors.name : undefined} />
          </div>
          <div className="mf-row">
            <div className={fieldClass(showError('number'))}>
              <label>
                {t('skuNumber')} <span className="req">*</span>
              </label>
              <input
                name="number"
                value={values.number}
                maxLength={SKU_NUMBER_MAX}
                onChange={(e) => {
                  void setFieldValue('number', sanitizeSkuNumberInput(e.target.value), true);
                }}
                onBlur={(e) => {
                  const normalized = normalizeSkuNumber(e.target.value).slice(0, SKU_NUMBER_MAX);
                  void setFieldValue('number', normalized, true);
                  setFieldTouched('number', true, false);
                  scheduleUniqueCheck(normalized);
                }}
              />
              <FormFieldError message={showError('number') ? errors.number : undefined} />
            </div>
            <div className={fieldClass(showError('barcode'))}>
              <label>{t('barcode')}</label>
              <input
                name="barcode"
                value={values.barcode}
                inputMode="numeric"
                maxLength={BARCODE_MAX_DIGITS}
                onChange={(e) => {
                  void setFieldValue('barcode', sanitizeBarcodeInput(e.target.value), true);
                }}
                onBlur={handleBlur}
              />
              <FormFieldError message={showError('barcode') ? errors.barcode : undefined} />
            </div>
          </div>
          <div className="mf-row">
            <div className={fieldClass(showError('uom'))}>
              <label>{t('uom')}</label>
              <SearchableSelect
                options={uomOptions}
                value={values.uom}
                onChange={(uom) => {
                  void setFieldValue('uom', uom, true);
                  setFieldTouched('uom', true, false);
                }}
                placeholder={t('uom')}
                hasError={showError('uom')}
              />
              <FormFieldError message={showError('uom') ? errors.uom : undefined} />
            </div>
            <div className={fieldClass(showError('weight'))}>
              <label>{t('weightKg')}</label>
              <input
                name="weight"
                type="text"
                inputMode="decimal"
                placeholder={t('productMaster.weightPlaceholder', 'e.g. 25')}
                value={values.weight}
                onChange={(e) => {
                  void setFieldValue('weight', sanitizeWeightInput(e.target.value), true);
                }}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                    e.preventDefault();
                  }
                }}
              />
              <FormFieldError message={showError('weight') ? errors.weight : undefined} />
            </div>
          </div>

          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              margin: '16px 0 10px',
              color: 'var(--text-secondary)',
            }}
          >
            {t('shippingDefaults')}
          </h4>
          <div className="mf-grid">
            <div className={fieldClass(showError('temperature'))}>
              <label>{t('temperature')}</label>
              <SearchableSelect
                options={tempOptions}
                value={values.temperature}
                onChange={(temperature) => {
                  void setFieldValue('temperature', temperature, true);
                  setFieldTouched('temperature', true, false);
                }}
                hasError={showError('temperature')}
              />
              <FormFieldError message={showError('temperature') ? errors.temperature : undefined} />
            </div>
            <div className={fieldClass(showError('palletType'))}>
              <label>{t('palletType')}</label>
              <SearchableSelect
                options={palletOptions}
                value={values.palletType}
                onChange={(palletType) => {
                  void setFieldValue('palletType', palletType, true);
                  setFieldTouched('palletType', true, false);
                }}
                hasError={showError('palletType')}
              />
              <FormFieldError message={showError('palletType') ? errors.palletType : undefined} />
            </div>
          </div>
          <div className="mf-grid">
            <ToggleField
              label={t('hazardous')}
              value={values.hazardous}
              onChange={(hazardous) => {
                setFieldValue('hazardous', hazardous);
                setFieldTouched('hazardous', true, false);
              }}
            />
            <ToggleField
              label={t('stackable')}
              value={values.stackable}
              onChange={(stackable) => {
                setFieldValue('stackable', stackable);
                setFieldTouched('stackable', true, false);
              }}
            />
          </div>

          <div className={fieldClass(showError('tags'))} style={{ marginTop: '1rem' }}>
            <label>{t('tags')}</label>
            <input
              name="tags"
              value={values.tags}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t('tagsCommaSeparated')}
            />
            <FormFieldError message={showError('tags') ? errors.tags : undefined} />
          </div>
        </div>
        <div className="modal-ft">
          <button type="button" className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-p" disabled={isSubmitting || saving}>
            {isSubmitting || saving
              ? t('saving')
              : editMode
                ? t('save')
                : t('create')}
          </button>
        </div>
      </Form>
    </div>
  );
}
