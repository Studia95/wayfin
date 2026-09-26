"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check,
  ChevronRight, CircleDollarSign, Clock3, Download, FileJson, Landmark, LayoutDashboard,
  Menu, MoreHorizontal, Pencil, Plus, ReceiptText, Search, Settings, Trash2, TrendingUp,
  UserRound, UsersRound, WalletCards, X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AccountDialog, BudgetDialog, ClientDialog, TransactionDialog } from "./finance-dialogs";
import { CategorySection } from "./category-section";
import {
  Account, Budget, Category, Client, currentMonth, formatDate, monthLabel, requestSnapshot, rub,
  Snapshot, Transaction, View,
} from "./finance-types";

const navigation: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Главная", icon: LayoutDashboard },
  { id: "operations", label: "Операции", icon: ReceiptText },
  { id: "clients", label: "Клиенты", icon: UsersRound },
  { id: "plan", label: "План", icon: CalendarDays },
  { id: "settings", label: "Ещё", icon: Settings },
];

const chartColors = ["#2563eb", "#0f766e", "#f59e0b", "#7c3aed", "#e11d48", "#64748b"];

function pastMonths(endMonth: string, count: number) {
  const [year, month] = endMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - count + index, 1));
    return date.toISOString().slice(0, 7);
  });
}

