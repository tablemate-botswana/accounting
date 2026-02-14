import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";

applyPlugin(jsPDF);

/**
 * Build and download a PDF with a single table.
 * @param {string[][]} headers - Row of column headers (e.g. [["Date", "Amount", "Note"]])
 * @param {string[][]} body - Array of rows
 * @param {string} filename - Download filename (e.g. "total-spend-2025-02-14.pdf")
 * @param {{ orientation?: "portrait"|"landscape", fontSize?: number }} options
 */
export function downloadPdfTable(headers, body, filename, options = {}) {
  const { orientation = "portrait", fontSize = 9 } = options;
  const doc = new jsPDF({ orientation });
  doc.autoTable({
    head: headers,
    body,
    styles: { fontSize },
    margin: { top: 10 },
  });
  doc.save(filename || "export.pdf");
}
