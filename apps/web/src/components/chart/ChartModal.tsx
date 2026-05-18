"use client";

import { buildStarHistoryUrl } from "@github-trending/core";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ChartModalProps {
  owner: string;
  name: string;
  open: boolean;
  onClose: () => void;
}

export function ChartModal({ owner, name, open, onClose }: ChartModalProps) {
  const t = useTranslations("chartModal");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const url = buildStarHistoryUrl([{ owner, name }]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.src = open ? url : "about:blank";
  }, [open, url]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="chart-modal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="chart-modal-title"
    >
      <div className="chart-modal__inner">
        <header className="chart-modal__header">
          <h2 id="chart-modal-title" className="chart-modal__title">
            <span className="chart-modal__owner">{owner}</span>
            <span className="chart-modal__repo">/ {name}</span>
          </h2>
          <button
            type="button"
            className="chart-modal__close"
            aria-label={t("close")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="chart-modal__frame-wrap">
          <iframe
            ref={iframeRef}
            id="chart-modal-iframe"
            className="chart-modal__iframe"
            title={`Star history ${owner}/${name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        <footer className="chart-modal__footer">
          <p className="chart-modal__note">{t("note")}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            {t("openExternal")}
          </a>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