function download(filename: string, text: string, type = "application/json") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.03)] ${className}`}>{children}</section>;
}

function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  const prefix = typeof window !== "undefined" && window.location.hostname.endsWith("github.io") ? "/wayfin/" : "/";
  return <img src={`${prefix}pwa-icon.svg`} alt="ФинПилот" className={`${className} rounded-xl`} />;
}

function MetricCard({ label, value, hint, tone = "blue", icon: Icon }: { label: string; value: string; hint: string; tone?: string; icon: React.ElementType }) {
  const tones: Record<string, string> = { blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", violet: "bg-violet-50 text-violet-700" };
  return <Panel className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}><Icon className="h-5 w-5" /></div></div><p className="mt-3 text-xs text-slate-500">{hint}</p></Panel>;
}

function StatusBadge({ status }: { status: string }) {
  return status === "paid"
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><Check className="h-3 w-3" />Оплачено</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"><Clock3 className="h-3 w-3" />Запланировано</span>;
}

function LoadingScreen() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /><p className="text-sm font-medium text-slate-600">Собираем финансовую картину…</p></div></div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center px-6 py-14 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ReceiptText /></div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export default function FinanceApp() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("overview");
  const [month, setMonth] = useState(currentMonth());
  const [mobileMenu, setMobileMenu] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    requestSnapshot("GET").then(setData).catch((err: Error) => setError(err.message));
  }, []);

  const mutate = useCallback(async (method: string, body: unknown, success: string) => {
    try {
      const next = await requestSnapshot(method, body);
      setData(next);
      toast.success(success);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить";
      toast.error(message);
      throw err;
    }
  }, []);

  const saveTransaction = useCallback((values: Record<string, unknown>, id?: number) =>
    mutate(id ? "PATCH" : "POST", { entity: "transaction", id, data: values }, id ? "Операция обновлена" : "Операция добавлена").then(() => undefined), [mutate]);
  const saveClient = useCallback((values: Record<string, unknown>, id?: number) =>
    mutate(id ? "PATCH" : "POST", { entity: "client", id, data: values }, id ? "Клиент обновлён" : "Клиент добавлен").then(() => undefined), [mutate]);
  const saveBudget = useCallback((values: Record<string, unknown>) => mutate("POST", { entity: "budget", data: values }, "План добавлен").then(() => undefined), [mutate]);
  const saveAccount = useCallback((values: Record<string, unknown>) => mutate("POST", { entity: "account", data: values }, "Счёт добавлен").then(() => undefined), [mutate]);
  const createCategory = useCallback(async (type: "income" | "expense", name: string, parentId: number | null = null) => {
    const next = await mutate("POST", { entity: "category", data: { type, name, parentId } }, "Категория добавлена");
    return next.categories.find(item => item.type === type && item.name === name);
  }, [mutate]);
  const updateCategory = useCallback(async (id: number, data: Record<string, unknown>) => {
    await mutate("PATCH", { entity: "category", id, data }, "Категория обновлена");
  }, [mutate]);

  const stats = useMemo(() => {
    if (!data) return null;
    const paid = data.transactions.filter(item => item.status === "paid");
    const inMonth = paid.filter(item => item.occurredAt.startsWith(month));
    const income = inMonth.filter(item => item.type === "income").reduce((sum, item) => sum + item.amountCents, 0);
    const expense = inMonth.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amountCents, 0);
    const opening = data.accounts.filter(item => !item.archived).reduce((sum, item) => sum + item.openingBalanceCents, 0);
    const paidIncome = paid.filter(item => item.type === "income").reduce((sum, item) => sum + item.amountCents, 0);
    const paidExpense = paid.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amountCents, 0);
    const balance = opening + paidIncome - paidExpense;
    const plannedIncome = data.transactions.filter(item => item.status === "planned" && item.type === "income").reduce((sum, item) => sum + item.amountCents, 0);
    const plannedExpense = data.transactions.filter(item => item.status === "planned" && item.type === "expense").reduce((sum, item) => sum + item.amountCents, 0);
    const chart = pastMonths(month, 6).map(key => {
      const rows = paid.filter(item => item.occurredAt.startsWith(key));
      return { key, name: new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(new Date(`${key}-01T12:00:00`)), income: rows.filter(i => i.type === "income").reduce((s, i) => s + i.amountCents, 0) / 100, expense: rows.filter(i => i.type === "expense").reduce((s, i) => s + i.amountCents, 0) / 100 };
    });
    const expensesByCategory = Object.entries(inMonth.filter(i => i.type === "expense").reduce<Record<string, number>>((acc, item) => { acc[item.category] = (acc[item.category] || 0) + item.amountCents; return acc; }, {})).map(([name, value]) => ({ name, value }));
    const accountBalances = data.accounts.filter(item => !item.archived).map(account => {
      const rows = paid.filter(item => item.accountId === account.id);
      return { ...account, balance: account.openingBalanceCents + rows.reduce((sum, item) => sum + (item.type === "income" ? item.amountCents : -item.amountCents), 0) };
    });
    return { income, expense, profit: income - expense, balance, plannedIncome, plannedExpense, forecast: balance + plannedIncome - plannedExpense, chart, expensesByCategory, accountBalances };
  }, [data, month]);

  useEffect(() => {
    if (!data || !stats) return;
    type Tool = { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: Record<string, unknown>) => Promise<unknown> | unknown };
    type Context = { registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as unknown as { modelContext?: Context }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [
      { name: "read_finance_summary", title: "Финансовая сводка", description: "Получить текущий баланс, доходы, расходы и плановые платежи.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ month, balanceRub: stats.balance / 100, incomeRub: stats.income / 100, expenseRub: stats.expense / 100, profitRub: stats.profit / 100, plannedIncomeRub: stats.plannedIncome / 100, plannedExpenseRub: stats.plannedExpense / 100 }) },
      { name: "create_finance_transaction", title: "Добавить операцию", description: "Добавить доход или расход и обновить все связанные отчёты.", inputSchema: { type: "object", properties: { type: { type: "string", enum: ["income", "expense"] }, amountRub: { type: "number", exclusiveMinimum: 0 }, category: { type: "string" }, description: { type: "string" } }, required: ["type", "amountRub", "category"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input) => { if (!data.accounts[0]) throw new Error("Нет счёта"); const next = await mutate("POST", { entity: "transaction", data: { type: input.type, amountCents: Math.round(Number(input.amountRub) * 100), category: String(input.category), description: String(input.description || ""), accountId: data.accounts[0].id, status: "paid", occurredAt: new Date().toISOString().slice(0, 10) } }, "Операция добавлена"); return { saved: true, transactionCount: next.transactions.length }; } },
      { name: "create_finance_client", title: "Добавить клиента", description: "Добавить клиента в финансовый учёт.", inputSchema: { type: "object", properties: { name: { type: "string", minLength: 1 }, phone: { type: "string" }, note: { type: "string" } }, required: ["name"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input) => { const next = await mutate("POST", { entity: "client", data: { name: input.name, phone: input.phone || "", note: input.note || "", type: "company" } }, "Клиент добавлен"); return { saved: true, clientCount: next.clients.length }; } },
    ];
    for (const tool of tools) Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [data, stats, month, mutate]);

  if (error) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><Panel className="max-w-lg p-8 text-center"><h1 className="text-xl font-bold">Не удалось открыть данные</h1><p className="mt-2 text-sm text-slate-500">{error}</p><Button className="mt-6" onClick={() => location.reload()}>Повторить</Button></Panel></div>;
  if (!data || !stats) return <LoadingScreen />;

  const openNewTransaction = () => { setEditingTransaction(null); setTransactionOpen(true); };
  const openNewClient = () => { setEditingClient(null); setClientOpen(true); };
  const deleteEntity = (entity: "transaction" | "client" | "budget" | "account", id: number) => mutate("DELETE", { entity, id }, "Удалено").then(() => undefined);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="top-center" richColors />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-slate-200 bg-[#0b1739] px-4 py-5 text-white lg:flex">
        <div className="flex h-12 items-center gap-3 px-2"><BrandMark /><div><div className="text-lg font-bold tracking-tight">ФинПилот</div><div className="text-xs text-blue-200">деньги под контролем</div></div></div>
        <nav className="mt-8 space-y-1">{navigation.map(item => <button key={item.id} onClick={() => setView(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${view === item.id ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/7 hover:text-white"}`}><item.icon className="h-5 w-5" />{item.label}</button>)}</nav>
        <div className="mt-auto rounded-2xl bg-white/8 p-4"><p className="text-xs text-blue-200">Текущий бизнес</p><p className="mt-1 truncate text-sm font-semibold">{data.business.name}</p><p className="mt-1 text-xs text-slate-400">{data.business.industry}</p></div>
      </aside>

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 flex h-18 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Открыть меню"><Menu /></Button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-lg font-bold sm:text-xl">{navigation.find(item => item.id === view)?.label}</h1><p className="hidden text-xs text-slate-500 sm:block">{data.business.name}</p></div>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:flex"><CalendarDays className="h-4 w-4 text-slate-400" /><input aria-label="Период отчёта" type="month" value={month} onChange={event => setMonth(event.target.value)} className="h-9 bg-transparent text-sm font-medium outline-none" /></div>
          <Button onClick={openNewTransaction} className="h-10 rounded-xl bg-blue-600 px-3 hover:bg-blue-700 sm:px-4"><Plus /> <span className="hidden sm:inline">Операция</span></Button>
        </header>

        {mobileMenu && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileMenu(false)}><div className="h-full w-[280px] bg-[#0b1739] p-4 text-white" onClick={event => event.stopPropagation()}><div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><BrandMark /><b className="text-lg">ФинПилот</b></div><Button variant="ghost" size="icon" onClick={() => setMobileMenu(false)} className="text-white"><X /></Button></div><nav className="space-y-1">{navigation.map(item => <button key={item.id} onClick={() => { setView(item.id); setMobileMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${view === item.id ? "bg-white/12" : "text-slate-300"}`}><item.icon className="h-5 w-5" />{item.label}</button>)}</nav></div></div>}

        <main className="mx-auto max-w-[1500px] p-4 pb-28 sm:p-6 lg:p-8 lg:pb-10">
          <div className="mb-5 flex items-center gap-2 sm:hidden"><CalendarDays className="h-4 w-4 text-slate-400" /><input aria-label="Период отчёта" type="month" value={month} onChange={event => setMonth(event.target.value)} className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium" /></div>
          {view === "overview" && <Overview data={data} stats={stats} month={month} onNew={openNewTransaction} onViewOperations={() => setView("operations")} />}
          {view === "operations" && <Operations data={data} search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onNew={openNewTransaction} onEdit={item => { setEditingTransaction(item); setTransactionOpen(true); }} onDelete={id => deleteEntity("transaction", id)} />}
          {view === "clients" && <Clients data={data} search={search} setSearch={setSearch} onNew={openNewClient} onEdit={item => { setEditingClient(item); setClientOpen(true); }} onSelect={setSelectedClient} onDelete={id => deleteEntity("client", id)} />}
          {view === "plan" && <Plan data={data} month={month} onBudget={() => setBudgetOpen(true)} onPlanned={openNewTransaction} onDelete={id => deleteEntity("budget", id)} />}
          {view === "settings" && <SettingsView data={data} stats={stats} onAccount={() => setAccountOpen(true)} onCreateCategory={createCategory} onUpdateCategory={updateCategory} onSaveBusiness={(values) => mutate("PATCH", { entity: "business", id: data.business.id, data: values }, "Настройки сохранены").then(() => undefined)} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">{navigation.map(item => <button key={item.id} onClick={() => setView(item.id)} className={`flex min-w-0 flex-col items-center gap-1 px-1 py-1 text-xs font-medium ${view === item.id ? "text-blue-700" : "text-slate-500"}`}><item.icon className="h-5 w-5" /><span className="truncate">{item.label}</span></button>)}</nav>

      <TransactionDialog open={transactionOpen} onOpenChange={setTransactionOpen} accounts={data.accounts} clients={data.clients} categories={data.categories} initial={editingTransaction} onSave={saveTransaction} onCreateCategory={createCategory} />
      <ClientDialog open={clientOpen} onOpenChange={setClientOpen} initial={editingClient} onSave={saveClient} />
      <BudgetDialog open={budgetOpen} onOpenChange={setBudgetOpen} month={month} onSave={saveBudget} />
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} onSave={saveAccount} />
      <ClientSheet client={selectedClient} data={data} onOpenChange={open => !open && setSelectedClient(null)} />
    </div>
  );
}

function Overview({ data, stats, month, onNew, onViewOperations }: { data: Snapshot; stats: NonNullable<ReturnType<typeof useOverviewPlaceholder>>; month: string; onNew: () => void; onViewOperations: () => void }) {
  const recent = data.transactions.slice(0, 6);
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium capitalize text-blue-700">{monthLabel(month)}</p><h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Финансовая картина</h2></div><p className="max-w-lg text-sm text-slate-500">Все показатели пересчитываются из операций, счетов, клиентов и планов.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Денег сейчас" value={rub(stats.balance)} hint={`${stats.accountBalances.length} ${stats.accountBalances.length === 1 ? "активный счёт" : "активных счёта"}`} tone="blue" icon={WalletCards} /><MetricCard label="Доходы за месяц" value={rub(stats.income)} hint="Только оплаченные операции" tone="emerald" icon={ArrowDownLeft} /><MetricCard label="Расходы за месяц" value={rub(stats.expense)} hint="По всем категориям" tone="rose" icon={ArrowUpRight} /><MetricCard label="Денежный результат" value={rub(stats.profit)} hint={stats.profit >= 0 ? "Доходы выше расходов" : "Расходы выше доходов"} tone="violet" icon={TrendingUp} /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.75fr)]">
      <Panel className="p-4 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Доходы и расходы</h3><p className="mt-1 text-xs text-slate-500">Последние 6 месяцев</p></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" />Доходы</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" />Расходы</span></div></div><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.chart} margin={{ left: -16, right: 4 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#e2e8f0" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={value => `${Math.round(value / 1000)}k`} /><ChartTooltip formatter={(value) => rub(Number(value) * 100)} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} /><Area type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={3} fill="url(#incomeFill)" name="Доходы" /><Area type="monotone" dataKey="expense" stroke="#fb7185" strokeWidth={2} fill="transparent" name="Расходы" /></AreaChart></ResponsiveContainer></div></Panel>
      <div className="grid gap-5"><Panel className="overflow-hidden"><div className="bg-[#0b1739] p-5 text-white"><div className="flex items-center justify-between"><p className="text-sm text-blue-200">Прогноз после планов</p><CircleDollarSign className="h-5 w-5 text-blue-300" /></div><p className="mt-2 text-3xl font-bold">{rub(stats.forecast)}</p><p className="mt-2 text-xs text-slate-300">Баланс после ожидаемых поступлений и платежей</p></div><div className="grid grid-cols-2 divide-x divide-slate-200 p-4"><div><p className="text-xs text-slate-500">Ожидаем</p><p className="mt-1 font-semibold text-emerald-700">+{rub(stats.plannedIncome)}</p></div><div className="pl-4"><p className="text-xs text-slate-500">Заплатим</p><p className="mt-1 font-semibold text-rose-700">−{rub(stats.plannedExpense)}</p></div></div></Panel><Panel className="p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">По счетам</h3><Landmark className="h-4 w-4 text-slate-400" /></div><div className="space-y-4">{stats.accountBalances.map(item => <div key={item.id} className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-slate-400">{item.type === "cash" ? "Касса" : item.type === "card" ? "Карта" : "Банк"}</p></div><p className="shrink-0 text-sm font-bold">{rub(item.balance)}</p></div>)}</div></Panel></div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]"><Panel><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-semibold">Последние операции</h3><p className="mt-0.5 text-xs text-slate-500">Самые свежие изменения</p></div><Button variant="ghost" size="sm" onClick={onViewOperations}>Все <ArrowRight /></Button></div><TransactionList rows={recent} data={data} compact /></Panel><Panel className="p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">Структура расходов</h3><p className="mt-0.5 text-xs text-slate-500">За выбранный месяц</p></div></div>{stats.expensesByCategory.length ? <><div className="h-[180px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.expensesByCategory} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3}>{stats.expensesByCategory.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie><ChartTooltip formatter={(value) => rub(Number(value))} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{stats.expensesByCategory.slice(0, 4).map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} /><span className="truncate text-slate-600">{item.name}</span></span><b>{rub(item.value)}</b></div>)}</div></> : <EmptyState title="Нет расходов" text="Добавьте расход за выбранный месяц" action={<Button size="sm" onClick={onNew}><Plus />Добавить</Button>} />}</Panel></div>
  </div>;
}

function useOverviewPlaceholder() { return { income: 0, expense: 0, profit: 0, balance: 0, plannedIncome: 0, plannedExpense: 0, forecast: 0, chart: [] as { key: string; name: string; income: number; expense: number }[], expensesByCategory: [] as { name: string; value: number }[], accountBalances: [] as (Account & { balance: number })[] }; }

function Operations({ data, search, setSearch, typeFilter, setTypeFilter, statusFilter, setStatusFilter, onNew, onEdit, onDelete }: { data: Snapshot; search: string; setSearch: (value: string) => void; typeFilter: string; setTypeFilter: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onNew: () => void; onEdit: (item: Transaction) => void; onDelete: (id: number) => void }) {
  const rows = data.transactions.filter(item => {
    const client = data.clients.find(c => c.id === item.clientId)?.name || "";
    const haystack = `${item.description} ${item.category} ${client}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (typeFilter === "all" || item.type === typeFilter) && (statusFilter === "all" || item.status === statusFilter);
  });
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold tracking-tight">Журнал операций</h2><p className="mt-1 text-sm text-slate-500">Доходы, расходы и будущие платежи в одном месте.</p></div><Button onClick={onNew}><Plus />Добавить операцию</Button></div><Panel className="p-3 sm:p-4"><div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_190px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Поиск по описанию, категории, клиенту" /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все типы</SelectItem><SelectItem value="income">Доходы</SelectItem><SelectItem value="expense">Расходы</SelectItem></SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все состояния</SelectItem><SelectItem value="paid">Оплачено</SelectItem><SelectItem value="planned">Запланировано</SelectItem></SelectContent></Select></div></Panel><Panel>{rows.length ? <TransactionList rows={rows} data={data} onEdit={onEdit} onDelete={onDelete} /> : <EmptyState title="Ничего не найдено" text="Измените фильтры или добавьте новую операцию." action={<Button onClick={onNew}><Plus />Добавить</Button>} />}</Panel></div>;
}

function TransactionList({ rows, data, compact = false, onEdit, onDelete }: { rows: Transaction[]; data: Snapshot; compact?: boolean; onEdit?: (item: Transaction) => void; onDelete?: (id: number) => void }) {
  return <div className="divide-y divide-slate-100">{rows.map(item => {
    const client = data.clients.find(c => c.id === item.clientId);
    const account = data.accounts.find(a => a.id === item.accountId);
    return <div key={item.id} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-5"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{item.type === "income" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{item.description || item.category}</p>{!compact && <div className="hidden sm:block"><StatusBadge status={item.status} /></div>}</div><p className="mt-0.5 truncate text-xs text-slate-500">{formatDate(item.status === "planned" && item.dueAt ? item.dueAt : item.occurredAt)} · {item.category}{client ? ` · ${client.name}` : ""}{account ? ` · ${account.name}` : ""}</p></div><div className="flex items-center gap-1"><div className="text-right"><p className={`text-sm font-bold ${item.type === "income" ? "text-emerald-700" : "text-slate-900"}`}>{item.type === "income" ? "+" : "−"}{rub(item.amountCents)}</p>{!compact && <div className="mt-1 sm:hidden"><StatusBadge status={item.status} /></div>}</div>{onEdit && <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} aria-label="Изменить"><Pencil /></Button>}{onDelete && <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-rose-600" aria-label="Удалить"><Trash2 /></Button></AlertDialogTrigger><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>Удалить операцию?</AlertDialogTitle><AlertDialogDescription>Баланс и все отчёты будут пересчитаны.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => onDelete(item.id)}>Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div></div>;
  })}</div>;
}

