import React, { useCallback } from "react";
import { Card } from "./Card";
import { formatAmount } from "../utils";
import { downloadCsv } from "../utils";
import { downloadPdfTable } from "../exportUtils";

export function AuditLogCard({ auditLog, isLocal }) {
  const baseName = `activity-log-${new Date().toISOString().slice(0, 10)}`;
  const list = auditLog || [];

  const onExportCsv = useCallback(() => {
    const headers = ["Date & time", "Action", "User", "Expense #", "Expense date", "Amount", "Description"];
    const rows = list.map((a) => [
      a.created_at ?? "",
      a.action ?? "",
      a.user_name ?? "",
      String(a.expense_id ?? ""),
      a.expense_date ?? "",
      a.amount != null ? String(a.amount) : "",
      a.description ?? "",
    ]);
    downloadCsv(headers, rows, `${baseName}.csv`);
  }, [list]);

  const onExportPdf = useCallback(() => {
    const headers = [["Date & time", "Action", "User", "Expense #", "Expense date", "Amount", "Description"]];
    const body = list.map((a) => [
      a.created_at ?? "—",
      (a.action ?? "—").slice(0, 20),
      (a.user_name ?? "—").slice(0, 15),
      String(a.expense_id ?? "—"),
      a.expense_date ?? "—",
      a.amount != null ? formatAmount(a.amount, a.currency) : "—",
      (a.description ?? "—").slice(0, 30),
    ]);
    downloadPdfTable(headers, body, `${baseName}.pdf`, { orientation: "landscape", fontSize: 7 });
  }, [list]);

  const action = !isLocal ? (
    <span className="card-export-buttons">
      <button type="button" className="btn btn-xs btn-outline" onClick={onExportCsv} title="Export to CSV">
        CSV
      </button>
      <button type="button" className="btn btn-xs btn-outline" onClick={onExportPdf} title="Export to PDF">
        PDF
      </button>
    </span>
  ) : null;

  return (
    <Card title="Activity log" className="audit-log-card card-table" action={action}>
      {isLocal ? (
        <p className="muted">Activity log is available when signed in to the server.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Action</th>
                <th>User</th>
                <th>Expense #</th>
                <th>Expense date</th>
                <th className="num">Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {(auditLog || []).map((a) => (
                <tr key={a.id}>
                  <td>{a.created_at ?? "—"}</td>
                  <td>{a.action ?? "—"}</td>
                  <td>{a.user_name ?? "—"}</td>
                  <td>{a.expense_id ?? "—"}</td>
                  <td>{a.expense_date ?? "—"}</td>
                  <td className="num">{a.amount != null ? formatAmount(a.amount, a.currency) : "—"}</td>
                  <td>{a.description ?? "—"}</td>
                </tr>
              ))}
              {(auditLog || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
