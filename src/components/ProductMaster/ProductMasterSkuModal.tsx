import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
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
import { productMasterService } from '../../api/services/productMasterService';
import { mapReferenceToProductTypes } from '../../api/mappers/productMasterMapper';
import type { ApiReferenceCategory } from '../../api/types/productMaster';
import type { ProductType } from '../../context/AppContext';
import '../../styles/product-master-sku-modal.css';

const skuValidationSchema = Yup.object().shape({
  catId: Yup.string().trim().required('Category is required'),
  typeId: Yup.string().trim().required('Please select a product type'),
  name: Yup.string().trim().required('SKU Name is required'),
  number: Yup.string().trim().required('SKU Number is required'),
});

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

  const uomOptions = useMemo(() => UOM_OPTIONS.map((u) => ({ value: u, label: u })), []);
  const tempOptions = useMemo(() => TEMP_OPTIONS.map((v) => ({ value: v, label: v })), []);
  const palletOptions = useMemo(() => PALLET_OPTIONS.map((v) => ({ value: v, label: v })), []);

  const formInitialValues = useMemo(
    () => ({ ...EMPTY_NEW_SKU, ...initialValues }),
    [initialValues]
  );

  if (!isOpen) return null;

  const modalTitle = title ?? (editMode ? t('editSku') : t('addSkuMenu'));

  return createPortal(
    <Formik
      initialValues={formInitialValues}
      validationSchema={skuValidationSchema}
      enableReinitialize={editMode}
      validateOnChange
      validateOnBlur
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await onSubmit(values);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({
        values,
        errors,
        touched,
        submitCount,
        handleChange,
        handleBlur,
        setFieldValue,
        setFieldTouched,
        setValues,
        isSubmitting,
      }) => {
        const showError = (field: keyof NewSkuForm) =>
          Boolean((touched[field] || submitCount > 0) && errors[field]);

        const selectedCat = apiCategories.find((c) => String(c.id) === String(values.catId));
        const typeOptions = (selectedCat?.types ?? []).map((tp) => ({
          value: String(tp.id),
          label: tp.name,
        }));

        return (
          <div className="modal-bg show pm-sku-modal" onClick={onClose}>
            <Form className="modal modal-lg" onClick={(e) => e.stopPropagation()} noValidate>
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
                  <input name="name" value={values.name} onChange={handleChange} onBlur={handleBlur} />
                  <FormFieldError message={showError('name') ? errors.name : undefined} />
                </div>
                <div className="mf-row">
                  <div className={fieldClass(showError('number'))}>
                    <label>
                      {t('skuNumber')} <span className="req">*</span>
                    </label>
                    <input name="number" value={values.number} onChange={handleChange} onBlur={handleBlur} />
                    <FormFieldError message={showError('number') ? errors.number : undefined} />
                  </div>
                  <div className={fieldClass(showError('barcode'))}>
                    <label>{t('barcode')}</label>
                    <input name="barcode" value={values.barcode} onChange={handleChange} onBlur={handleBlur} />
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
                    <input name="weight" value={values.weight} onChange={handleChange} onBlur={handleBlur} />
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

                <div className={fieldClass(showError('tags'))}>
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
                  {editMode ? t('save') : t('create')}
                </button>
              </div>
            </Form>
          </div>
        );
      }}
    </Formik>,
    document.body
  );
};