function Clients({ data, search, setSearch, onNew, onEdit, onSelect, onDelete }: { data: Snapshot; search: string; setSearch: (value: string) => void; onNew: () => void; onEdit: (item: Client) => void; onSelect: (item: Client) => void; onDelete: (id: number) => void }) {
  const clients = data.clients.filter(item => `${item.name} ${item.phone} ${item.email}`.toLowerCase().includes(search.toLowerCase()));
  const metric = (client: Client) => { const rows = data.transactions.filter(t => t.clientId === client.id); return { paid: rows.filter(t => t.type === "income" && t.status === "paid").reduce((s, t) => s + t.amountCents, 0), waiting: rows.filter(t => t.type === "income" && t.status === "planned").reduce((s, t) => s + t.amountCents, 0), count: rows.length }; };
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold tracking-tight">Клиенты</h2><p className="mt-1 text-sm text-slate-500">Контакты, выручка и ожидаемые оплаты.</p></div><Button onClick={onNew}><Plus />Добавить клиента</Button></div><Panel className="p-3"><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Имя, телефон или почта" /></div></Panel>{clients.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clients.map(client => { const item = metric(client); return <Panel key={client.id} className="group overflow-hidden"><button onClick={() => onSelect(client)} className="w-full p-5 text-left"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate font-semibold">{client.name}</p><p className="truncate text-xs text-slate-500">{client.phone || client.email || (client.type === "company" ? "Компания" : "Частное лицо")}</p></div></div><ChevronRight className="h-5 w-5 text-slate-300" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Получено</p><p className="mt-1 text-sm font-bold text-emerald-700">{rub(item.paid)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Ожидаем</p><p className="mt-1 text-sm font-bold text-amber-700">{rub(item.waiting)}</p></div></div><p className="mt-4 truncate text-xs text-slate-500">{client.note || `${item.count} связанных операций`}</p></button><div className="flex justify-end gap-1 border-t border-slate-100 px-3 py-2"><Button variant="ghost" size="sm" onClick={() => onEdit(client)}><Pencil />Изменить</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-rose-600"><Trash2 /></Button></AlertDialogTrigger><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>Удалить клиента?</AlertDialogTitle><AlertDialogDescription>Операции сохранятся, но связь с клиентом станет недоступна.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => onDelete(client.id)}>Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></Panel>; })}</div> : <Panel><EmptyState title="Клиенты не найдены" text="Добавьте первого клиента или измените строку поиска." action={<Button onClick={onNew}><Plus />Добавить</Button>} /></Panel>}</div>;
}

