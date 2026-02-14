import React from "react";

/**
 * Reusable modal: overlay + box with title and close button.
 * @param {string} title - Modal title
 * @param {() => void} onClose - Close handler (backdrop click and X)
 * @param {React.ReactNode} children - Modal body content
 * @param {string} [ariaLabel] - Accessibility label for the dialog
 * @param {string} [className] - Extra class for the modal box (e.g. modal-box-wide)
 * @param {string} [bodyClassName] - Extra class for the modal body (e.g. modal-body-scroll)
 * @param {boolean} [front] - If true, add modal-overlay-front for z-index
 */
export function Modal({ title, onClose, children, ariaLabel, className = "", bodyClassName = "", front = true }) {
  return (
    <div
      className={`modal-overlay ${front ? "modal-overlay-front" : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      <div className={`modal-box ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
      </div>
    </div>
  );
}
