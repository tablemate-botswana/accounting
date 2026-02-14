import React from "react";
import { Modal } from "./Modal";

export function ViewInvoicesModal({
  expense,
  getReceiptUrls,
  detachingUrl,
  onClose,
  onDetach,
}) {
  if (!expense) return null;
  const urls = getReceiptUrls(expense);

  return (
    <Modal title="Invoices for this expense" onClose={onClose} ariaLabel="View invoices">
      <p className="hint">
        {expense.description || "No description"} — {expense.expense_date} — {expense.amount}{" "}
        {expense.currency}
      </p>
      <ul className="list-invoices" style={{ listStyle: "none", paddingLeft: 0 }}>
        {urls.map((url, i) => (
          <li key={i} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              View invoice {i + 1}
            </a>
            {url.startsWith("http") && (
              <span className="muted" style={{ fontSize: "0.85em" }}>
                {url.length > 50 ? url.slice(0, 50) + "…" : url}
              </span>
            )}
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onDetach(expense, url)}
              disabled={detachingUrl === url}
              title="Remove this invoice and delete the file"
            >
              {detachingUrl === url ? "Removing…" : "Remove"}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-outline" onClick={onClose}>
        Close
      </button>
    </Modal>
  );
}