function ClientSheet({ client, data, onOpenChange }: { client: Client | null; data: Snapshot; onOpenChange: (open: boolean) => void }) {
  if (!client) return <Sheet open={false}><SheetContent /></Sheet>;
  const rows = data.transactions.filter(item => item.clientId === client.id);
  const paid = rows.filter(item => item.type === "income" && item.status === "paid").reduce((sum, item) => sum + item.amountCents, 0);
  const waiting = rows.filter(item => item.type === "income" && item.status === "planned").reduce((sum, item) => sum + item.amountCents, 0);
  return <Sheet open={!!client} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader className="border-b border-slate-100 p-6"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserRound /></div><SheetTitle className="text-xl">{client.name}</SheetTitle><SheetDescription>{client.type === "company" ? "Компания" : "Частное лицо"}{client.phone ? ` · ${client.phone}` : ""}</SheetDescription></SheetHeader><div className="space-y-5 p-6"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Получено</p><p className="mt-1 font-bold text-emerald-900">{rub(paid)}</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-xs text-amber-700">Ожидаем</p><p className="mt-1 font-bold text-amber-900">{rub(waiting)}</p></div></div>{client.email && <div><p className="text-xs text-slate-500">Почта</p><p className="mt-1 text-sm font-medium">{client.email}</p></div>}{client.note && <div><p className="text-xs text-slate-500">Заметка</p><p className="mt-1 text-sm leading-6">{client.note}</p></div>}<div><h3 className="mb-2 font-semibold">Операции</h3><Panel>{rows.length ? <TransactionList rows={rows.slice(0, 10)} data={data} compact /> : <EmptyState title="Операций пока нет" text="Свяжите новую операцию с этим клиентом." />}</Panel></div></div></SheetContent></Sheet>;
}

