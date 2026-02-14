import React from "react";
import { Card } from "./Card";
import { formatRateDate } from "../utils";

export function ExpenseFilters({
  filters,
  setFilters,
  suppliers,
  categories,
  bwpPerUsd,
  setBwpPerUsd,
  bwpRateFetchFailed,
  bwpRateDate,
  showRemovedTransactions,
  onShowRemovedChange,
}) {
  return (
    <Card title="Date & filters" className="card-filters-inline">
      <div className="form filters-form filters-form-inline">
        {onShowRemovedChange != null && (
          <label className="filter-toggle-removed">
            <input
              type="checkbox"
              checked={showRemovedTransactions}
              onChange={(e) => onShowRemovedChange(e.target.checked)}
              aria-label="Include removed transactions in list"
            />
            <span>Show removed transactions</span>
          </label>
        )}
        <div className="row-2">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
            />
          </div>
        </div>
        <select
          value={filters.supplier_id}
          onChange={(e) => setFilters((p) => ({ ...p, supplier_id: e.target.value }))}
        >
          <option value="">All suppliers</option>
          {(suppliers || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filters.category_id}
          onChange={(e) => setFilters((p) => ({ ...p, category_id: e.target.value }))}
        >
          <option value="">All categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setFilters({ from: "", to: "", supplier_id: "", category_id: "" })}
        >
          Clear filters
        </button>
        <div className="conversion-rate">
          {bwpRateFetchFailed ? (
            <>
              <span className="rate-fetch-err" role="alert">
                Could not fetch latest rate.
              </span>
              <label className="label">
                1 USD ={" "}
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={bwpPerUsd}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v) && v > 0) {
                      setBwpPerUsd(v);
                      try {
                        localStorage.setItem("tm_bwp_per_usd", String(v));
                      } catch (_) {}
                    }
                  }}
                  className="input input-rate"
                />{" "}
                BWP (edit if needed)
              </label>
            </>
          ) : (
            <span className="label">
              1 USD = <strong>{Number(bwpPerUsd).toFixed(2)}</strong> BWP
              <span className="rate-date">
                {" "}
                (rate as of {formatRateDate(bwpRateDate || new Date().toISOString().slice(0, 10))})
              </span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
