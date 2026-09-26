import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, budgets, businesses, categories, clients, transactions } from "@/db/schema";

type Entity = "transaction" | "client" | "budget" | "account" | "business" | "category";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Неизвестная ошибка";
  return message.includes("no such table")
    ? "База данных ещё не подготовлена. Обновите страницу через минуту."
    : message;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

async function seedDemoData() {
  const db = getDb();
  const existing = await db.select({ id: businesses.id }).from(businesses).limit(1);
  const defaultCategories = [
    ...["Продажи", "Доставка", "Кейтеринг", "Мероприятия", "Услуги", "Прочие доходы"].map(name => ({ businessId: 1, type: "income", name })),
    ...["Сырьё и товары", "Зарплата", "Аренда", "Маркетинг", "Коммунальные", "Транспорт", "Налоги", "Прочие расходы"].map(name => ({ businessId: 1, type: "expense", name })),
  ];
  if (existing.length) {
    const categoryCount = await db.select({ id: categories.id }).from(categories).limit(1);
    if (!categoryCount.length) await db.insert(categories).values(defaultCategories);
    return;
  }

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const d = (offset: number) => isoDate(new Date(now.getTime() + offset * day));
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 10));
    return monthKey(date);
  });

  const demoTransactions = [
    ...months.flatMap((month, index) => {
      const growth = index * 180000;
      return [
        { businessId: 1, type: "income", amountCents: 13200000 + growth, category: "Продажи", accountId: 2, status: "paid", occurredAt: `${month}-08`, description: "Продажи в зале" },
        { businessId: 1, type: "income", amountCents: 4100000 + growth / 2, category: "Доставка", accountId: 1, clientId: 1, status: "paid", occurredAt: `${month}-16`, description: "Корпоративные заказы" },
        { businessId: 1, type: "expense", amountCents: 5900000 + index * 90000, category: "Сырьё и товары", accountId: 1, status: "paid", occurredAt: `${month}-11`, description: "Закупка продуктов" },
        { businessId: 1, type: "expense", amountCents: 2800000, category: "Зарплата", accountId: 1, status: "paid", occurredAt: `${month}-25`, description: "Заработная плата" },
        { businessId: 1, type: "expense", amountCents: 950000, category: "Аренда", accountId: 1, status: "paid", occurredAt: `${month}-03`, description: "Аренда помещения" },
      ];
    }),
    { businessId: 1, type: "income", amountCents: 860000, category: "Кейтеринг", accountId: 1, clientId: 3, status: "paid", occurredAt: d(-8), description: "Пятничный кейтеринг" },
    { businessId: 1, type: "income", amountCents: 1750000, category: "Мероприятия", accountId: 1, clientId: 2, status: "planned", occurredAt: d(9), dueAt: d(9), description: "Банкет на 35 человек" },
    { businessId: 1, type: "income", amountCents: 920000, category: "Доставка", accountId: 1, clientId: 1, status: "planned", occurredAt: d(14), dueAt: d(14), description: "Корпоративные обеды" },
    { businessId: 1, type: "expense", amountCents: 780000, category: "Сырьё и товары", accountId: 1, status: "planned", occurredAt: d(5), dueAt: d(5), description: "Поставка молока и кофе" },
    { businessId: 1, type: "expense", amountCents: 430000, category: "Маркетинг", accountId: 3, status: "paid", occurredAt: d(-3), description: "Реклама в социальных сетях" },
    { businessId: 1, type: "expense", amountCents: 215000, category: "Коммунальные", accountId: 1, status: "paid", occurredAt: d(-5), description: "Электричество и вода" },
    { businessId: 1, type: "income", amountCents: 680000, category: "Продажи", accountId: 2, clientId: 4, status: "paid", occurredAt: d(-1), description: "Заказ навынос" },
  ];

  await db.batch([
    db.insert(businesses).values({ id: 1, name: "Кофейня Мята", industry: "Кафе и рестораны" }),
    db.insert(categories).values(defaultCategories),
    db.insert(accounts).values([
      { id: 1, businessId: 1, name: "Расчётный счёт", type: "bank", openingBalanceCents: 18500000 },
      { id: 2, businessId: 1, name: "Касса", type: "cash", openingBalanceCents: 4200000 },
      { id: 3, businessId: 1, name: "Карта бизнеса", type: "card", openingBalanceCents: 1600000 },
    ]),
    db.insert(clients).values([
      { id: 1, businessId: 1, name: "ООО Север", type: "company", phone: "+7 928 000-11-22", email: "zakaz@sever.ru", note: "Корпоративные обеды" },
      { id: 2, businessId: 1, name: "Амина Исмаилова", type: "person", phone: "+7 988 210-45-70", email: "", note: "Заказы на мероприятия" },
      { id: 3, businessId: 1, name: "БЦ Грозный Сити", type: "company", phone: "+7 928 340-19-10", email: "office@groznycity.ru", note: "Кейтеринг по пятницам" },
      { id: 4, businessId: 1, name: "ИП Дадаев", type: "company", phone: "+7 938 000-81-44", email: "", note: "Постоянный клиент" },
    ]),
    db.insert(transactions).values(demoTransactions.slice(0, 5)),
    db.insert(transactions).values(demoTransactions.slice(5, 10)),
    db.insert(transactions).values(demoTransactions.slice(10, 15)),
    db.insert(transactions).values(demoTransactions.slice(15, 20)),
    db.insert(transactions).values(demoTransactions.slice(20, 25)),
    db.insert(transactions).values(demoTransactions.slice(25, 30)),
    db.insert(transactions).values(demoTransactions.slice(30, 35)),
    db.insert(transactions).values(demoTransactions.slice(35)),
    db.insert(budgets).values([
      { businessId: 1, month: monthKey(now), type: "income", category: "Продажи", amountCents: 15000000 },
      { businessId: 1, month: monthKey(now), type: "income", category: "Доставка", amountCents: 5200000 },
      { businessId: 1, month: monthKey(now), type: "income", category: "Кейтеринг", amountCents: 1800000 },
      { businessId: 1, month: monthKey(now), type: "expense", category: "Сырьё и товары", amountCents: 6500000 },
      { businessId: 1, month: monthKey(now), type: "expense", category: "Зарплата", amountCents: 3000000 },
      { businessId: 1, month: monthKey(now), type: "expense", category: "Аренда", amountCents: 950000 },
      { businessId: 1, month: monthKey(now), type: "expense", category: "Маркетинг", amountCents: 600000 },
    ]),
  ]);
}