function Plan({ data, month, onBudget, onPlanned, onDelete }: { data: Snapshot; month: string; onBudget: () => void; onPlanned: () => void; onDelete: (id: number) => void }) {
  const plans = data.budgets.filter(item => item.month === month);
  const paid = data.transactions.filter(item => item.status === "paid" && item.occurredAt.startsWith(month));
  const actual = (plan: Budget) => paid.filter(item => item.type === plan.type && item.category === plan.category).reduce((sum, item) => sum + item.amountCents, 0);
  const plannedOperations = data.transactions.filter(item => item.status === "planned").sort((a, b) => (a.dueAt || a.occurredAt).localeCompare(b.dueAt || b.occurredAt));
  const incomePlan = plans.filter(i => i.type === "income").reduce((s, i) => s + i.amountCents, 0); const expensePlan = plans.filter(i => i.type === "expense").reduce((s, i) => s + i.amountCents, 0);
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold tracking-tight">План и факт</h2><p className="mt-1 text-sm capitalize text-slate-500">{monthLabel(month)}</p></div><div className="flex gap-2"><Button variant="outline" onClick={onPlanned}><CalendarDays />Платёж</Button><Button onClick={onBudget}><Plus />План</Button></div></div><div className="grid gap-3 sm:grid-cols-3"><MetricCard label="План доходов" value={rub(incomePlan)} hint="Сумма по категориям" tone="emerald" icon={ArrowDownLeft} /><MetricCard label="План расходов" value={rub(expensePlan)} hint="Лимиты на месяц" tone="rose" icon={ArrowUpRight} /><MetricCard label="Плановый результат" value={rub(incomePlan - expensePlan)} hint="Доходы минус расходы" tone="violet" icon={TrendingUp} /></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]"><Panel><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold">Выполнение бюджета</h3><p className="mt-1 text-xs text-slate-500">Факт берётся из оплаченных операций</p></div>{plans.length ? <div className="divide-y divide-slate-100">{plans.map(plan => { const value = actual(plan); const percent = Math.min(100, Math.round(value / plan.amountCents * 100)); return <div key={plan.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${plan.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`} /><p className="text-sm font-semibold">{plan.category}</p></div><p className="mt-1 text-xs text-slate-500">{rub(value)} из {rub(plan.amountCents)}</p></div><div className="flex items-center gap-2"><b className="text-sm">{percent}%</b><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-xs" className="text-slate-400 hover:text-rose-600"><Trash2 /></Button></AlertDialogTrigger><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>Удалить строку плана?</AlertDialogTitle><AlertDialogDescription>Фактические операции сохранятся.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => onDelete(plan.id)}>Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div><Progress value={percent} className="mt-3 h-2" /></div>; })}</div> : <EmptyState title="Плана пока нет" text="Добавьте плановые доходы и расходы по категориям." action={<Button onClick={onBudget}><Plus />Добавить план</Button>} />}</Panel><Panel><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold">Ближайшие платежи</h3><p className="mt-1 text-xs text-slate-500">Поступления и списания со статусом «Запланировано»</p></div>{plannedOperations.length ? <TransactionList rows={plannedOperations} data={data} compact /> : <EmptyState title="Платежей нет" text="Добавьте будущий доход или расход." action={<Button variant="outline" onClick={onPlanned}>Запланировать</Button>} />}</Panel></div></div>;
}

