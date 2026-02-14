import React from "react";
import { Card } from "./Card";
import { formatAmount } from "../utils";

const COLUMNS = [
  { key: "expense_date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", className: "num" },
  { key: "currency", label: "Curr" },
  { key: "supplier_name", label: "Supplier" },
  { key: "category_name", label: "Category" },
  { key: "added_by_name", label: "Added by" },
  { key: "user_name", label: "Paid for" },
  { key: "removed_by_name", label: "Removed by" },
  { key: null, label: "Receipt" },
  { key: null, label: "Action", className: "th-action" },
];

export function ExpensesTable({
  sortedExpenses,
  expenses,
  users,
  sortBy,
  sortDir,
  onSortChange,
  getReceiptUrls,
  onOpenAttach,
  onViewInvoices,
  onDeleteExpense,
  canDeleteExpense,
  onExportCsv,
  onExportPdf,
  onAddExpense,
}) {
  const getPaidFor = (e) =>
    e.user_name ?? (users?.find((u) => String(u.id) === String(e.user_id))?.name) ?? "—";

  return (
    <Card
      title="Recent expenses"
      className="card-table card-table-tall"
      action={
        <span className="card-actions-row">
          <button type="button" className="btn btn-outline btn-sm" onClick={onExportCsv}>
            Export CSV
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={onExportPdf}>
            Export PDF
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAddExpense}>
            Add expense
          </button>
        </span>
      }
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.label} className={col.className ?? ""}>
                  {col.key != null ? (
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => {
                        const same = sortBy === col.key;
                        onSortChange(col.key, same ? (sortDir === "asc" ? "desc" : "asc") : "asc");
                      }}
                    >
                      {col.label}
                      {sortBy === col.key && (
                        <span className="th-sort-icon" aria-hidden="true">
                          {sortDir === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.map((e) => (
              <tr key={e.id} className={e.removed_at ? "expense-removed" : ""}>
                <td>{e.expense_date}</td>
                <td>{e.description || "—"}</td>
                <td className="num">{formatAmount(e.amount, e.currency)}</td>
                <td>{(e.currency || "USD").toUpperCase()}</td>
                <td>{e.supplier_name ?? "—"}</td>
                <td>{e.category_name ?? "—"}</td>
                <td>{e.added_by_name ?? "—"}</td>
                <td>{getPaidFor(e)}</td>
                <td>{e.removed_at ? (e.removed_by_name ?? "—") : "—"}</td>
                <td>
                  <ReceiptCell
                    expense={e}
                    getReceiptUrls={getReceiptUrls}
                    onOpenAttach={onOpenAttach}
                    onViewInvoices={onViewInvoices}
                  />
                </td>
                <td className="td-action">
                  {e.removed_at ? (
                    <span className="muted">Removed</span>
                  ) : canDeleteExpense(e) ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => onDeleteExpense(e.id)}
                      title="Remove expense"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {(sortedExpenses || []).length === 0 && (
              <tr>
                <td colSpan={11} className="empty-cell">
                  No expenses for this view. Add one above or import CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReceiptCell({ expense, getReceiptUrls, onOpenAttach, onViewInvoices }) {
  const urls = getReceiptUrls(expense);
  if (urls.length === 0) {
    return (
      <>
        {expense.removed_at ? "—" : null}
        {!expense.removed_at && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => onOpenAttach(expense.id)}
            title="Attach invoice"
          >
            Attach
          </button>
        )}
      </>
    );
  }
  if (urls.length === 1) {
    return (
      <>
        <a href={urls[0]} target="_blank" rel="noopener noreferrer">
          View
        </a>
        {!expense.removed_at && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ marginLeft: 6 }}
            onClick={() => onOpenAttach(expense.id)}
            title="Attach another invoice"
          >
            Attach
          </button>
        )}
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-link"
        onClick={() => onViewInvoices(expense)}
        title="View all attached invoices"
      >
        View all ({urls.length})
      </button>
      {!expense.removed_at && (
        <button
          type="button"
          className="btn btn-sm btn-outline"
          style={{ marginLeft: 6 }}
          onClick={() => onOpenAttach(expense.id)}
          title="Attach another invoice"
        >
          Attach
        </button>
      )}
    </>
  );
}
