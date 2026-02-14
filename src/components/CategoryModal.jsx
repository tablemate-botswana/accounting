import React from "react";
import { Modal } from "./Modal";

export function CategoryModal({ open, name, setName, categories, onClose, onSubmit }) {
  if (!open) return null;
  return (
    <Modal title="Add category" onClose={onClose} ariaLabel="Add category">
      <form onSubmit={onSubmit} className="manage-meta-form">
        <label className="label">Category name</label>
        <div className="manage-meta-row">
          <input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn">
            Add
          </button>
        </div>
        {(categories || []).length > 0 && (
          <p className="hint">Current: {(categories || []).map((c) => c.name).join(", ")}</p>
        )}
      </form>
    </Modal>
  );
}