function SettingsView({ data, stats, onAccount, onCreateCategory, onUpdateCategory, onSaveBusiness }: { data: Snapshot; stats: NonNullable<ReturnType<typeof useOverviewPlaceholder>>; onAccount: () => void; onCreateCategory: (type: "income" | "expense", name: string, parentId?: number | null) => Promise<Category | undefined>; onUpdateCategory: (id: number, data: Record<string, unknown>) => Promise<void>; onSaveBusiness: (values: Record<string, unknown>) => Promise<void> }) {
  const [name, setName] = useState(data.business.name); const [industry, setIndustry] = useState(data.business.industry); const [saving, setSaving] = useState(false);
  function exportCsv() { const header = ["Дата", "Тип", "Статус", "Категория", "Сумма", "Счёт", "Клиент", "Комментарий"]; const rows = data.transactions.map(item => [item.occurredAt, item.type === "income" ? "Доход" : "Расход", item.status === "paid" ? "Оплачено" : "Запланировано", item.category, (item.amountCents / 100).toFixed(2), data.accounts.find(a => a.id === item.accountId)?.name || "", data.clients.find(c => c.id === item.clientId)?.name || "", item.description].map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")); download(`finpilot-operations-${new Date().toISOString().slice(0, 10)}.csv`, "\uFEFF" + [header.join(";"), ...rows].join("\n"), "text/csv;charset=utf-8"); }
  const income = data.categories.filter(item => item.type === "income");
  const expense = data.categories.filter(item => item.type === "expense");
  return <div className="space-y-5"><div><h2 className="text-2xl font-bold tracking-tight">Настройки и файлы</h2><p className="mt-1 text-sm text-slate-500">Открывайте только нужный раздел — данные останутся под рукой.</p></div><div className="space-y-3"><details open className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BriefcaseBusiness /></div><div><h3 className="font-semibold">Профиль бизнеса</h3><p className="text-xs text-slate-500">Название отображается во всех разделах</p></div></div><ChevronRight className="transition group-open:rotate-90" /></summary><div className="mt-2 rounded-2xl border border-slate-200 bg-white p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Название<Input value={name} onChange={e => setName(e.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Сфера<Input value={industry} onChange={e => setIndustry(e.target.value)} /></label></div><Button className="mt-4" disabled={saving} onClick={async () => { setSaving(true); try { await onSaveBusiness({ name, industry }); } finally { setSaving(false); } }}>{saving ? "Сохраняю…" : "Сохранить"}</Button></div></details><details className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div><h3 className="font-semibold">Счета</h3><p className="mt-0.5 text-xs text-slate-500">Начальные остатки и текущий баланс</p></div><ChevronRight className="transition group-open:rotate-90" /></summary><div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><span className="text-sm text-slate-500">Счета бизнеса</span><Button size="sm" variant="outline" onClick={onAccount}><Plus />Счёт</Button></div><div className="divide-y divide-slate-100">{stats.accountBalances.map(account => <div key={account.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Landmark className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{account.name}</p><p className="text-xs text-slate-500">Начальный остаток {rub(account.openingBalanceCents)}</p></div></div><b className="text-sm">{rub(account.balance)}</b></div>)}</div></div></details><details className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div><h3 className="font-semibold">Категории</h3><p className="mt-0.5 text-xs text-slate-500">Отдельные списки доходов и расходов</p></div><ChevronRight className="transition group-open:rotate-90" /></summary><div className="mt-2 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2"><CategorySection title="Доходы" type="income" items={income} onCreate={onCreateCategory} onUpdate={onUpdateCategory} /><CategorySection title="Расходы" type="expense" items={expense} onCreate={onCreateCategory} onUpdate={onUpdateCategory} /></div></details><details className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div><h3 className="font-semibold">Выгрузка и резервная копия</h3><p className="mt-0.5 text-xs text-slate-500">Сохраните данные для Excel или восстановления</p></div><ChevronRight className="transition group-open:rotate-90" /></summary><div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-5"><Button variant="outline" onClick={exportCsv}><Download />Операции CSV</Button><Button variant="outline" onClick={() => download(`finpilot-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2))}><FileJson />Резервная копия</Button></div></details></div></div>;
}
