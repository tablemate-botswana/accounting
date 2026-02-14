/**
 * Shared utilities for the accounting app.
 */

export const CURRENCIES = {
  USD: { symbol: "$", code: "USD" },
  BWP: { symbol: "P", code: "BWP" },
};

export function formatAmount(amount, currency = "USD") {
  const n = Number(amount ?? 0);
  const c = CURRENCIES[currency] || CURRENCIES.USD;
  return `${c.symbol}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format YYYY-MM-DD for display (e.g. 15 Jan 2024). */
export function formatRateDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T12:00:00");
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : isoDate;
}

/** Convert amount to USD using rate (1 USD = bwpPerUsd BWP). */
export function toUsd(amount, currency, bwpPerUsd) {
  const n = Number(amount ?? 0);
  if (currency === "BWP") return n / (Number(bwpPerUsd) || 13.5);
  return n;
}

export function qsFrom(filters) {
  const p = new URLSearchParams();
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.user_id) p.set("user_id", filters.user_id);
  if (filters.supplier_id) p.set("supplier_id", filters.supplier_id);
  if (filters.category_id) p.set("category_id", filters.category_id);
  const s = p.toString();
  return s ? `&${s}` : "";
}

/** Escape a value for CSV (quotes if needed). */
export function csvEscape(v) {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[",\r\n]/.test(s) ? `"${s}"` : s;
}

/** Download CSV from headers and rows (array of arrays). */
export function downloadCsv(headers, rows, filename) {
  const escape = csvEscape;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse CSV text into rows of { date, amount, category, description, supplier, ... }. */
export function parseExpenseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
