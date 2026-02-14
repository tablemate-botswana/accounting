import React from "react";
import { Modal } from "./Modal";

export function SupplierModal({ open, name, setName, suppliers, onClose, onSubmit }) {
  if (!open) return null;
  return (
    <Modal title="Add supplier" onClose={onClose} ariaLabel="Add supplier">
      <form onSubmit={onSubmit} className="manage-meta-form">
        <label className="label">Supplier name</label>
        <div className="manage-meta-row">
          <input
            placeholder="Supplier name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn">
            Add
          </button>
        </div>
        {(suppliers || []).length > 0 && (
          <p className="hint">Current: {(suppliers || []).map((s) => s.name).join(", ")}</p>
        )}
      </form>
    </Modal>
  );
}
