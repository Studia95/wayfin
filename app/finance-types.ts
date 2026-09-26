export type Business = { id: number; name: string; industry: string; currency: string };
export type Category = { id: number; businessId: number; type: "income" | "expense"; name: string; parentId: number | null; createdAt: string };
export type Account = { id: number; businessId: number; name: string; type: string; openingBalanceCents: number; archived: boolean };
export type Client = { id: number; businessId: number; name: string; type: string; phone: string; email: string; status: string; note: string; createdAt: string };
export type Transaction = { id: number; businessId: number; type: "income" | "expense"; amountCents: number; category: string; accountId: number; clientId: number | null; status: "paid" | "planned"; occurredAt: string; dueAt: string | null; description: string; createdAt: string; updatedAt: string };
export type Budget = { id: number; businessId: number; month: string; type: "income" | "expense"; category: string; amountCents: number };
export type Snapshot = { business: Business; accounts: Account[]; clients: Client[]; transactions: Transaction[]; budgets: Budget[]; categories: Category[] };
export type View = "overview" | "operations" | "clients" | "plan" | "settings";

export const incomeCategories = ["Продажи", "Доставка", "Кейтеринг", "Мероприятия", "Услуги", "Прочие доходы"];
export const expenseCategories = ["Сырьё и товары", "Зарплата", "Аренда", "Маркетинг", "Коммунальные", "Транспорт", "Налоги", "Прочие расходы"];

export const rub = (cents: number, compact = false) => new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", maximumFractionDigits: 0, notation: compact ? "compact" : "standard",
}).format(cents / 100);

export const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);

export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));
}

const staticStorageKey = "wayfin-static-snapshot-v1";

function staticDemoSnapshot(): Snapshot {
  const month = currentMonth();
  const date = today();
  return {
    business: { id: 1, name: "Кофейня Мята", industry: "Кафе и рестораны", currency: "RUB" },
    accounts: [
      { id: 1, businessId: 1, name: "Расчётный счёт", type: "bank", openingBalanceCents: 18500000, archived: false },
      { id: 2, businessId: 1, name: "Касса", type: "cash", openingBalanceCents: 4200000, archived: false },
    ],
    clients: [],
    transactions: [
      { id: 1, businessId: 1, type: "income", amountCents: 13200000, category: "Продажи", accountId: 2, clientId: null, status: "paid", occurredAt: `${month}-08`, dueAt: null, description: "Продажи в зале", createdAt: date, updatedAt: date },
      { id: 2, businessId: 1, type: "expense", amountCents: 5900000, category: "Сырьё и товары", accountId: 1, clientId: null, status: "paid", occurredAt: `${month}-11`, dueAt: null, description: "Закупка продуктов", createdAt: date, updatedAt: date },
      { id: 3, businessId: 1, type: "expense", amountCents: 2800000, category: "Зарплата", accountId: 1, clientId: null, status: "paid", occurredAt: `${month}-25`, dueAt: null, description: "Заработная плата", createdAt: date, updatedAt: date },
      { id: 4, businessId: 1, type: "income", amountCents: 1750000, category: "Мероприятия", accountId: 1, clientId: null, status: "planned", occurredAt: date, dueAt: date, description: "Банкет", createdAt: date, updatedAt: date },
    ],
    budgets: [{ id: 1, businessId: 1, month, type: "income", category: "Продажи", amountCents: 15000000 }, { id: 2, businessId: 1, month, type: "expense", category: "Сырьё и товары", amountCents: 6500000 }],
    categories: [
      ...incomeCategories.map((name, id) => ({ id: id + 1, businessId: 1, type: "income" as const, name, parentId: null, createdAt: date })),
      ...expenseCategories.map((name, id) => ({ id: id + 7, businessId: 1, type: "expense" as const, name, parentId: null, createdAt: date })),
    ],
  };
}

function staticSnapshot(): Snapshot {
  const saved = localStorage.getItem(staticStorageKey);
  if (saved) return JSON.parse(saved) as Snapshot;
  const initial = staticDemoSnapshot();
  localStorage.setItem(staticStorageKey, JSON.stringify(initial));
  return initial;
}

function staticMutation(method: string, body: { entity?: string; id?: number; data?: Record<string, unknown> }): Snapshot {
  const next = staticSnapshot();
  const data = body.data || {};
  if (method === "DELETE" && body.id) {
    if (body.entity === "transaction") next.transactions = next.transactions.filter(item => item.id !== body.id);
    if (body.entity === "client") next.clients = next.clients.filter(item => item.id !== body.id);
    if (body.entity === "budget") next.budgets = next.budgets.filter(item => item.id !== body.id);
    if (body.entity === "account") next.accounts = next.accounts.filter(item => item.id !== body.id);
    localStorage.setItem(staticStorageKey, JSON.stringify(next));
    return next;
  }
  if (body.entity === "business") next.business = { ...next.business, name: String(data.name || next.business.name), industry: String(data.industry || next.business.industry) };
  if (body.entity === "category" && method === "POST") next.categories.push({ id: Math.max(0, ...next.categories.map(item => item.id)) + 1, businessId: 1, type: String(data.type) as "income" | "expense", name: String(data.name), parentId: data.parentId ? Number(data.parentId) : null, createdAt: today() });
  if (body.entity === "category" && method === "PATCH" && body.id) { const item = next.categories.find(row => row.id === body.id); if (item) Object.assign(item, { name: String(data.name || item.name), parentId: data.parentId === null ? null : data.parentId ? Number(data.parentId) : item.parentId }); }
  if (body.entity === "account") next.accounts.push({ id: Math.max(0, ...next.accounts.map(item => item.id)) + 1, businessId: 1, name: String(data.name), type: String(data.type || "bank"), openingBalanceCents: Number(data.openingBalanceCents || 0), archived: false });
  if (body.entity === "client") next.clients.push({ id: Math.max(0, ...next.clients.map(item => item.id)) + 1, businessId: 1, name: String(data.name), type: String(data.type || "company"), phone: String(data.phone || ""), email: String(data.email || ""), status: "active", note: String(data.note || ""), createdAt: today() });
  if (body.entity === "transaction" && method === "POST") next.transactions.push({ id: Math.max(0, ...next.transactions.map(item => item.id)) + 1, businessId: 1, type: String(data.type) as "income" | "expense", amountCents: Number(data.amountCents), category: String(data.category), accountId: Number(data.accountId), clientId: data.clientId ? Number(data.clientId) : null, status: String(data.status || "paid") as "paid" | "planned", occurredAt: String(data.occurredAt), dueAt: data.dueAt ? String(data.dueAt) : null, description: String(data.description || ""), createdAt: today(), updatedAt: today() });
  if (body.entity === "transaction" && method === "PATCH" && body.id) { const item = next.transactions.find(row => row.id === body.id); if (item) Object.assign(item, data, { updatedAt: today() }); }
  if (body.entity === "budget") next.budgets.push({ id: Math.max(0, ...next.budgets.map(item => item.id)) + 1, businessId: 1, month: String(data.month), type: String(data.type || "expense") as "income" | "expense", category: String(data.category), amountCents: Number(data.amountCents) });
  localStorage.setItem(staticStorageKey, JSON.stringify(next));
  return next;
}

export async function requestSnapshot(method: string, body?: unknown): Promise<Snapshot> {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("github.io")) {
    return method === "GET" ? staticSnapshot() : staticMutation(method, (body || {}) as { entity?: string; id?: number; data?: Record<string, unknown> });
  }
  const response = await fetch("/api/data", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as Snapshot & { error?: string };
  if (!response.ok) throw new Error(result.error || "Не удалось сохранить данные");
  return result;
}
