import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "../../hooks/useTranslation";
import type { ProductMasterState } from "../../pages/ProductMaster/hooks/useProductMaster";
import { ProductMasterSkuModal } from "./ProductMasterSkuModal";

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
  | "skuSaving"
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

export const ProductMasterModals: React.FC<Props> = (pm) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

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
      <ProductMasterSkuModal
        isOpen={pm.isSkuOpen}
        onClose={() => pm.setIsSkuOpen(false)}
        editMode={pm.editSkuMode}
        initialValues={pm.newSku}
        onSubmit={pm.handleSaveSku}
        saving={pm.skuSaving}
        productTypes={pm.productTypes}
      />

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
