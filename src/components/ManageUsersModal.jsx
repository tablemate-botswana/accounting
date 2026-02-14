import React from "react";
import { Modal } from "./Modal";

export function ManageUsersModal({
  open,
  onClose,
  adminNewUser,
  setAdminNewUser,
  adminUsers,
  adminEditingId,
  setAdminEditingId,
  adminSetPasswordId,
  setAdminSetPasswordId,
  adminSetPasswordValue,
  setAdminSetPasswordValue,
  onCreateUser,
  onUpdateUser,
  onSetPassword,
}) {
  if (!open) return null;
  return (
    <Modal title="Manage users" onClose={onClose} className="modal-box-wide" bodyClassName="modal-body-scroll" ariaLabel="Manage users">
        <form onSubmit={onCreateUser} className="form manage-user-form">
          <h4 className="card-subtitle">Add user</h4>
          <input
            type="email"
            placeholder="Email *"
            value={adminNewUser.email}
            onChange={(e) => setAdminNewUser((p) => ({ ...p, email: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Name (optional)"
            value={adminNewUser.name}
            onChange={(e) => setAdminNewUser((p) => ({ ...p, name: e.target.value }))}
            className="input"
          />
          <input
            type="password"
            placeholder="Password * (min 6 characters)"
            value={adminNewUser.password}
            onChange={(e) => setAdminNewUser((p) => ({ ...p, password: e.target.value }))}
            className="input"
          />
          <select
            value={adminNewUser.role}
            onChange={(e) => setAdminNewUser((p) => ({ ...p, role: e.target.value }))}
            className="input"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Create user
          </button>
        </form>
        <h4 className="card-subtitle">All users</h4>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th className="th-action">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    {adminEditingId === u.id ? (
                      <input
                        type="email"
                        className="input input-inline"
                        defaultValue={u.email}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== (u.email || "")) onUpdateUser(u.id, { email: v });
                        }}
                      />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td>
                    {adminEditingId === u.id ? (
                      <input
                        className="input input-inline"
                        defaultValue={u.name}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (u.name || "")) onUpdateUser(u.id, { name: v });
                        }}
                      />
                    ) : (
                      u.name ?? "—"
                    )}
                  </td>
                  <td>
                    {adminEditingId === u.id ? (
                      <select
                        className="input input-inline"
                        defaultValue={u.role}
                        onChange={(e) => onUpdateUser(u.id, { role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      u.role ?? "user"
                    )}
                  </td>
                  <td className="td-action">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setAdminEditingId(adminEditingId === u.id ? null : u.id);
                        setAdminSetPasswordId(null);
                      }}
                    >
                      {adminEditingId === u.id ? "Done" : "Edit"}
                    </button>
                    {adminSetPasswordId === u.id ? (
                      <span className="set-password-inline">
                        <input
                          type="password"
                          placeholder="New password"
                          value={adminSetPasswordValue}
                          onChange={(e) => setAdminSetPasswordValue(e.target.value)}
                          className="input input-inline"
                          style={{ width: 120 }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => onSetPassword(u.id)}
                        >
                          Set
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setAdminSetPasswordId(null);
                            setAdminSetPasswordValue("");
                          }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          setAdminSetPasswordId(u.id);
                          setAdminEditingId(null);
                        }}
                      >
                        Set password
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </Modal>
  );
}
