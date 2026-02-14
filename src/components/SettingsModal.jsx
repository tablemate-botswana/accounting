import React from "react";
import { Modal } from "./Modal";

export function SettingsModal({ open, passwordForm, setPasswordForm, passwordMsg, onClose, onSubmit }) {
  if (!open) return null;
  return (
    <Modal title="Settings" onClose={onClose} ariaLabel="Settings">
      <form onSubmit={onSubmit} className="form" style={{ maxWidth: 320 }}>
        <label className="label">Change your password</label>
        <input
          type="password"
          placeholder="Current password"
          value={passwordForm.current}
          onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
          className="input"
          autoComplete="current-password"
        />
        <input
          type="password"
          placeholder="New password (min 6 characters)"
          value={passwordForm.new}
          onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
          className="input"
          autoComplete="new-password"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={passwordForm.confirm}
          onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
          className="input"
          autoComplete="new-password"
        />
        <button type="submit" className="btn btn-primary">
          Update password
        </button>
        {passwordMsg && (
          <p className={passwordMsg.startsWith("Password updated") ? "msg small" : "msg err"}>
            {passwordMsg}
          </p>
        )}
      </form>
    </Modal>
  );
}
