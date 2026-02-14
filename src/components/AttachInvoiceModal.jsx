import React from "react";
import { Modal } from "./Modal";

export function AttachInvoiceModal({
  open,
  expenseId,
  expenses,
  attachInvoiceUrl,
  setAttachInvoiceUrl,
  attachUploading,
  attachFileInputRef,
  getReceiptUrls,
  onClose,
  onSubmit,
  onFileChange,
}) {
  if (!open) return null;
  const expense = (expenses || []).find((x) => x.id === expenseId);
  const existing = getReceiptUrls(expense);

  return (
    <Modal title="Attach invoice" onClose={onClose} ariaLabel="Attach invoice">
      {existing.length > 0 ? (
        <p className="hint">Current attachments: {existing.length}. Add another link or file below.</p>
      ) : (
        <p className="hint">Add a link (URL) or upload a file from your device (PDF, image; max 10 MB).</p>
      )}
      <form onSubmit={onSubmit} className="form">
        <label className="label">Link or file</label>
        <input
          type="text"
          placeholder="Paste link (https://...) or upload file below"
          value={typeof attachInvoiceUrl === "string" && !attachInvoiceUrl.startsWith("data:") ? attachInvoiceUrl : ""}
          onChange={(e) => setAttachInvoiceUrl(e.target.value)}
          className="input"
        />
        <label className="label">Or choose file from PC</label>
        <input
          ref={attachFileInputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
          onChange={onFileChange}
          className="input"
          disabled={attachUploading}
        />
        {attachUploading && <p className="msg small">Uploading…</p>}
        {attachInvoiceUrl && attachInvoiceUrl.startsWith("data:") && (
          <p className="msg small">File attached. Click Save to store.</p>
        )}
        <button type="submit" className="btn btn-primary" disabled={attachUploading}>
          Save
        </button>
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancel
        </button>
      </form>
    </Modal>
  );
}
