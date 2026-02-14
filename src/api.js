const API_BASE = "/api"; // adjust if needed

export function getToken() {
  return localStorage.getItem("token") || "";
}
export function setToken(t) {
  localStorage.setItem("token", t);
}
export function clearToken() {
  localStorage.removeItem("token");
}

/** Get token from login API response (handles token, access_token, data.token, etc.). */
export function getTokenFromLoginResponse(data) {
  if (!data) return "";
  const t = data.token ?? data.access_token ?? data.auth_token ?? data.jwt;
  if (t) return typeof t === "string" ? t : "";
  if (data.data && typeof data.data === "object") {
    const d = data.data;
    return d.token ?? d.access_token ?? d.auth_token ?? "";
  }
  return "";
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  // Backend must accept: Authorization: Bearer <token>
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  login: (email, password) => request("/auth.php", { method: "POST", body: { email, password } }),
  me: () => request("/auth.php?me=1"),
  changePassword: (currentPassword, newPassword) =>
    request("/auth.php", { method: "POST", body: { action: "change_password", current_password: currentPassword, new_password: newPassword } }),
  setUserPassword: (userId, newPassword) =>
    request("/auth.php", { method: "POST", body: { action: "set_password", user_id: userId, new_password: newPassword } }),

  listSuppliers: () => request("/suppliers.php"),
  addSupplier: (name) => request("/suppliers.php", { method: "POST", body: { name } }),

  listCategories: () => request("/categories.php"),
  addCategory: (name) => request("/categories.php", { method: "POST", body: { name } }),

  addExpense: (expense) => request("/expenses.php", { method: "POST", body: expense }),
  updateExpense: (id, data) => request("/expenses.php", { method: "PATCH", body: { id, ...data } }),
  deleteExpense: (id) => request(`/expenses.php?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  listExpenses: (qs) => request(`/expenses.php?mode=list${qs}`),

  summaryTotal: (qs) => request(`/expenses.php?mode=summary${qs}`),
  byUser: (qs) => request(`/expenses.php?mode=by_user${qs}`),
  bySupplier: (qs) => request(`/expenses.php?mode=by_supplier${qs}`),
  byCategory: (qs) => request(`/expenses.php?mode=by_category${qs}`),

  listExpenseAudit: () => request("/expenses.php?mode=audit"),
  listUsers: () => request("/users.php"),
  createUser: (data) => request("/users.php", { method: "POST", body: data }),
  updateUser: (data) => request("/users.php", { method: "PATCH", body: data }),

  /** Upload a receipt/invoice file. Returns { url }. Use FormData so do not use request(). */
  async uploadReceipt(file) {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/upload.php`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Upload failed: ${res.status}`);
    return data;
  },

  /** Delete an uploaded receipt file (only for URLs like /api/receipt.php?f=...). Auth required. */
  async deleteReceipt(receiptUrl) {
    if (!receiptUrl || typeof receiptUrl !== "string" || !receiptUrl.includes("receipt.php")) return;
    const q = receiptUrl.indexOf("?") >= 0 ? "?" + receiptUrl.slice(receiptUrl.indexOf("?") + 1) : "";
    await request(`/receipt.php${q}`, { method: "DELETE" });
  },
};

/** Fetch current BWP per 1 USD from Frankfurter (free, no key). Returns { rate, date } or null on failure. */
export async function fetchBwpPerUsd() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=BWP", { method: "GET" });
    const data = await res.json().catch(() => ({}));
    const rate = data?.rates?.BWP;
    const n = typeof rate === "number" ? rate : parseFloat(rate);
    const date = data?.date || null;
    if (Number.isFinite(n) && n > 0) return { rate: n, date: typeof date === "string" ? date : null };
  } catch (_) {}
  return null;
}

/** Normalize users list from API (handles items, users, array, or single user object). */
export function normalizeUserList(data) {
  let raw = data?.items ?? data?.users ?? (Array.isArray(data) ? data : null);
  // If API returns only the logged-in user as { user: { uid, name, ... } }, treat as one-item list
  if (raw == null && data?.user && typeof data.user === "object") {
    raw = [data.user];
  }
  raw = Array.isArray(raw) ? raw : [];
  return raw.map((u) => ({
    id: u?.id ?? u?.uid ?? u?.user_id,
    name: u?.name ?? u?.email ?? `User ${u?.id ?? u?.uid ?? "?"}`,
  })).filter((u) => u.id != null && u.id !== "");
}
