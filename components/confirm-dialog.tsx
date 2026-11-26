"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Accessible confirmation dialog for security-sensitive publish and delete
 * operations. Traps focus and restores the previously active control.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  danger = false,
  busy = false,
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      if (event.key !== "Tab" || !dialog.current) return;

      const focusables = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tf-dialog-backdrop">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tf-dialog-title"
        aria-describedby="tf-dialog-description"
        className="tf-dialog-panel"
      >
        <div className="tf-dialog-heading">
          <span className={danger ? "tf-dialog-icon danger" : "tf-dialog-icon"}>
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <button
            type="button"
            className="tf-dialog-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="tf-dialog-title">{title}</h2>
        <p id="tf-dialog-description">{description}</p>
        {children}
        <div className="tf-dialog-actions">
          <button
            type="button"
            className="tf-btn tf-btn-outline"
            ref={cancel}
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? "tf-btn tf-dialog-danger-button" : "tf-btn"}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