async function snapshot() {
  const db = getDb();
  await seedDemoData();
  const [businessRows, accountRows, clientRows, transactionRows, budgetRows, categoryRows] = await Promise.all([
    db.select().from(businesses).orderBy(asc(businesses.id)),
    db.select().from(accounts).orderBy(asc(accounts.id)),
    db.select().from(clients).orderBy(asc(clients.name)),
    db.select().from(transactions).orderBy(desc(transactions.occurredAt), desc(transactions.id)),
    db.select().from(budgets).orderBy(desc(budgets.month), asc(budgets.category)),
    db.select().from(categories).orderBy(asc(categories.type), asc(categories.name)),
  ]);
  return { business: businessRows[0], accounts: accountRows, clients: clientRows, transactions: transactionRows, budgets: budgetRows, categories: categoryRows };
}

export async function GET() {
  try {
    return Response.json(await snapshot());
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { entity, data } = (await request.json()) as { entity?: Entity; data?: Record<string, unknown> };
    if (!entity || !data) return Response.json({ error: "Не хватает данных" }, { status: 400 });
    const db = getDb();
    if (entity === "transaction") {
      const amountCents = Number(data.amountCents);
      if (!Number.isInteger(amountCents) || amountCents <= 0 || !data.type || !data.category || !data.accountId || !data.occurredAt) {
        return Response.json({ error: "Проверьте сумму, дату, категорию и счёт" }, { status: 400 });
      }
      await db.insert(transactions).values({
        businessId: 1, type: String(data.type), amountCents, category: String(data.category), accountId: Number(data.accountId),
        clientId: data.clientId ? Number(data.clientId) : null, status: String(data.status || "paid"), occurredAt: String(data.occurredAt),
        dueAt: data.dueAt ? String(data.dueAt) : null, description: String(data.description || ""), updatedAt: new Date().toISOString(),
      });
    } else if (entity === "client") {
      if (!String(data.name || "").trim()) return Response.json({ error: "Укажите имя клиента" }, { status: 400 });
      await db.insert(clients).values({ businessId: 1, name: String(data.name).trim(), type: String(data.type || "company"), phone: String(data.phone || ""), email: String(data.email || ""), note: String(data.note || "") });
    } else if (entity === "budget") {
      const amountCents = Number(data.amountCents);
      if (!data.month || !data.category || !Number.isInteger(amountCents) || amountCents <= 0) return Response.json({ error: "Проверьте план" }, { status: 400 });
      await db.insert(budgets).values({ businessId: 1, month: String(data.month), type: String(data.type || "expense"), category: String(data.category), amountCents });
    } else if (entity === "account") {
      if (!String(data.name || "").trim()) return Response.json({ error: "Укажите название счёта" }, { status: 400 });
      await db.insert(accounts).values({ businessId: 1, name: String(data.name).trim(), type: String(data.type || "bank"), openingBalanceCents: Number(data.openingBalanceCents || 0) });
    } else if (entity === "category") {
      const name = String(data.name || "").trim();
      if (!name || !["income", "expense"].includes(String(data.type))) return Response.json({ error: "Укажите название и тип категории" }, { status: 400 });
      const duplicate = await db.select({ id: categories.id }).from(categories).where(eq(categories.name, name)).limit(1);
      if (duplicate.length) return Response.json({ error: "Такая категория уже есть" }, { status: 409 });
      await db.insert(categories).values({ businessId: 1, type: String(data.type), name });
    }
    return Response.json(await snapshot(), { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { entity, id, data } = (await request.json()) as { entity?: Entity; id?: number; data?: Record<string, unknown> };
    if (!entity || !id || !data) return Response.json({ error: "Не хватает данных" }, { status: 400 });
    const db = getDb();
    if (entity === "transaction") {
      await db.update(transactions).set({
        type: data.type ? String(data.type) : undefined, amountCents: data.amountCents ? Number(data.amountCents) : undefined,
        category: data.category ? String(data.category) : undefined, accountId: data.accountId ? Number(data.accountId) : undefined,
        clientId: data.clientId === null || data.clientId === "" ? null : data.clientId ? Number(data.clientId) : undefined,
        status: data.status ? String(data.status) : undefined, occurredAt: data.occurredAt ? String(data.occurredAt) : undefined,
        dueAt: data.dueAt === "" ? null : data.dueAt ? String(data.dueAt) : undefined, description: data.description !== undefined ? String(data.description) : undefined,
        updatedAt: new Date().toISOString(),
      }).where(eq(transactions.id, id));
    } else if (entity === "client") {
      await db.update(clients).set({ name: data.name ? String(data.name).trim() : undefined, type: data.type ? String(data.type) : undefined, phone: data.phone !== undefined ? String(data.phone) : undefined, email: data.email !== undefined ? String(data.email) : undefined, note: data.note !== undefined ? String(data.note) : undefined, status: data.status ? String(data.status) : undefined }).where(eq(clients.id, id));
    } else if (entity === "budget") {
      await db.update(budgets).set({ month: data.month ? String(data.month) : undefined, type: data.type ? String(data.type) : undefined, category: data.category ? String(data.category) : undefined, amountCents: data.amountCents ? Number(data.amountCents) : undefined }).where(eq(budgets.id, id));
    } else if (entity === "account") {
      await db.update(accounts).set({ name: data.name ? String(data.name).trim() : undefined, type: data.type ? String(data.type) : undefined, openingBalanceCents: data.openingBalanceCents !== undefined ? Number(data.openingBalanceCents) : undefined, archived: data.archived !== undefined ? Boolean(data.archived) : undefined }).where(eq(accounts.id, id));
    } else if (entity === "business") {
      await db.update(businesses).set({ name: data.name ? String(data.name).trim() : undefined, industry: data.industry ? String(data.industry) : undefined }).where(eq(businesses.id, id));
    }
    return Response.json(await snapshot());
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { entity, id } = (await request.json()) as { entity?: "transaction" | "client" | "budget" | "account"; id?: number };
    if (!entity || !id) return Response.json({ error: "Не хватает данных" }, { status: 400 });
    const db = getDb();
    if (entity === "transaction") await db.delete(transactions).where(eq(transactions.id, id));
    if (entity === "client") await db.delete(clients).where(eq(clients.id, id));
    if (entity === "budget") await db.delete(budgets).where(eq(budgets.id, id));
    if (entity === "account") await db.delete(accounts).where(eq(accounts.id, id));
    return Response.json(await snapshot());
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
