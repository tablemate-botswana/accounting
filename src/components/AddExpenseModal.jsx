import React from "react";
import { Modal } from "./Modal";

export function AddExpenseModal({
  open,
  onClose,
  form,
  setForm,
  activeTab,
  users,
  addExpenseForUserId,
  setAddExpenseForUserId,
  suppliers,
  categories,
  addExpenseReceiptUploading,
  err,
  onSubmit,
  onReceiptFileChange,
  onOpenSupplierModal,
  onOpenCategoryModal,
}) {
  if (!open) return null;

  return (
    <Modal title="Add expense" onClose={onClose} className="modal-box-expense" front={false} ariaLabel="Add expense">
      <form onSubmit={onSubmit} className="form form-expense">
            {activeTab === "all" ? (
              <div className="form-row-add-for">
                <label className="label">Add expense for</label>
                <select
                  value={addExpenseForUserId}
                  onChange={(e) => setAddExpenseForUserId(e.target.value)}
                  required
                  className="select-add-for"
                >
                  <option value="">Select team member</option>
                  {(users || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-row-add-for form-row-add-for-readonly">
                <span className="label">Adding for</span>
                <strong>{users?.find((u) => String(u.id) === String(activeTab))?.name ?? "—"}</strong>
              </div>
            )}
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
              required
            />
            <input
              placeholder="Amount *"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              required
            />
            <select
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            >
              <option value="USD">USD ($)</option>
              <option value="BWP">BWP (P)</option>
            </select>
            <div>
              <select
                value={form.supplier_id}
                onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value }))}
              >
                <option value="">Supplier (optional)</option>
                {(suppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-icon btn-below-select"
                onClick={onOpenSupplierModal}
                title="Add supplier"
              >
                +
              </button>
            </div>
            <div>
              <select
                value={form.category_id}
                onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
              >
                <option value="">Category (optional)</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-icon btn-below-select"
                onClick={onOpenCategoryModal}
                title="Add category"
              >
                +
              </button>
            </div>
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <input
              placeholder="Payment method (optional)"
              value={form.payment_method}
              onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
            />
            <input
              placeholder="Link (URL) or upload file below"
              value={
                typeof form.receipt_url === "string" && !form.receipt_url.startsWith("data:")
                  ? form.receipt_url
                  : ""
              }
              onChange={(e) => setForm((p) => ({ ...p, receipt_url: e.target.value }))}
            />
            <label className="label">Or choose file from PC</label>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
              onChange={onReceiptFileChange}
              className="input"
              disabled={addExpenseReceiptUploading}
            />
            {addExpenseReceiptUploading && <p className="msg small">Uploading…</p>}
            {form.receipt_url && form.receipt_url.startsWith("data:") && (
              <p className="msg small">File attached.</p>
            )}
            {err && <div className="msg err">{err}</div>}
            <button type="submit" className="btn btn-primary">
              Add expense
            </button>
          </form>
    </Modal>
  );
}
