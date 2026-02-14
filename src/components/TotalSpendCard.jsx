import React, { useCallback } from "react";
import { Card } from "./Card";
import { formatAmount } from "../utils";
import { downloadCsv } from "../utils";
import { downloadPdfTable } from "../exportUtils";

export function TotalSpendCard({ totalUSD, totalBWP, totalInUsdEquiv }) {
  const baseName = `total-spend-${new Date().toISOString().slice(0, 10)}`;

  const onExportCsv = useCallback(() => {
    const headers = ["Currency", "Amount", "Total (USD equiv)"];
    const rows = [
      ["USD", String(totalUSD ?? 0), ""],
      ["BWP", String(totalBWP ?? 0), ""],
      ["Total", "", String(totalInUsdEquiv ?? 0)],
    ];
    downloadCsv(headers, rows, `${baseName}.csv`);
  }, [totalUSD, totalBWP, totalInUsdEquiv]);

  const onExportPdf = useCallback(() => {
    const headers = [["Currency", "Amount", "Total (USD equiv)"]];
    const body = [
      ["USD", formatAmount(totalUSD ?? 0, "USD"), "—"],
      ["BWP", formatAmount(totalBWP ?? 0, "BWP"), "—"],
      ["Total", "—", formatAmount(totalInUsdEquiv ?? 0, "USD")],
    ];
    downloadPdfTable(headers, body, `${baseName}.pdf`);
  }, [totalUSD, totalBWP, totalInUsdEquiv]);

  const action = (
    <span className="card-export-buttons">
      <button type="button" className="btn btn-xs btn-outline" onClick={onExportCsv} title="Export to CSV">
        CSV
      </button>
      <button type="button" className="btn btn-xs btn-outline" onClick={onExportPdf} title="Export to PDF">
        PDF
      </button>
    </span>
  );

  return (
    <Card title="Total spend" action={action}>
      <div className="total-multi-currency">
        <div className="total-line">{formatAmount(totalUSD, "USD")} USD</div>
        <div className="total-line">{formatAmount(totalBWP, "BWP")} BWP</div>
        <div className="total-number total-usd-equiv">≈ {formatAmount(totalInUsdEquiv, "USD")} total</div>
      </div>
    </Card>
  );
}
