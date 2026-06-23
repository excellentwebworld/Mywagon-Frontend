import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { SearchableSelect } from "../ui/SearchableSelect";
import {
  UOM_OPTIONS,
  TEMP_OPTIONS,
  PALLET_OPTIONS,
} from "../../pages/ProductMaster/constants";
import { useTranslation } from "../../hooks/useTranslation";
import type { ProductMasterState } from "../../pages/ProductMaster/hooks/useProductMaster";
import type { NewSkuForm } from "../../pages/ProductMaster/types";
import { ToggleField } from "../AddressBook";
import { FormFieldError } from "../AddressBook/FormFieldError";

type Props = Pick<
  ProductMasterState,
  | "categories"
  | "productTypes"
  | "catName"
  | "isSkuOpen"
  | "setIsSkuOpen"
  | "editSkuMode"
  | "newSku"
  | "setNewSku"
  | "handleSaveSku"
  | "saving"
  | "isImportOpen"
  | "importStep"
  | "importResult"
  | "importLogs"
  | "importProgress"
  | "closeImportModal"
  | "runImport"
  | "abortImport"
  | "downloadTemplate"
  | "downloadCategoryIndex"
  | "t"
>;

const skuValidationSchema = Yup.object().shape({
  catId: Yup.string().required("Category is required"),
  typeId: Yup.string().required("Please select a product type"),
  name: Yup.string().trim().required("SKU Name is required"),
  number: Yup.string().trim().required("SKU Number is required"),
});

function fieldClass(hasError: boolean): string {
  return hasError ? "mf has-error" : "mf";
}

