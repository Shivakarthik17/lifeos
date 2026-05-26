"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Transaction = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  type: "income" | "expense" | string;
  date: string;
  createdAt: string;
};

type Budget = {
  id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
};

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Other",
] as const;

const BUDGET_CATEGORIES = ["All", ...CATEGORIES] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#7F77DD",
  Transport: "#1D9E75",
  Shopping: "#D4537E",
  Bills: "#EF9F27",
  Health: "#378ADD",
  Entertainment: "#E24B4A",
  Other: "#888780",
  All: "#7F77DD",
};

type TimeRange = "week" | "month" | "3months" | "year";

function formatCurrency(n: number) {
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function isCurrentMonth(iso: string, month: number, year: number) {
  const d = new Date(iso);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
}

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toInputDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export default function FinanceClient() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-transaction form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);

  // Budget form state
  const [budgetCategory, setBudgetCategory] = useState<string>(BUDGET_CATEGORIES[0]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);

  // Per-row edit/delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState<string>(CATEGORIES[0]);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"expense" | "income">("expense");
  const [editDate, setEditDate] = useState(todayInputValue());
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Filter state for transactions list
  const [search, setSearch] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Time-range chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [txRes, bRes] = await Promise.all([
        fetch("/api/finance/transactions", { cache: "no-store" }),
        fetch("/api/finance/budget", { cache: "no-store" }),
      ]);
      if (!txRes.ok) throw new Error("Failed to load transactions");
      if (!bRes.ok) throw new Error("Failed to load budgets");
      const txJson = await txRes.json();
      const bJson = await bRes.json();
      setTransactions(txJson.transactions ?? []);
      setBudgets(bJson.budgets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [txRes, bRes] = await Promise.all([
          fetch("/api/finance/transactions", { cache: "no-store" }),
          fetch("/api/finance/budget", { cache: "no-store" }),
        ]);
        if (!txRes.ok) throw new Error("Failed to load transactions");
        if (!bRes.ok) throw new Error("Failed to load budgets");
        const txJson = await txRes.json();
        const bJson = await bRes.json();
        if (cancelled) return;
        setTransactions(txJson.transactions ?? []);
        setBudgets(bJson.budgets ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthTx = useMemo(
    () => transactions.filter((t) => isCurrentMonth(t.date, currentMonth, currentYear)),
    [transactions, currentMonth, currentYear]
  );

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of monthTx) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expenses += t.amount;
    }
    return { income, expenses, net: income - expenses };
  }, [monthTx]);

  const spendByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of CATEGORIES) map.set(c, 0);
    for (const t of monthTx) {
      if (t.type !== "expense") continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(map.entries()).map(([cat, amt]) => ({
      category: cat,
      amount: Math.round(amt * 100) / 100,
    }));
  }, [monthTx]);

  const pieData = useMemo(
    () => spendByCategory.filter((s) => s.amount > 0),
    [spendByCategory]
  );

  const totalExpenses = useMemo(
    () => pieData.reduce((sum, s) => sum + s.amount, 0),
    [pieData]
  );

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = filterFromDate ? new Date(filterFromDate).getTime() : null;
    const toTs = filterToDate ? new Date(filterToDate).getTime() + 86400000 - 1 : null;
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      const ts = new Date(t.date).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      if (q) {
        const hay =
          `${t.description ?? ""} ${t.category} ${t.type} ${t.amount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, filterFromDate, filterToDate, filterType, filterCategory]);

  const timeSeriesData = useMemo(() => {
    const today = startOfDay(new Date());
    let days: number;
    let groupBy: "day" | "week" | "month";
    if (timeRange === "week") {
      days = 7;
      groupBy = "day";
    } else if (timeRange === "month") {
      days = 30;
      groupBy = "day";
    } else if (timeRange === "3months") {
      days = 90;
      groupBy = "week";
    } else {
      days = 365;
      groupBy = "month";
    }
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);

    const buckets = new Map<string, { label: string; ts: number; income: number; expense: number }>();

    function bucketKey(d: Date) {
      if (groupBy === "day") {
        return toInputDate(d.toISOString());
      }
      if (groupBy === "week") {
        const wk = new Date(d);
        wk.setDate(wk.getDate() - wk.getDay());
        return toInputDate(wk.toISOString());
      }
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${yyyy}-${mm}`;
    }

    function bucketLabel(key: string) {
      if (groupBy === "month") {
        const [yy, mm] = key.split("-");
        const d = new Date(Number(yy), Number(mm) - 1, 1);
        return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      }
      const d = new Date(key);
      if (groupBy === "week") {
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      }
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    }

    function bucketTs(key: string) {
      if (groupBy === "month") {
        const [yy, mm] = key.split("-");
        return new Date(Number(yy), Number(mm) - 1, 1).getTime();
      }
      return new Date(key).getTime();
    }

    const cursor = new Date(start);
    while (cursor <= today) {
      const key = bucketKey(cursor);
      if (!buckets.has(key)) {
        buckets.set(key, {
          label: bucketLabel(key),
          ts: bucketTs(key),
          income: 0,
          expense: 0,
        });
      }
      if (groupBy === "day") {
        cursor.setDate(cursor.getDate() + 1);
      } else if (groupBy === "week") {
        cursor.setDate(cursor.getDate() + 7);
      } else {
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d < start || d > today) continue;
      const key = bucketKey(d);
      const b = buckets.get(key);
      if (!b) continue;
      if (t.type === "income") b.income += t.amount;
      else if (t.type === "expense") b.expense += t.amount;
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.ts - b.ts)
      .map((b) => ({
        label: b.label,
        income: Math.round(b.income * 100) / 100,
        expense: Math.round(b.expense * 100) / 100,
      }));
  }, [transactions, timeRange]);

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          category,
          description: description.trim() || undefined,
          type,
          date,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add transaction");
      }
      setAmount("");
      setDescription("");
      setDate(todayInputValue());
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (budgetSubmitting) return;
    const amt = parseFloat(budgetAmount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Budget amount must be zero or positive");
      return;
    }
    setBudgetSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: budgetCategory,
          amount: amt,
          month: currentMonth,
          year: currentYear,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save budget");
      }
      setBudgetAmount("");
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save budget");
    } finally {
      setBudgetSubmitting(false);
    }
  }

  async function handleDelete(t: Transaction) {
    if (deletingId) return;
    const label = t.description?.trim() || t.category;
    if (
      !window.confirm(
        `Delete this transaction?\n\n${label} — ${formatCurrency(t.amount)}\n\nThis cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(t.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/finance/transactions?id=${encodeURIComponent(t.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setEditCategory(t.category);
    setEditDescription(t.description ?? "");
    setEditAmount(String(t.amount));
    setEditType(t.type === "income" ? "income" : "expense");
    setEditDate(toInputDate(t.date));
    setError(null);
  }

  function closeEdit() {
    if (editSubmitting) return;
    setEditing(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || editSubmitting) return;
    if (!editCategory.trim()) {
      setError("Category is required");
      return;
    }
    const amt = parseFloat(editAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    setEditSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          category: editCategory,
          description: editDescription.trim() || null,
          amount: amt,
          type: editType,
          date: editDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      const { transaction } = await res.json();
      setTransactions((prev) =>
        prev.map((x) => (x.id === editing.id ? { ...x, ...transaction } : x))
      );
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setEditSubmitting(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterType("all");
    setFilterCategory("all");
  }

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Monthly summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Income" value={totals.income} tone="emerald" />
        <SummaryCard label="Expenses" value={totals.expenses} tone="rose" />
        <SummaryCard label="Net savings" value={totals.net} tone="accent" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Add transaction form */}
        <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
          <h2 className="text-base font-semibold text-white">Add transaction</h2>
          <form onSubmit={handleAddTransaction} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Amount">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Type">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "income" | "expense")}
                  className={inputClass}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </Field>
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
            </div>
            <Field label="Description (optional)">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="e.g. Lunch with team"
              />
            </Field>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add transaction"}
            </button>
          </form>
        </section>

        {/* Set budget form */}
        <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
          <h2 className="text-base font-semibold text-white">Set monthly budget</h2>
          <p className="mt-1 text-xs text-muted">
            Sets the budget for the current month ({currentMonth}/{currentYear}). Use{" "}
            <span className="text-white">All</span> for total spending across categories.
          </p>
          <form onSubmit={handleSaveBudget} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Category">
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className={inputClass}
                >
                  {BUDGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={budgetSubmitting}
              className="w-full rounded-lg border border-accent/60 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {budgetSubmitting ? "Saving…" : "Save budget"}
            </button>
          </form>
        </section>
      </div>

      {/* Spending pie chart */}
      <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Spending by category</h2>
          <span className="text-xs text-muted">This month</span>
        </div>
        <div className="mt-4 h-72 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading…
            </div>
          ) : pieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No expenses yet this month.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={2}
                  label={({ percent }) =>
                    `${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={CATEGORY_COLORS[entry.category] ?? "#7F77DD"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0E1430",
                    border: "1px solid #1F2A52",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  formatter={(value, _name, entry) => {
                    const v = typeof value === "number" ? value : Number(value) || 0;
                    const pct = totalExpenses > 0 ? (v / totalExpenses) * 100 : 0;
                    const cat =
                      (entry && (entry as { payload?: { category?: string } }).payload?.category) ??
                      "";
                    return [`${formatCurrency(v)} (${pct.toFixed(1)}%)`, cat];
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => {
                    const p = (entry as { payload?: { amount?: number } }).payload;
                    const amt = p?.amount ?? 0;
                    return (
                      <span className="text-xs text-white">
                        {value} · {formatCurrency(amt)}
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Spending over time */}
      <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">Spending over time</h2>
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-surface-2/40 p-1">
            {(["week", "month", "3months", "year"] as TimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  timeRange === r
                    ? "bg-accent text-white"
                    : "text-muted hover:text-white"
                }`}
              >
                {r === "week"
                  ? "Week"
                  : r === "month"
                  ? "Month"
                  : r === "3months"
                  ? "3 Months"
                  : "Year"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-64 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeSeriesData}
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#9AA3C7"
                  tick={{ fill: "#9AA3C7", fontSize: 11 }}
                  axisLine={{ stroke: "#1F2A52" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9AA3C7"
                  tick={{ fill: "#9AA3C7", fontSize: 11 }}
                  axisLine={{ stroke: "#1F2A52" }}
                  tickLine={false}
                  tickFormatter={(v) => formatInr(typeof v === "number" ? v : Number(v) || 0)}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0E1430",
                    border: "1px solid #1F2A52",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  formatter={(v) =>
                    formatCurrency(typeof v === "number" ? v : Number(v) || 0)
                  }
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-white">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#1D9E75"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#E24B4A"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Budget progress */}
      <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Budget progress</h2>
          <span className="text-xs text-muted">
            {currentMonth}/{currentYear}
          </span>
        </div>
        {budgets.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No budgets yet. Use the form above to set one.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {budgets.map((b) => {
              const spent =
                b.category === "All"
                  ? totals.expenses
                  : spendByCategory.find((s) => s.category === b.category)?.amount ?? 0;
              const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
              const over = b.amount > 0 && spent > b.amount;
              const color = CATEGORY_COLORS[b.category] ?? "#7F77DD";
              return (
                <li key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-white">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: color }}
                      />
                      {b.category}
                      {b.category === "All" && (
                        <span className="text-xs text-muted">(total spending)</span>
                      )}
                    </span>
                    <span className={over ? "text-rose-300" : "text-muted"}>
                      {formatCurrency(spent)} / {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: over ? "#fb7185" : color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Transactions list with filters */}
      <section className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">Transactions</h2>
          <span className="text-xs text-muted">
            {filteredTransactions.length} of {transactions.length}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Search">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
              placeholder="Search description, category…"
            />
          </Field>
          <Field label="Type">
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as "all" | "income" | "expense")
              }
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </Field>
          <Field label="Category">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From date">
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="To date">
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              Reset filters
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No transactions match these filters.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {filteredTransactions.map((t) => {
              const color = CATEGORY_COLORS[t.category] ?? "#7F77DD";
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold uppercase text-white"
                      style={{ background: `${color}33`, color }}
                    >
                      {t.category.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {t.description?.trim() || t.category}
                      </p>
                      <p className="text-xs text-muted">
                        {t.category} ·{" "}
                        {new Date(t.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        t.type === "income" ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      aria-label="Edit transaction"
                      title="Edit"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      disabled={deletingId === t.id}
                      aria-label="Delete transaction"
                      title="Delete"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeEdit}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Edit transaction</h3>
              <button
                type="button"
                onClick={closeEdit}
                disabled={editSubmitting}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Amount">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Type">
                  <select
                    value={editType}
                    onChange={(e) =>
                      setEditType(e.target.value as "income" | "expense")
                    }
                    className={inputClass}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </Field>
              </div>
              <Field label="Description">
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Lunch with team"
                />
              </Field>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSubmitting}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSubmitting ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm text-white placeholder:text-muted/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "accent";
}) {
  const toneStyles: Record<typeof tone, string> = {
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    accent: "text-accent",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-5 shadow-card">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneStyles[tone]}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

