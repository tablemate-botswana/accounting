import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { api, clearToken, fetchBwpPerUsd, getToken, getTokenFromLoginResponse, normalizeUserList, setToken } from "./api";
import { localStore } from "./localStore";
import { formatAmount, parseExpenseCsv, qsFrom, toUsd } from "./utils";
import {
  Card,
  Tabs,
  LoginScreen,
  ExpenseFilters,
  SummaryCard,
  TotalSpendCard,
  ExpensesTable,
  AttachInvoiceModal,
  ViewInvoicesModal,
  SupplierModal,
  CategoryModal,
  AddExpenseModal,
  AuditLogCard,
  BulkCsvCard,
  SettingsModal,
  ManageUsersModal,
} from "./components";
import "./App.css";

applyPlugin(jsPDF);

export default function App() {
  const [mode, setMode] = useState("api"); // "api" | "local"
  const [authUser, setAuthUser] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [addExpenseForUserId, setAddExpenseForUserId] = useState(""); // when "All team" tab: which member to add for
  const [newMemberName, setNewMemberName] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const fileInputRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminNewUser, setAdminNewUser] = useState({ email: "", name: "", password: "", role: "user" });
  const [adminEditingId, setAdminEditingId] = useState(null);
  const [adminSetPasswordId, setAdminSetPasswordId] = useState(null);
  const [adminSetPasswordValue, setAdminSetPasswordValue] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);
  const [attachInvoiceExpenseId, setAttachInvoiceExpenseId] = useState(null);
  const [attachInvoiceUrl, setAttachInvoiceUrl] = useState("");
  const [attachUploading, setAttachUploading] = useState(false);
  const [viewInvoicesExpense, setViewInvoicesExpense] = useState(null);
  const [addExpenseReceiptUploading, setAddExpenseReceiptUploading] = useState(false);
  const attachFileInputRef = useRef(null);

  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [showRemovedTransactions, setShowRemovedTransactions] = useState(true);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    supplier_id: "",
    category_id: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    expense_date: "",
    amount: "",
    currency: "USD",
    supplier_id: "",
    category_id: "",
    description: "",
    payment_method: "",
    receipt_url: "",
  });
  const [expenses, setExpenses] = useState([]);
  const [expenseSortBy, setExpenseSortBy] = useState("expense_date");
  const [expenseSortDir, setExpenseSortDir] = useState("desc");
  const [total, setTotal] = useState(0);
  const [byUser, setByUser] = useState([]);
  const [bySupplier, setBySupplier] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [summarySortByUser, setSummarySortByUser] = useState("spend");
  const [summarySortBySupplier, setSummarySortBySupplier] = useState("spend");
  const [summarySortByCategory, setSummarySortByCategory] = useState("spend");
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkErr, setBulkErr] = useState("");
  const [debugUsers, setDebugUsers] = useState({ request: null, response: null, error: null });
  const [showDebug, setShowDebug] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [bwpPerUsd, setBwpPerUsd] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem("tm_bwp_per_usd") || "13.5");
      return Number.isFinite(v) && v > 0 ? v : 13.5;
    } catch {
      return 13.5;
    }
  });
  const [bwpRateDate, setBwpRateDate] = useState(() => localStorage.getItem("tm_bwp_per_usd_date") || "");
  const [bwpRateFetchFailed, setBwpRateFetchFailed] = useState(false);

  // Fetch latest BWP/USD rate on every load
  useEffect(() => {
    let cancelled = false;
    setBwpRateFetchFailed(false);
    fetchBwpPerUsd().then((result) => {
      if (cancelled) return;
      if (result == null) {
        setBwpRateFetchFailed(true);
        return;
      }
      const date = result.date || new Date().toISOString().slice(0, 10);
      setBwpPerUsd(result.rate);
      setBwpRateDate(date);
      try {
        localStorage.setItem("tm_bwp_per_usd", String(result.rate));
        localStorage.setItem("tm_bwp_per_usd_date", date);
      } catch (_) {}
    });
    return () => { cancelled = true; };
  }, []);

  const effectiveFilters = useMemo(() => {
    const derivedUserId = activeTab === "all" ? "" : String(activeTab);
    return { ...filters, user_id: derivedUserId };
  }, [filters, activeTab]);

  // Who new expenses are attributed to: selected tab if it's a member, else dropdown value (when "All team")
  const effectiveExpenseUserId = useMemo(() => {
    if (activeTab !== "all") return String(activeTab);
    return addExpenseForUserId || (users?.[0]?.id != null ? String(users[0].id) : "");
  }, [activeTab, addExpenseForUserId, users]);

  const qstr = useMemo(() => qsFrom(effectiveFilters), [effectiveFilters]);

  const activeExpenses = useMemo(() => (expenses || []).filter((e) => !e.removed_at), [expenses]);

  const currencyTotals = useMemo(() => {
    const list = activeExpenses;
    let totalUSD = 0;
    let totalBWP = 0;
    list.forEach((e) => {
      const amt = Number(e.amount ?? 0);
      const cur = (e.currency || "USD").toUpperCase();
      if (cur === "BWP") totalBWP += amt;
      else totalUSD += amt;
    });
    const totalInUsdEquiv = totalUSD + totalBWP / (bwpPerUsd || 13.5);
    return { totalUSD, totalBWP, totalInUsdEquiv };
  }, [activeExpenses, bwpPerUsd]);

  const byUserWithCurrency = useMemo(() => {
    const list = activeExpenses;
    const map = new Map();
    list.forEach((e) => {
      const key = String(e.user_id ?? e.user_name ?? "?");
      if (!map.has(key)) map.set(key, { id: e.user_id, name: e.user_name ?? "—", USD: 0, BWP: 0 });
      const cur = (e.currency || "USD").toUpperCase();
      const amt = Number(e.amount ?? 0);
      if (cur === "BWP") map.get(key).BWP += amt;
      else map.get(key).USD += amt;
    });
    return Array.from(map.values()).map((r) => ({
      ...r,
      totalInUsdEquiv: r.USD + r.BWP / (bwpPerUsd || 13.5),
    }));
  }, [activeExpenses, bwpPerUsd]);

  const bySupplierWithCurrency = useMemo(() => {
    const list = activeExpenses;
    const map = new Map();
    list.forEach((e) => {
      const name = e.supplier_name || "(No supplier)";
      if (!map.has(name)) map.set(name, { supplier: name, USD: 0, BWP: 0 });
      const cur = (e.currency || "USD").toUpperCase();
      const amt = Number(e.amount ?? 0);
      if (cur === "BWP") map.get(name).BWP += amt;
      else map.get(name).USD += amt;
    });
    return Array.from(map.values()).map((r) => ({
      ...r,
      totalInUsdEquiv: r.USD + r.BWP / (bwpPerUsd || 13.5),
    }));
  }, [activeExpenses, bwpPerUsd]);

  const byCategoryWithCurrency = useMemo(() => {
    const list = activeExpenses;
    const map = new Map();
    list.forEach((e) => {
      const name = e.category_name || "(No category)";
      if (!map.has(name)) map.set(name, { category: name, USD: 0, BWP: 0 });
      const cur = (e.currency || "USD").toUpperCase();
      const amt = Number(e.amount ?? 0);
      if (cur === "BWP") map.get(name).BWP += amt;
      else map.get(name).USD += amt;
    });
    return Array.from(map.values()).map((r) => ({
      ...r,
      totalInUsdEquiv: r.USD + r.BWP / (bwpPerUsd || 13.5),
    }));
  }, [activeExpenses, bwpPerUsd]);

  const sortedByUser = useMemo(() => {
    const list = byUserWithCurrency.length ? byUserWithCurrency : byUser || [];
    const key = (r) => (r.name ?? "").toLowerCase();
    const amount = (r) => r.totalInUsdEquiv ?? Number(r.total) ?? 0;
    return [...list].sort((a, b) =>
      summarySortByUser === "alpha" ? key(a).localeCompare(key(b)) : amount(b) - amount(a)
    );
  }, [byUserWithCurrency, byUser, summarySortByUser]);

  const sortedBySupplier = useMemo(() => {
    const list = bySupplierWithCurrency.length ? bySupplierWithCurrency : bySupplier || [];
    const key = (r) => (r.supplier ?? r.supplier_name ?? "").toLowerCase();
    const amount = (r) => r.totalInUsdEquiv ?? Number(r.total) ?? 0;
    return [...list].sort((a, b) =>
      summarySortBySupplier === "alpha" ? key(a).localeCompare(key(b)) : amount(b) - amount(a)
    );
  }, [bySupplierWithCurrency, bySupplier, summarySortBySupplier]);

  const sortedByCategory = useMemo(() => {
    const list = byCategoryWithCurrency.length ? byCategoryWithCurrency : byCategory || [];
    const key = (r) => (r.category ?? r.category_name ?? "").toLowerCase();
    const amount = (r) => r.totalInUsdEquiv ?? Number(r.total) ?? 0;
    return [...list].sort((a, b) =>
      summarySortByCategory === "alpha" ? key(a).localeCompare(key(b)) : amount(b) - amount(a)
    );
  }, [byCategoryWithCurrency, byCategory, summarySortByCategory]);

  const sortedExpenses = useMemo(() => {
    const list = [...(expenses || [])];
    if (list.length === 0) return list;
    const getPaidFor = (e) => e.user_name ?? (users?.find((u) => String(u.id) === String(e.user_id))?.name) ?? "";
    const getVal = (e) => {
      switch (expenseSortBy) {
        case "expense_date": return e.expense_date ?? "";
        case "added_by_name": return (e.added_by_name ?? "").toLowerCase();
        case "user_name": return (getPaidFor(e) ?? "").toLowerCase();
        case "removed_by_name": return (e.removed_at ? (e.removed_by_name ?? "") : "").toLowerCase();
        case "supplier_name": return (e.supplier_name ?? "").toLowerCase();
        case "category_name": return (e.category_name ?? "").toLowerCase();
        case "description": return (e.description ?? "").toLowerCase();
        case "amount": return Number(e.amount) || 0;
        case "currency": return (e.currency || "USD").toUpperCase();
        default: return "";
      }
    };
    const isNum = expenseSortBy === "amount";
    list.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      let c = 0;
      if (isNum) c = va - vb;
      else c = String(va).localeCompare(String(vb), undefined, { sensitivity: "base" });
      return expenseSortDir === "asc" ? c : -c;
    });
    return list;
  }, [expenses, expenseSortBy, expenseSortDir, users]);

  const displayExpenses = useMemo(
    () =>
      showRemovedTransactions ? sortedExpenses : sortedExpenses.filter((e) => !e.removed_at),
    [sortedExpenses, showRemovedTransactions]
  );

  const getPaidFor = useCallback((e) => e.user_name ?? (users?.find((u) => String(u.id) === String(e.user_id))?.name) ?? "—", [users]);

  const getReceiptUrls = useCallback((e) => {
    if (!e) return [];
    const r = e.receipt_url;
    if (Array.isArray(r)) return r.filter((u) => u && String(u).trim());
    if (r && String(r).trim()) return [String(r).trim()];
    return [];
  }, []);

  const exportToCsv = useCallback(() => {
    const escape = (v) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return /[",\r\n]/.test(s) ? `"${s}"` : s;
    };
    const headers = ["Date", "Description", "Amount", "Currency", "Supplier", "Category", "Added by", "Paid for", "Removed by", "Receipt URL"];
    const rows = displayExpenses.map((e) => {
      const amount = Number(e.amount) || 0;
      const exportAmount = e.removed_at ? -amount : amount;
      return [
        e.expense_date ?? "",
        e.description ?? "",
        exportAmount,
        (e.currency || "USD").toUpperCase(),
        e.supplier_name ?? "",
        e.category_name ?? "",
        e.added_by_name ?? "",
        getPaidFor(e),
        e.removed_at ? (e.removed_by_name ?? "") : "",
        getReceiptUrls(e).join("; "),
      ];
    });
    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayExpenses, getPaidFor]);

  const exportToPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape" });
    const headers = [["Date", "Description", "Amount", "Curr", "Supplier", "Category", "Added by", "Paid for", "Removed by", "Receipt"]];
    const body = displayExpenses.map((e) => {
      const amount = Number(e.amount) || 0;
      const exportAmount = e.removed_at ? -amount : amount;
      return [
        e.expense_date ?? "—",
        (e.description ?? "—").slice(0, 40),
        formatAmount(exportAmount, e.currency),
        (e.currency || "USD").toUpperCase(),
        e.supplier_name ?? "—",
        e.category_name ?? "—",
        e.added_by_name ?? "—",
        getPaidFor(e),
        e.removed_at ? (e.removed_by_name ?? "—") : "—",
        getReceiptUrls(e).length ? (getReceiptUrls(e).length > 1 ? "Links" : "Link") : "—",
      ];
    });
    doc.autoTable({
      head: headers,
      body,
      styles: { fontSize: 8 },
      margin: { top: 10 },
    });
    doc.save(`expenses-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [displayExpenses, getPaidFor]);

  const refreshLocal = useCallback(() => {
    setSuppliers(localStore.getSuppliers());
    setCategories(localStore.getCategories());
    setUsers(localStore.getUsers());
    const list = localStore.queryExpenses(effectiveFilters);
    setExpenses(list);
    setTotal(localStore.summaryTotal(effectiveFilters).total);
    setByUser(localStore.byUser(effectiveFilters));
    setBySupplier(localStore.bySupplier(effectiveFilters));
    setByCategory(localStore.byCategory(effectiveFilters));
    if (!addExpenseForUserId && localStore.getUsers().length > 0) {
      setAddExpenseForUserId(String(localStore.getUsers()[0].id));
    }
  }, [effectiveFilters, addExpenseForUserId]);

  async function refreshMeta() {
    if (mode !== "api") return;
    try {
      const [s, c] = await Promise.all([api.listSuppliers(), api.listCategories()]);
      setSuppliers(Array.isArray(s?.items) ? s.items : []);
      setCategories(Array.isArray(c?.items) ? c.items : []);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function bootstrap() {
    setErr("");
    setDebugUsers({ request: null, response: null, error: null });
    try {
      const me = await api.me();
      setAuthUser({ id: me.user.uid ?? me.user.id, name: me.user.name, role: me.user.role });
      const [s, c, u] = await Promise.all([
        api.listSuppliers().catch((e) => { throw new Error("Suppliers: " + e.message); }),
        api.listCategories().catch((e) => { throw new Error("Categories: " + e.message); }),
        api.listUsers()
          .then((raw) => {
            setDebugUsers({
              request: { url: "/api/users.php", method: "GET", tokenPresent: !!getToken(), token: getToken() },
              response: raw,
              error: null,
            });
            return raw;
          })
          .catch((e) => {
            setDebugUsers((prev) => ({
              ...prev,
              request: { url: "/api/users.php", method: "GET", tokenPresent: !!getToken(), token: getToken() },
              response: null,
              error: e?.message ?? String(e),
            }));
            throw new Error("Users: " + e.message);
          }),
      ]);
      setSuppliers(Array.isArray(s?.items) ? s.items : []);
      setCategories(Array.isArray(c?.items) ? c.items : []);
      setUsers(normalizeUserList(u));
    } catch (e) {
      setAuthUser(null);
    }
  }

  async function refreshAll() {
    setErr("");
    if (mode === "local") {
      refreshLocal();
      return;
    }
    try {
      const [list, sum, u, s, c, audit] = await Promise.all([
        api.listExpenses(qstr),
        api.summaryTotal(qstr),
        api.byUser(qstr),
        api.bySupplier(qstr),
        api.byCategory(qstr),
        api.listExpenseAudit().catch(() => ({ items: [] })),
      ]);
      setTotal(Number(sum?.total ?? 0));
      setExpenses(Array.isArray(list?.items) ? list.items : []);
      setByUser(Array.isArray(u?.items) ? u.items : []);
      setBySupplier(Array.isArray(s?.items) ? s.items : []);
      setByCategory(Array.isArray(c?.items) ? c.items : []);
      setAuditLog(Array.isArray(audit?.items) ? audit.items : []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    if (getToken()) bootstrap();
  }, []);

  useEffect(() => {
    if (mode === "local") {
      refreshLocal();
      return;
    }
    if (authUser) refreshAll().catch((e) => setErr(e.message));
  }, [authUser, qstr, mode, refreshLocal]);

  useEffect(() => {
    if (mode === "api" && authUser?.role === "admin") {
      api.listUsers()
        .then((data) => setAdminUsers(Array.isArray(data?.items) ? data.items : []))
        .catch(() => setAdminUsers([]));
    } else {
      setAdminUsers([]);
    }
  }, [mode, authUser?.role]);

  useEffect(() => {
    if (showManageUsersModal && authUser?.role === "admin") {
      api.listUsers()
        .then((data) => setAdminUsers(Array.isArray(data?.items) ? data.items : []))
        .catch(() => {});
    }
  }, [showManageUsersModal]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg("");
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg("New passwords do not match.");
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMsg("New password must be at least 6 characters.");
      return;
    }
    try {
      await api.changePassword(passwordForm.current, passwordForm.new);
      setPasswordMsg("Password updated.");
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPasswordMsg(err?.message || "Failed to change password.");
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setErr("");
    if (!adminNewUser.email || adminNewUser.password.length < 6) {
      setErr("Email and password (min 6 characters) required.");
      return;
    }
    try {
      await api.createUser({
        email: adminNewUser.email,
        name: adminNewUser.name || adminNewUser.email,
        password: adminNewUser.password,
        role: adminNewUser.role,
      });
      setAdminNewUser({ email: "", name: "", password: "", role: "user" });
      const data = await api.listUsers();
      setAdminUsers(Array.isArray(data?.items) ? data.items : []);
      setUsers(normalizeUserList(data));
    } catch (err) {
      setErr(err?.message || "Failed to create user.");
    }
  }

  async function handleUpdateUser(id, updates) {
    setErr("");
    try {
      await api.updateUser({ id, ...updates });
      setAdminEditingId(null);
      const data = await api.listUsers();
      setAdminUsers(Array.isArray(data?.items) ? data.items : []);
      setUsers(normalizeUserList(data));
    } catch (err) {
      setErr(err?.message || "Failed to update user.");
    }
  }

  async function handleSetUserPassword(userId) {
    if (!adminSetPasswordValue || adminSetPasswordValue.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setErr("");
    try {
      await api.setUserPassword(userId, adminSetPasswordValue);
      setAdminSetPasswordId(null);
      setAdminSetPasswordValue("");
    } catch (err) {
      setErr(err?.message || "Failed to set password.");
    }
  }

  const tabs = useMemo(() => {
    const base = [{ id: "all", label: "All team" }];
    const people = (users || []).map((u) => ({ id: String(u.id), label: u.name || `User ${u.id}` }));
    return base.concat(people);
  }, [users]);

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) setActiveTab("all");
  }, [tabs, activeTab]);

  // When switching to a member tab, keep "add expense for" in sync for when user switches back to "All team"
  useEffect(() => {
    if (activeTab !== "all" && activeTab) setAddExpenseForUserId(String(activeTab));
  }, [activeTab]);

  async function doLogin(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.login(login.email, login.password);
      const token = getTokenFromLoginResponse(res);
      if (!token) throw new Error("Login succeeded but no token received. Check API response shape.");
      setToken(token);
      setMode("api");
      await bootstrap();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function startLocalMode() {
    setMode("local");
    setErr("");
    setAuthUser({ id: "local", name: "Local user", role: "user" });
    refreshLocal();
  }

  function logout() {
    clearToken();
    setAuthUser(null);
    if (mode === "local") setMode("api");
  }

  function addTeamMemberLocal(e) {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    localStore.addUser(newMemberName.trim());
    setNewMemberName("");
    refreshLocal();
  }

  async function addSupplier(e) {
    e.preventDefault();
    const name = newSupplierName.trim();
    if (!name) return;
    setErr("");
    if (mode === "local") {
      localStore.addSupplier(name);
      setNewSupplierName("");
      setShowSupplierModal(false);
      refreshLocal();
      return;
    }
    try {
      await api.addSupplier(name);
      setNewSupplierName("");
      setShowSupplierModal(false);
      await refreshMeta();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setErr("");
    if (mode === "local") {
      localStore.addCategory(name);
      setNewCategoryName("");
      setShowCategoryModal(false);
      refreshLocal();
      return;
    }
    try {
      await api.addCategory(name);
      setNewCategoryName("");
      setShowCategoryModal(false);
      await refreshMeta();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function canDeleteExpense() {
    return true;
  }

  async function deleteExpense(id) {
    if (!window.confirm("Remove this expense?")) return;
    setErr("");
    if (mode === "local") {
      localStore.deleteExpense(id);
      refreshLocal();
      return;
    }
    try {
      await api.deleteExpense(id);
      await refreshAll();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function handleAttachInvoice(e) {
    e.preventDefault();
    if (attachInvoiceExpenseId == null) return;
    setErr("");
    const newUrl = (attachInvoiceUrl || "").trim();
    const expense = (expenses || []).find((x) => x.id === attachInvoiceExpenseId);
    const currentUrls = getReceiptUrls(expense);
    const receiptUrl = newUrl ? [...currentUrls, newUrl] : currentUrls;
    if (mode === "local") {
      localStore.updateExpense(attachInvoiceExpenseId, { receipt_url: receiptUrl });
      refreshLocal();
      setAttachInvoiceExpenseId(null);
      setAttachInvoiceUrl("");
      return;
    }
    try {
      await api.updateExpense(attachInvoiceExpenseId, { receipt_url: receiptUrl });
      await refreshAll();
      setAttachInvoiceExpenseId(null);
      setAttachInvoiceUrl("");
    } catch (e2) {
      setErr(e2.message);
    }
  }

  const [detachingUrl, setDetachingUrl] = useState(null);
  async function handleDetachInvoice(expense, urlToRemove) {
    setErr("");
    const newUrls = getReceiptUrls(expense).filter((u) => u !== urlToRemove);
    const updateModal = () => {
      if (newUrls.length === 0) setViewInvoicesExpense(null);
      else setViewInvoicesExpense((prev) => (prev?.id === expense.id ? { ...prev, receipt_url: newUrls } : prev));
    };
    if (mode === "local") {
      localStore.updateExpense(expense.id, { receipt_url: newUrls });
      refreshLocal();
      updateModal();
      return;
    }
    setDetachingUrl(urlToRemove);
    try {
      if (urlToRemove.includes("receipt.php")) await api.deleteReceipt(urlToRemove);
      await api.updateExpense(expense.id, { receipt_url: newUrls });
      await refreshAll();
      updateModal();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setDetachingUrl(null);
    }
  }

  function fileToReceiptUrl(file, { onUrl, setUploading }) {
    if (mode === "local") {
      const reader = new FileReader();
      reader.onload = () => onUrl(reader.result);
      reader.onerror = () => setErr("Could not read file.");
      reader.readAsDataURL(file);
      return;
    }
    setUploading?.(true);
    setErr("");
    api.uploadReceipt(file)
      .then((data) => onUrl(data.url || data))
      .catch((e) => setErr(e?.message || "Upload failed"))
      .finally(() => setUploading?.(false));
  }

  function onAttachFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const max = 10 * 1024 * 1024;
    if (file.size > max) {
      setErr("File too large (max 10 MB).");
      return;
    }
    fileToReceiptUrl(file, { onUrl: setAttachInvoiceUrl, setUploading: setAttachUploading });
    e.target.value = "";
  }

  function onAddExpenseReceiptFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const max = 10 * 1024 * 1024;
    if (file.size > max) {
      setErr("File too large (max 10 MB).");
      return;
    }
    fileToReceiptUrl(file, {
      onUrl: (url) => setExpenseForm((p) => ({ ...p, receipt_url: url })),
      setUploading: setAddExpenseReceiptUploading,
    });
    e.target.value = "";
  }

  async function addExpense(e) {
    e.preventDefault();
    setErr("");
    const amt = Number(String(expenseForm.amount).replace(/[^0-9.]/g, ""));
    if (!expenseForm.expense_date) {
      setErr("Please choose a date.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Amount must be a number greater than 0.");
      return;
    }
    const amountNum = parseFloat(expenseForm.amount || "0");
    const payload = {
      expense_date: expenseForm.expense_date,
      amount: amountNum,
      currency: expenseForm.currency || "USD",
      supplier_id: expenseForm.supplier_id || null,
      category_id: expenseForm.category_id || null,
      description: expenseForm.description || null,
      payment_method: expenseForm.payment_method || null,
      receipt_url: expenseForm.receipt_url || null,
    };
    const whoId = effectiveExpenseUserId || users?.[0]?.id;
    if (mode === "local") {
      payload.user_id = whoId;
      localStore.addExpense(payload);
      setExpenseForm((x) => ({ ...x, amount: "", description: "" }));
      refreshLocal();
      setShowAddExpenseModal(false);
      return;
    }
    if (!getToken()) {
      setErr("Please log in again.");
      return;
    }
    payload.user_id = whoId;
    try {
      await api.addExpense(payload);
      setExpenseForm((x) => ({ ...x, amount: "", description: "" }));
      await refreshAll();
      setShowAddExpenseModal(false);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function handleBulkCsv(e) {
    e.preventDefault();
    setBulkErr("");
    const whoId = effectiveExpenseUserId || users?.[0]?.id;
    const rows = parseExpenseCsv(bulkCsv);
    if (rows.length === 0) {
      setBulkErr("Paste or upload a CSV with header: date, amount, category, description (optional), supplier (optional).");
      return;
    }
    let catByName = Object.fromEntries((categories || []).map((c) => [c.name.toLowerCase(), c.id]));
    let supByName = Object.fromEntries((suppliers || []).map((s) => [s.name.toLowerCase(), s.id]));
    const toAdd = [];
    for (const row of rows) {
      const date = (row.date || row.expense_date || "").trim();
      const amount = parseFloat(String(row.amount || "0").replace(/[^0-9.]/g, ""));
      if (!date || !Number.isFinite(amount) || amount <= 0) continue;
      const catName = (row.category || "").trim().toLowerCase();
      let category_id = catByName[catName];
      if (catName && category_id == null && mode === "local") {
        const added = localStore.addCategory(row.category);
        if (added) { catByName = { ...catByName, [catName]: added.id }; category_id = added.id; }
      }
      category_id = category_id ?? null;
      const supName = (row.supplier || "").trim().toLowerCase();
      let supplier_id = supByName[supName];
      if (supName && supplier_id == null && mode === "local") {
        const added = localStore.addSupplier(row.supplier);
        if (added) { supByName = { ...supByName, [supName]: added.id }; supplier_id = added.id; }
      }
      supplier_id = supplier_id ?? null;
      const currency = String(row.currency || row.curr || "USD").toUpperCase();
      toAdd.push({
        expense_date: date,
        amount,
        currency: currency === "BWP" ? "BWP" : "USD",
        ...(mode === "local" && { user_id: whoId }),
        category_id: category_id || null,
        supplier_id: supplier_id || null,
        description: (row.description || "").trim(),
      });
    }
    if (mode === "local") {
      toAdd.forEach((expense) => localStore.addExpense(expense));
      setBulkCsv("");
      refreshLocal();
      setBulkErr(toAdd.length ? `Added ${toAdd.length} expense(s).` : "No valid rows (need date and amount).");
    } else {
      try {
        const results = await Promise.allSettled(toAdd.map((exp) => api.addExpense(exp)));
        const added = results.filter((r) => r.status === "fulfilled").length;
        setBulkCsv("");
        await refreshAll();
        setBulkErr(toAdd.length ? `Added ${added} of ${toAdd.length} expense(s).` : "No valid rows.");
      } catch (e2) {
        setBulkErr(e2.message || "Import failed.");
      }
    }
  }

  function onFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBulkCsv(ev.target?.result ?? "");
      setBulkErr("");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!authUser) {
    return (
      <LoginScreen
        login={login}
        setLogin={setLogin}
        err={err}
        onSubmit={doLogin}
        onLocalMode={startLocalMode}
        showLocalOption={!import.meta.env.PROD}
      />
    );
  }

  return (
    <div className="screen screen-dashboard">
      {mode === "local" && (
        <div className="banner local-banner">
          Using local data (saved in this browser). Sign in to sync with the server.
        </div>
      )}
      <header className="header">
        <h1 className="app-title">Table Mate - Accounting</h1>
        <div className="header-actions">
          {mode === "api" && (debugUsers.request || debugUsers.response != null || debugUsers.error) && (
            <button
              type="button"
              className="btn btn-outline btn-debug-toggle"
              onClick={() => setShowDebug((v) => !v)}
              aria-pressed={showDebug}
            >
              {showDebug ? "Hide debug" : "Show debug"}
            </button>
          )}
          <span className="logged-in-as">Logged in as <strong>{authUser.name}</strong></span>
          {mode === "api" && (
            <>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowSettingsModal(true)}>Settings</button>
              {authUser?.role === "admin" && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowManageUsersModal(true)}>Manage users</button>
              )}
            </>
          )}
          <button type="button" className="btn btn-outline" onClick={logout}>Log out</button>
        </div>
      </header>

      {err && <div className="msg err">{err}</div>}

      {mode === "api" && showDebug && (debugUsers.request || debugUsers.response != null || debugUsers.error) && (
        <Card title="Debug: Users API" className="debug-card">
          <div className="debug-section">
            <div className="debug-label">Request</div>
            <pre className="debug-pre">
              {debugUsers.request
                ? `GET ${debugUsers.request.url}\nToken sent: ${debugUsers.request.tokenPresent ? "Yes" : "No"}\nToken: ${debugUsers.request.token || "(none)"}`
                : "—"}
            </pre>
          </div>
          {debugUsers.error && (
            <div className="debug-section">
              <div className="debug-label">Error</div>
              <pre className="debug-pre debug-error">{debugUsers.error}</pre>
            </div>
          )}
          <div className="debug-section">
            <div className="debug-label">Response (raw)</div>
            <pre className="debug-pre">
              {debugUsers.response != null
                ? JSON.stringify(debugUsers.response, null, 2)
                : "—"}
            </pre>
          </div>
          <div className="debug-section">
            <div className="debug-label">Normalized team list (used in app)</div>
            <pre className="debug-pre">
              {JSON.stringify(normalizeUserList(debugUsers.response), null, 2)}
            </pre>
          </div>
        </Card>
      )}

      <SettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        passwordMsg={passwordMsg}
        onSubmit={handleChangePassword}
      />
      {authUser?.role === "admin" && (
        <ManageUsersModal
          open={showManageUsersModal}
          onClose={() => setShowManageUsersModal(false)}
          adminNewUser={adminNewUser}
          setAdminNewUser={setAdminNewUser}
          adminUsers={adminUsers}
          adminEditingId={adminEditingId}
          setAdminEditingId={setAdminEditingId}
          adminSetPasswordId={adminSetPasswordId}
          setAdminSetPasswordId={setAdminSetPasswordId}
          adminSetPasswordValue={adminSetPasswordValue}
          setAdminSetPasswordValue={setAdminSetPasswordValue}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onSetPassword={handleSetUserPassword}
        />
      )}

      <section className="section">
        <span className="section-label">View & add expenses for</span>
        <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
        <p className="hint section-hint">Select a tab to view that person&apos;s expenses and to add new expenses as that member.</p>
      </section>

      {mode === "local" && (
        <Card title="Add team member" className="card-add-member">
          <form onSubmit={addTeamMemberLocal} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="input"
            />
            <button type="submit" className="btn">Add member</button>
          </form>
        </Card>
      )}

      <div className="grid grid-full filters-above-expenses">
        <ExpenseFilters
          filters={filters}
          setFilters={setFilters}
          suppliers={suppliers}
          categories={categories}
          bwpPerUsd={bwpPerUsd}
          setBwpPerUsd={setBwpPerUsd}
          bwpRateFetchFailed={bwpRateFetchFailed}
          bwpRateDate={bwpRateDate}
          showRemovedTransactions={showRemovedTransactions}
          onShowRemovedChange={setShowRemovedTransactions}
        />
      </div>

      <div className="grid grid-full">
        <ExpensesTable
          sortedExpenses={displayExpenses}
          expenses={expenses}
          users={users}
          sortBy={expenseSortBy}
          sortDir={expenseSortDir}
          onSortChange={(key, dir) => {
            setExpenseSortBy(key);
            setExpenseSortDir(dir);
          }}
          getReceiptUrls={getReceiptUrls}
          onOpenAttach={(id) => { setAttachInvoiceExpenseId(id); setAttachInvoiceUrl(""); }}
          onViewInvoices={setViewInvoicesExpense}
          onDeleteExpense={deleteExpense}
          canDeleteExpense={canDeleteExpense}
          onExportCsv={exportToCsv}
          onExportPdf={exportToPdf}
          onAddExpense={() => setShowAddExpenseModal(true)}
        />
      </div>

      <div className="grid grid-3-nested">
        <TotalSpendCard
          totalUSD={currencyTotals.totalUSD}
          totalBWP={currencyTotals.totalBWP}
          totalInUsdEquiv={currencyTotals.totalInUsdEquiv}
        />
        <SummaryCard
          title="By team member"
          items={sortedByUser}
          sortMode={summarySortByUser}
          onSortChange={setSummarySortByUser}
          nameKey="name"
        />
        <SummaryCard
          title="By supplier"
          items={sortedBySupplier}
          sortMode={summarySortBySupplier}
          onSortChange={setSummarySortBySupplier}
          nameKey="supplier"
          maxItems={6}
        />
      </div>

      <div className="grid grid-full">
        <SummaryCard
          title="By category"
          items={sortedByCategory}
          sortMode={summarySortByCategory}
          onSortChange={setSummarySortByCategory}
          nameKey="category"
        />
      </div>

      <div className="grid grid-full hide-bulk-import" aria-hidden="true">
        <BulkCsvCard
          bulkCsv={bulkCsv}
          setBulkCsv={setBulkCsv}
          bulkErr={bulkErr}
          fileInputRef={fileInputRef}
          onFileUpload={onFileUpload}
          onImport={handleBulkCsv}
        />
      </div>

      <AttachInvoiceModal
        open={attachInvoiceExpenseId != null}
        expenseId={attachInvoiceExpenseId}
        expenses={expenses}
        attachInvoiceUrl={attachInvoiceUrl}
        setAttachInvoiceUrl={setAttachInvoiceUrl}
        attachUploading={attachUploading}
        attachFileInputRef={attachFileInputRef}
        getReceiptUrls={getReceiptUrls}
        onClose={() => { setAttachInvoiceExpenseId(null); setAttachInvoiceUrl(""); }}
        onSubmit={handleAttachInvoice}
        onFileChange={onAttachFileChange}
      />
      <ViewInvoicesModal
        expense={viewInvoicesExpense}
        getReceiptUrls={getReceiptUrls}
        detachingUrl={detachingUrl}
        onClose={() => setViewInvoicesExpense(null)}
        onDetach={handleDetachInvoice}
      />
      <SupplierModal
        open={showSupplierModal}
        name={newSupplierName}
        setName={setNewSupplierName}
        suppliers={suppliers}
        onClose={() => setShowSupplierModal(false)}
        onSubmit={addSupplier}
      />
      <CategoryModal
        open={showCategoryModal}
        name={newCategoryName}
        setName={setNewCategoryName}
        categories={categories}
        onClose={() => setShowCategoryModal(false)}
        onSubmit={addCategory}
      />

      <AddExpenseModal
        open={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        form={expenseForm}
        setForm={setExpenseForm}
        activeTab={activeTab}
        users={users}
        addExpenseForUserId={addExpenseForUserId}
        setAddExpenseForUserId={setAddExpenseForUserId}
        suppliers={suppliers}
        categories={categories}
        addExpenseReceiptUploading={addExpenseReceiptUploading}
        err={err}
        onSubmit={addExpense}
        onReceiptFileChange={onAddExpenseReceiptFileChange}
        onOpenSupplierModal={() => setShowSupplierModal(true)}
        onOpenCategoryModal={() => setShowCategoryModal(true)}
      />

      <AuditLogCard auditLog={auditLog} isLocal={mode === "local"} />
    </div>
  );
}
