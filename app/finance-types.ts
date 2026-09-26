export type Business = { id: number; name: string; industry: string; currency: string };
export type Account = { id: number; businessId: number; name: string; type: string; openingBalanceCents: number; archived: boolean };
export type Client = { id: number; businessId: number; name: string; type: string; phone: string; email: string; status: string; note: string; createdAt: string };
export type Transaction = { id: number; businessId: number; type: "income" | "expense"; amountCents: number; category: string; accountId: number; clientId: number | null; status: "paid" | "planned"; occurredAt: string; dueAt: string | null; description: string; createdAt: string; updatedAt: string };
export type Budget = { id: number; businessId: number; month: string; type: "income" | "expense"; category: string; amountCents: number };
export type Snapshot = { business: Business; accounts: Account[]; clients: Client[]; transactions: Transaction[]; budgets: Budget[] };
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

export async function requestSnapshot(method: string, body?: unknown): Promise<Snapshot> {
  const response = await fetch("/api/data", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as Snapshot & { error?: string };
  if (!response.ok) throw new Error(result.error || "Не удалось сохранить данные");
  return result;
}
