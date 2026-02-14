import React from "react";
import { Card } from "./Card";

export function BulkCsvCard({
  bulkCsv,
  setBulkCsv,
  bulkErr,
  fileInputRef,
  onFileUpload,
  onImport,
}) {
  return (
    <Card title="Bulk upload (CSV)" className="card-tall">
      <p className="hint">
        Header: <code>date, amount, category, description, supplier</code>. Optional:{" "}
        <code>currency</code> (USD or BWP). One row per expense.
      </p>
      <textarea
        placeholder="Paste CSV here or use Choose file"
        value={bulkCsv}
        onChange={(e) => setBulkCsv(e.target.value)}
        rows={4}
        className="textarea-csv"
      />
      <div className="bulk-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={onFileUpload}
          style={{ display: "none" }}
        />
        <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
          Choose CSV file
        </button>
        <button type="button" className="btn btn-primary" onClick={onImport}>
          Import expenses
        </button>
      </div>
      {bulkErr && <div className="msg small">{bulkErr}</div>}
    </Card>
  );
}
