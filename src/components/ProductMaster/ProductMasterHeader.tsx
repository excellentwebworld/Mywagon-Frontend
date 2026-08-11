import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProductMasterState } from "../../pages/ProductMaster/hooks/useProductMaster";
import { ContextualTutorialTrigger } from "../Tutorials";
import "../../styles/tutorials.css";

type Props = Pick<
  ProductMasterState,
  | "showToast"
  | "addDropdownOpen"
  | "setAddDropdownOpen"
  | "openAddSku"
  | "openAiWizard"
  | "openImportModal"
  | "handleExport"
  | "exporting"
  | "downloadTemplate"
  | "t"
>;

export const ProductMasterHeader: React.FC<Props> = ({
  addDropdownOpen,
  setAddDropdownOpen,
  openAddSku,
  openAiWizard,
  openImportModal,
  handleExport,
  exporting,
  downloadTemplate,
  t,
}) => {
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const addWrapRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const closeAddDropdown = useCallback(() => {
    setAddDropdownOpen(false);
  }, [setAddDropdownOpen]);

  useEffect(() => {
    if (!addDropdownOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (addWrapRef.current?.contains(target)) return;
      if (addMenuRef.current?.contains(target)) return;
      closeAddDropdown();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [addDropdownOpen, closeAddDropdown]);

  const updateMenuPosition = useCallback(() => {
    const btn = addBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    if (!addDropdownOpen) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [addDropdownOpen, updateMenuPosition]);

  const toggleAddDropdown = () => {
    if (!addDropdownOpen) {
      updateMenuPosition();
    }
    setAddDropdownOpen(!addDropdownOpen);
  };

  const addMenu = addDropdownOpen ? (
    <div
      ref={addMenuRef}
      className="add-dd add-dd--portal show"
      style={{ top: menuPos.top, right: menuPos.right }}
      role="menu"
    >
      <div className="add-dd-i" onClick={openAddSku} role="menuitem" tabIndex={0}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        {t("addSkuMenu")}
      </div>
      <div className="add-dd-i" onClick={openImportModal} role="menuitem" tabIndex={0}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>{" "}
        {t("importCsv")}
      </div>
      <div
        className="add-dd-i"
        onClick={openAiWizard}
        role="menuitem"
        tabIndex={0}
        style={{ borderTop: "1px solid rgba(139,92,246,0.1)" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "#8B5CF6" }}
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <span
          style={{
            fontWeight: 600,
            background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("aiWizardTitle")}
        </span>
      </div>
    </div>
  ) : null;

  return (
    <div className="page-hdr anim">
      <div>
        <div className="tut-title-with-trigger">
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.3px", margin: 0 }}>
            {t("prodMaster")}
          </h1>
          <ContextualTutorialTrigger tutorialKey="productMaster" />
        </div>
        <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 3 }}>
          {t("subtitle")}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className="btn btn-md"
          onClick={handleExport}
          disabled={exporting}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting ? t("abExporting") : t("export")}
        </button>
        <div ref={addWrapRef} className="add-wrap">
          <button
            ref={addBtnRef}
            type="button"
            className="btn btn-p btn-md"
            onClick={toggleAddDropdown}
            aria-haspopup="menu"
            aria-expanded={addDropdownOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t("add")}
          </button>
        </div>
      </div>
      {addMenu && createPortal(addMenu, document.body)}
    </div>
  );
};
