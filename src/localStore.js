/**
 * Local storage layer so the app works without a backend.
 * Keys: tm_users, tm_suppliers, tm_categories, tm_expenses
 */

const KEYS = {
  users: "tm_users",
  suppliers: "tm_suppliers",
  categories: "tm_categories",
  expenses: "tm_expenses",
};

function load(key, defaultVal = []) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultVal;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : defaultVal;
  } catch {
    return defaultVal;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Seed defaults if empty
function ensureDefaults() {
  if (load(KEYS.users).length === 0) {
    save(KEYS.users, [
      { id: 1, name: "Team Member 1" },
      { id: 2, name: "Team Member 2" },
    ]);
  }
  if (load(KEYS.categories).length === 0) {
    save(KEYS.categories, [
      { id: 1, name: "Travel" },
      { id: 2, name: "Meals" },
      { id: 3, name: "Software" },
      { id: 4, name: "Office" },
      { id: 5, name: "Other" },
    ]);
  }
  if (load(KEYS.suppliers).length === 0) {
    save(KEYS.suppliers, []);
  }
}

function nextId(arr) {
  if (arr.length === 0) return 1;
  return Math.max(...arr.map((x) => Number(x.id) || 0), 0) + 1;
}

export const localStore = {
  getUsers() {
    ensureDefaults();
    return load(KEYS.users);
  },

  addUser(name) {
    const users = load(KEYS.users);
    const id = nextId(users);
    users.push({ id, name: String(name).trim() || `User ${id}` });
    save(KEYS.users, users);
    return { id, name: users[users.length - 1].name };
  },

  getSuppliers() {
    ensureDefaults();
    return load(KEYS.suppliers);
  },

  addSupplier(name) {
    const suppliers = load(KEYS.suppliers);
    const id = nextId(suppliers);
    suppliers.push({ id, name: String(name).trim() || `Supplier ${id}` });
    save(KEYS.suppliers, suppliers);
    return { id, name: suppliers[suppliers.length - 1].name };
  },

  getCategories() {
    ensureDefaults();
    return load(KEYS.categories);
  },

  addCategory(name) {
    const categories = load(KEYS.categories);
    const id = nextId(categories);
    categories.push({ id, name: String(name).trim() || `Category ${id}` });
    save(KEYS.categories, categories);
    return { id, name: categories[categories.length - 1].name };
  },

  getExpenses() {
    return load(KEYS.expenses);
  },

  addExpense(expense) {
    const expenses = load(KEYS.expenses);
    const users = load(KEYS.users);
    const suppliers = load(KEYS.suppliers);
    const categories = load(KEYS.categories);
    const id = nextId(expenses);
    const user = users.find((u) => String(u.id) === String(expense.user_id));
    const supplier = expense.supplier_id
      ? suppliers.find((s) => String(s.id) === String(expense.supplier_id))
      : null;
    const category = expense.category_id
      ? categories.find((c) => String(c.id) === String(expense.category_id))
      : null;
    const row = {
      id,
      expense_date: expense.expense_date,
      amount: Number(expense.amount) || 0,
      currency: expense.currency || "USD",
      user_id: expense.user_id != null ? Number(expense.user_id) : null,
      user_name: user ? user.name : null,
      supplier_id: expense.supplier_id || null,
      supplier_name: supplier ? supplier.name : null,
      category_id: expense.category_id || null,
      category_name: category ? category.name : null,
      description: expense.description || "",
      payment_method: expense.payment_method || "",
      receipt_url: expense.receipt_url || "",
    };
    expenses.push(row);
    save(KEYS.expenses, expenses);
    return row;
  },

  deleteExpense(id) {
    const expenses = load(KEYS.expenses).filter((e) => String(e.id) !== String(id));
    save(KEYS.expenses, expenses);
  },

  updateExpense(id, updates) {
    const expenses = load(KEYS.expenses);
    const i = expenses.findIndex((e) => String(e.id) === String(id));
    if (i < 0) return null;
    if (updates.receipt_url !== undefined) expenses[i].receipt_url = updates.receipt_url || "";
    save(KEYS.expenses, expenses);
    return expenses[i];
  },

  // Filter expenses by query (from, to, user_id, supplier_id, category_id)
  queryExpenses(params = {}) {
    let list = load(KEYS.expenses);
    if (params.from) {
      list = list.filter((e) => e.expense_date >= params.from);
    }
    if (params.to) {
      list = list.filter((e) => e.expense_date <= params.to);
    }
    if (params.user_id != null && params.user_id !== "") {
      list = list.filter((e) => String(e.user_id) === String(params.user_id));
    }
    if (params.supplier_id != null && params.supplier_id !== "") {
      list = list.filter((e) => String(e.supplier_id) === String(params.supplier_id));
    }
    if (params.category_id != null && params.category_id !== "") {
      list = list.filter((e) => String(e.category_id) === String(params.category_id));
    }
    return list;
  },

  summaryTotal(params = {}) {
    const list = localStore.queryExpenses(params);
    const total = list.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { total };
  },

  byUser(params = {}) {
    const list = localStore.queryExpenses(params);
    const users = load(KEYS.users);
    const map = new Map();
    users.forEach((u) => map.set(String(u.id), { id: u.id, name: u.name, total: 0 }));
    list.forEach((e) => {
      const k = e.user_id != null ? String(e.user_id) : "unknown";
      if (!map.has(k)) map.set(k, { id: e.user_id, name: e.user_name || "Unknown", total: 0 });
      map.get(k).total += Number(e.amount || 0);
    });
    return Array.from(map.values()).filter((r) => r.total > 0 || list.length === 0);
  },

  bySupplier(params = {}) {
    const list = localStore.queryExpenses(params);
    const map = new Map();
    list.forEach((e) => {
      const name = e.supplier_name || "Uncategorized";
      if (!map.has(name)) map.set(name, { supplier: name, total: 0 });
      map.get(name).total += Number(e.amount || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  },

  byCategory(params = {}) {
    const list = localStore.queryExpenses(params);
    const map = new Map();
    list.forEach((e) => {
      const name = e.category_name || "Uncategorized";
      if (!map.has(name)) map.set(name, { category: name, total: 0 });
      map.get(name).total += Number(e.amount || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  },
};