export const ProductMasterModals: React.FC<Props> = (pm) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const categoryOptions = [
    { value: "", label: t("selectCategory") },
    ...pm.categories.map((c) => ({ value: c.id, label: pm.catName(c) })),
  ];

  const uomOptions = UOM_OPTIONS.map((u) => ({ value: u, label: u }));
  const tempOptions = TEMP_OPTIONS.map((v) => ({ value: v, label: v }));
  const palletOptions = PALLET_OPTIONS.map((v) => ({ value: v, label: v }));

  const handleImportUpload = () => {
    if (!importFile) return;
    void pm.runImport(importFile);
  };

  const resetImportForm = () => {
    setImportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return createPortal(
    <>
      {pm.isSkuOpen && (
        <Formik
          initialValues={pm.newSku}
          validationSchema={skuValidationSchema}
          enableReinitialize
          onSubmit={async (values) => {
            pm.handleSaveSku(values);
          }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            setFieldValue,
            setFieldTouched,
            isSubmitting,
          }) => {
            const showError = (field: keyof NewSkuForm) =>
              Boolean(touched[field] && errors[field]);

            const typeOptions = [
              { value: "", label: t("selectType") },
              ...pm.productTypes
                .filter((tp) => tp.catId === values.catId)
                .map((tp) => ({ value: tp.id, label: tp.name })),
            ];

            return (
              <div className="modal-bg show" onClick={() => pm.setIsSkuOpen(false)}>
                <Form className="modal modal-lg" onClick={(e) => e.stopPropagation()} noValidate>
                  <div className="modal-h">
                    <h3>{pm.editSkuMode ? t("editSku") : t("addSkuMenu")}</h3>
                    <button
                      type="button"
                      className="modal-close"
                      onClick={() => pm.setIsSkuOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="mf-row">
                      <div className={fieldClass(showError("catId"))}>
                        <label>
                          {t("category")} <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          options={categoryOptions}
                          value={values.catId}
                          onChange={(catId) => {
                            setFieldValue("catId", catId);
                            setFieldValue("typeId", "");
                            setFieldTouched("catId", true, false);
                          }}
                          placeholder={t("selectCategory")}
                          hasError={showError("catId")}
                        />
                        <FormFieldError message={showError("catId") ? errors.catId : undefined} />
                      </div>
                      <div className={fieldClass(showError("typeId"))}>
                        <label>
                          {t("productType")} <span className="req">*</span>
                        </label>
                        <SearchableSelect
                          options={typeOptions}
                          value={values.typeId}
                          onChange={(typeId) => {
                            setFieldValue("typeId", typeId);
                            setFieldTouched("typeId", true, false);
                            if (!pm.editSkuMode && typeId) {
                              const tp = pm.productTypes.find((x) => x.id === typeId);
                              if (tp) {
                                setFieldValue("temperature", tp.defaults.temp);
                                setFieldValue("palletType", tp.defaults.palletType);
                                setFieldValue("hazardous", tp.defaults.hazard);
                                setFieldValue("stackable", tp.defaults.stackable);
                              }
                            }
                          }}
                          placeholder={t("selectType")}
                          disabled={!values.catId}
                          hasError={showError("typeId")}
                        />
                        <FormFieldError message={showError("typeId") ? errors.typeId : undefined} />
                      </div>
                    </div>
                    <div className={fieldClass(showError("name"))}>
                      <label>
                        {t("skuName")} <span className="req">*</span>
                      </label>
                      <input
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      <FormFieldError message={showError("name") ? errors.name : undefined} />
                    </div>
                    <div className="mf-row">
                      <div className={fieldClass(showError("number"))}>
                        <label>
                          {t("skuNumber")} <span className="req">*</span>
                        </label>
                        <input
                          name="number"
                          value={values.number}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <FormFieldError message={showError("number") ? errors.number : undefined} />
                      </div>
                      <div className={fieldClass(showError("barcode"))}>
                        <label>{t("barcode")}</label>
                        <input
                          name="barcode"
                          value={values.barcode}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <FormFieldError message={showError("barcode") ? errors.barcode : undefined} />
                      </div>
                    </div>
                    <div className="mf-row">
                      <div className={fieldClass(showError("uom"))}>
                        <label>{t("uom")}</label>
                        <SearchableSelect
                          options={uomOptions}
                          value={values.uom}
                          onChange={(uom) => {
                            setFieldValue("uom", uom);
                            setFieldTouched("uom", true, false);
                          }}
                          placeholder={t("uom")}
                          hasError={showError("uom")}
                        />
                        <FormFieldError message={showError("uom") ? errors.uom : undefined} />
                      </div>
                      <div className={fieldClass(showError("weight"))}>
                        <label>{t("weightKg")}</label>
                        <input
                          name="weight"
                          value={values.weight}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <FormFieldError message={showError("weight") ? errors.weight : undefined} />
                      </div>
                    </div>

                    <h4
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        margin: "16px 0 10px",
                        color: "var(--t2)",
                      }}
                    >
                      {t("shippingDefaults")}
                    </h4>
                    <div className="mf-grid">
                      <div className={fieldClass(showError("temperature"))}>
                        <label>{t("temperature")}</label>
                        <SearchableSelect
                          options={tempOptions}
                          value={values.temperature}
                          onChange={(temperature) => {
                            setFieldValue("temperature", temperature);
                            setFieldTouched("temperature", true, false);
                          }}
                          hasError={showError("temperature")}
                        />
                        <FormFieldError message={showError("temperature") ? errors.temperature : undefined} />
                      </div>
                      <div className={fieldClass(showError("palletType"))}>
                        <label>{t("palletType")}</label>
                        <SearchableSelect
                          options={palletOptions}
                          value={values.palletType}
                          onChange={(palletType) => {
                            setFieldValue("palletType", palletType);
                            setFieldTouched("palletType", true, false);
                          }}
                          hasError={showError("palletType")}
                        />
                        <FormFieldError message={showError("palletType") ? errors.palletType : undefined} />
                      </div>
                    </div>
                    <div className="mf-grid">
                      <ToggleField
                        label={t("hazardous")}
                        value={values.hazardous}
                        onChange={(hazardous) => {
                          setFieldValue("hazardous", hazardous);
                          setFieldTouched("hazardous", true, false);
                        }}
                      />
                      <ToggleField
                        label={t("stackable")}
                        value={values.stackable}
                        onChange={(stackable) => {
                          setFieldValue("stackable", stackable);
                          setFieldTouched("stackable", true, false);
                        }}
                      />
                    </div>

                    <div className={fieldClass(showError("tags"))}>
                      <label>{t("tags")}</label>
                      <input
                        name="tags"
                        value={values.tags}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={t("tagsCommaSeparated")}
                      />
                      <FormFieldError message={showError("tags") ? errors.tags : undefined} />
                    </div>
                  </div>
                  <div className="modal-ft">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => pm.setIsSkuOpen(false)}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-p"
                      disabled={isSubmitting || pm.saving}
                    >
                      {pm.editSkuMode ? t("save") : t("create")}
                    </button>
                  </div>
                </Form>
              </div>
            );
          }}
        </Formik>
      )}

      {pm.isImportOpen && (
        <div className="modal-bg show" onClick={pm.closeImportModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <h3>{t("importCsvBulk")}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={pm.closeImportModal}
              >
                ✕
              </button>
            </div>

            {pm.importStep === "form" && (
              <>
                <div className="modal-body">
                  <div className="import-opts">
                    <div
                      className="import-opt"
                      onClick={() => void pm.downloadTemplate()}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="io-ico">📄</div>
                      <div className="io-title">
                        {t("downloadBulkTemplate")}
                      </div>
                      <div className="io-sub">
                        {t("downloadBulkTemplateSub")}
                      </div>
                    </div>
                    <div
                      className="import-opt"
                      onClick={pm.downloadCategoryIndex}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="io-ico">📁</div>
                      <div className="io-title">
                        {t("downloadCategoryIndex")}
                      </div>
                      <div className="io-sub">
                        {t("downloadCategoryIndexSub")}
                      </div>
                    </div>
                  </div>
                  <div className="mf">
                    <label>{t("uploadFile")}</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt,.xlsx,.xls"
                      style={{ display: "none" }}
                      onChange={(e) =>
                        setImportFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <input
                      type="text"
                      readOnly
                      placeholder={t("chooseFile", "Choose file")}
                      value={importFile ? importFile.name : ""}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                  <div className="import-stat">
                    <div>
                      <span>{t("expectedColumns")}:</span>{" "}
                      {t("importExpectedColumns")}
                    </div>
                  </div>
                </div>
                <div className="modal-ft">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: "var(--t2)", fontWeight: 600 }}
                    onClick={pm.closeImportModal}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-p"
                    onClick={handleImportUpload}
                    disabled={!importFile}
                  >
                    {t("upload")}
                  </button>
                </div>
              </>
            )}

            {pm.importStep === "processing" && (
              <>
                <div className="modal-body">
                  <div className="import-progress-head">
                    <div className="import-spinner" aria-hidden />
                    <div className="import-progress-copy">
                      <div className="import-progress-title">
                        {t("importReadingFile")}
                      </div>
                      <div className="import-progress-sub">
                        {t("importInitializing")}
                      </div>
                    </div>
                    <div className="import-progress-pct">
                      {pm.importProgress}%
                    </div>
                  </div>
                  <div className="import-progress-bar">
                    <div
                      className="import-progress-fill"
                      style={{ width: `${pm.importProgress}%` }}
                    />
                  </div>
                  <div className="import-logs-label">
                    <span>{t("importStreamLogs")}</span>
                    <span className="import-log-counter">
                      {pm.importLogs.length} / {pm.importLogs.length}
                    </span>
                  </div>
                  <div className="import-logs-box">
                    {pm.importLogs.length === 0 ? (
                      <div className="import-logs-placeholder">
                        {t("importLogsPlaceholder")}
                      </div>
                    ) : (
                      pm.importLogs.map((line, i) => (
                        <div
                          key={i}
                          className={
                            line.startsWith("✗")
                              ? "import-log-err"
                              : "import-log-ok"
                          }
                        >
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="modal-ft import-processing-ft">
                  <span className="import-keep-open">
                    {t("importKeepTabOpen")}
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={pm.abortImport}
                  >
                    {t("abort")}
                  </button>
                </div>
              </>
            )}

            {pm.importStep === "result" && pm.importResult && (
              <>
                <div className="modal-body import-result-body">
                  <div
                    className={`import-result-hero${pm.importResult.failed > 0 ? " warn" : ""}`}
                  >
                    {pm.importResult.failed > 0 ? "⚠️" : "✓"}
                  </div>
                  <h3 className="import-result-title">{t("importFinished")}</h3>
                  <p className="import-result-desc">
                    {t("importFinishedDesc")}
                  </p>
                  <div className="import-result-grid">
                    <div className="import-result-stat">
                      <div className="import-result-val">
                        {pm.importResult.total}
                      </div>
                      <div className="import-result-lbl">{t("totalRows")}</div>
                    </div>
                    <div className="import-result-stat ok">
                      <div className="import-result-val">
                        {pm.importResult.success}
                      </div>
                      <div className="import-result-lbl">{t("succeeded")}</div>
                    </div>
                    <div className="import-result-stat err">
                      <div className="import-result-val">
                        {pm.importResult.failed}
                      </div>
                      <div className="import-result-lbl">{t("failed")}</div>
                    </div>
                  </div>
                  {pm.importLogs.length > 0 && (
                    <div className="import-logs-box import-logs-box-compact">
                      {pm.importLogs.slice(0, 20).map((line, i) => (
                        <div
                          key={i}
                          className={
                            line.startsWith("✗")
                              ? "import-log-err"
                              : "import-log-ok"
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-ft" style={{ justifyContent: "center" }}>
                  <button
                    type="button"
                    className="btn btn-p"
                    onClick={() => {
                      resetImportForm();
                      pm.closeImportModal();
                    }}
                  >
                    {t("importDoneRefresh")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
};
