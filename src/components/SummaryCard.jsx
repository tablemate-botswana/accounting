import React, { useCallback } from "react";
import { Card } from "./Card";
import { formatAmount } from "../utils";
import { downloadCsv } from "../utils";
import { downloadPdfTable } from "../exportUtils";

/**
 * Summary list card with optional Spend / A–Z sort.
 * items: array of { name?, supplier?, category?, total?, USD?, BWP?, totalInUsdEquiv? }
 * sortMode: "spend" | "alpha"
 * nameKey: "name" | "supplier" | "category" (which field to show as label)
 */
export function SummaryCard({
  title,
  items,
  sortMode,
  onSortChange,
  emptyMessage = "No expenses for this filter.",
  nameKey = "name",
  maxItems,
  formatAmount: formatAmountProp,
}) {
  const format = formatAmountProp ?? formatAmount;
  const displayItems = maxItems != null ? items.slice(0, maxItems) : items;

  const labelHeader = title.replace(/^By\s+/i, "") || "Name";
  const baseName = `summary-${(title || "export").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`;

  const onExportCsv = useCallback(() => {
    const headers = [labelHeader, "USD", "BWP", "Total (USD equiv)"];
    const rows = items.map((r) => {
      const label = r[nameKey] ?? r.supplier_name ?? r.category_name ?? "—";
      const usd = r.USD != null ? r.USD : "";
      const bwp = r.BWP != null ? r.BWP : "";
      const total = r.totalInUsdEquiv ?? (Number(r.total) || 0);
      return [label, String(usd), String(bwp), String(total)];
    });
    downloadCsv(headers, rows, `${baseName}.csv`);
  }, [items, nameKey, labelHeader, baseName]);

  const onExportPdf = useCallback(() => {
    const headers = [[labelHeader, "USD", "BWP", "Total (USD equiv)"]];
    const body = items.map((r) => {
      const label = r[nameKey] ?? r.supplier_name ?? r.category_name ?? "—";
      const usd = r.USD != null ? format(r.USD, "USD") : "—";
      const bwp = r.BWP != null ? format(r.BWP, "BWP") : "—";
      const total = format(r.totalInUsdEquiv ?? (Number(r.total) || 0), "USD");
      return [label, usd, bwp, total];
    });
    downloadPdfTable(headers, body, `${baseName}.pdf`, { orientation: "landscape", fontSize: 8 });
  }, [items, nameKey, labelHeader, baseName, format]);

  const action = (
    <>
      {onSortChange != null && (
        <span className="summary-sort">
          <button
            type="button"
            className={`btn btn-xs ${sortMode === "spend" ? "btn-outline active" : "btn-link"}`}
            onClick={() => onSortChange("spend")}
            title="Sort by spend"
          >
            Spend
          </button>
          <button
            type="button"
            className={`btn btn-xs ${sortMode === "alpha" ? "btn-outline active" : "btn-link"}`}
            onClick={() => onSortChange("alpha")}
            title="Sort A–Z"
          >
            A–Z
          </button>
        </span>
      )}
      <span className="card-export-buttons">
        <button type="button" className="btn btn-xs btn-outline" onClick={onExportCsv} title="Export to CSV">
          CSV
        </button>
        <button type="button" className="btn btn-xs btn-outline" onClick={onExportPdf} title="Export to PDF">
          PDF
        </button>
      </span>
    </>
  );

  return (
    <Card title={title} action={action}>
      <ul className="list-totals">
        {displayItems.map((r, i) => {
          const label = r[nameKey] ?? r.supplier_name ?? r.category_name ?? "—";
          return (
            <li key={r.id ?? i}>
              <span>{label}</span>
              <strong className="amount-multi">
                {r.USD != null ? (
                  <>
                    {format(r.USD, "USD")} {r.BWP > 0 && format(r.BWP, "BWP")}{" "}
                    <span className="equiv">
                      ≈ {format(r.totalInUsdEquiv ?? (Number(r.total) || 0), "USD")}
                    </span>
                  </>
                ) : (
                  format(r.total ?? 0, "USD")
                )}
              </strong>
            </li>
          );
        })}
        {items.length === 0 && <li className="muted">{emptyMessage}</li>}
      </ul>
    </Card>
  );
}
