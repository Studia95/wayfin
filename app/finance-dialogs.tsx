"use client";

import { useEffect, useState } from "react";
import { Landmark, UserRoundPlus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Account, Category, Client, expenseCategories, incomeCategories, today, Transaction } from "./finance-types";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-2 ${className}`}><Label>{label}</Label>{children}</div>;
}

export function TransactionDialog({ open, onOpenChange, accounts, clients, categories, initial, onSave, onCreateCategory }: {
  open: boolean; onOpenChange: (open: boolean) => void; accounts: Account[]; clients: Client[];
  categories: Category[]; initial?: Transaction | null; onSave: (data: Record<string, unknown>, id?: number) => Promise<void>;
  onCreateCategory: (type: "income" | "expense", name: string) => Promise<Category | undefined>;
}) {
  const [type, setType] = useState<"income" | "expense">(initial?.type || "expense");
  const [status, setStatus] = useState<"paid" | "planned">(initial?.status || "paid");
  const [category, setCategory] = useState(initial?.category || expenseCategories[0]);
  const [accountId, setAccountId] = useState(String(initial?.accountId || accounts[0]?.id || ""));
  const [clientId, setClientId] = useState(initial?.clientId ? String(initial.clientId) : "none");
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- dialog state is reset when opened for a different record. */
  useEffect(() => {
    if (!open) return;
    const nextType = initial?.type || "expense";
    setType(nextType);
    setStatus(initial?.status || "paid");
    setCategory(initial?.category || (nextType === "income" ? incomeCategories[0] : expenseCategories[0]));
    setAccountId(String(initial?.accountId || accounts[0]?.id || ""));
    setClientId(initial?.clientId ? String(initial.clientId) : "none");
  }, [open, initial, accounts]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function changeType(next: "income" | "expense") {
    setType(next);
    setCategory(next === "income" ? incomeCategories[0] : expenseCategories[0]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await onSave({
        type,
        amountCents: Math.round(Number(values.get("amount")) * 100),
        category,
        accountId: Number(accountId),
        clientId: clientId === "none" ? null : Number(clientId),
        status,
        occurredAt: String(values.get("occurredAt")),
        dueAt: status === "planned" ? String(values.get("dueAt") || values.get("occurredAt")) : null,
        description: String(values.get("description") || ""),
      }, initial?.id);
      onOpenChange(false);
    } finally { setSaving(false); }
  }

  const availableCategories = categories.filter(item => item.type === type).map(item => item.name);
  const fallbackCategories = type === "income" ? incomeCategories : expenseCategories;
  const categoryOptions = availableCategories.length ? availableCategories : fallbackCategories;
  async function createCategory() {
    const name = window.prompt(`Новая категория для раздела «${type === "income" ? "Доходы" : "Расходы"}»`);
    if (!name?.trim()) return;
    const created = await onCreateCategory(type, name.trim());
    if (created) setCategory(created.name);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Изменить операцию" : "Новая операция"}</DialogTitle>
          <DialogDescription>Сумма сразу попадёт в связанные отчёты и карточку клиента.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => changeType("income")} className={`h-11 rounded-lg text-sm font-semibold transition ${type === "income" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>Доход</button>
            <button type="button" onClick={() => changeType("expense")} className={`h-11 rounded-lg text-sm font-semibold transition ${type === "expense" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}>Расход</button>
          </div>
          <Field label="Сумма, ₽">
            <Input name="amount" inputMode="decimal" type="number" min="0.01" step="0.01" required autoFocus defaultValue={initial ? initial.amountCents / 100 : ""} className="h-14 text-2xl font-bold" placeholder="0" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Категория">
              <Select value={category} onValueChange={value => value === "__new__" ? void createCategory() : setCategory(value)}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{categoryOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}<SelectItem value="__new__">＋ Добавить новую категорию</SelectItem></SelectContent></Select>
            </Field>
            <Field label="Счёт">
              <Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{accounts.filter(a => !a.archived).map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Состояние">
              <Select value={status} onValueChange={(value) => setStatus(value as "paid" | "planned")}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Оплачено</SelectItem><SelectItem value="planned">Запланировано</SelectItem></SelectContent></Select>
            </Field>
            <Field label={status === "paid" ? "Дата" : "Дата оплаты"}>
              <Input name={status === "paid" ? "occurredAt" : "dueAt"} type="date" required defaultValue={status === "paid" ? (initial?.occurredAt || today()) : (initial?.dueAt || initial?.occurredAt || today())} className="h-11" />
              {status === "planned" && <input type="hidden" name="occurredAt" value={initial?.occurredAt || today()} />}
            </Field>
          </div>
          <Field label="Клиент или контрагент">
            <Select value={clientId} onValueChange={setClientId}><SelectTrigger className="h-11 w-full"><SelectValue placeholder="Без клиента" /></SelectTrigger><SelectContent><SelectItem value="none">Без клиента</SelectItem>{clients.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select>
          </Field>
          <Field label="Комментарий">
            <Textarea name="description" defaultValue={initial?.description || ""} placeholder="За что получили или заплатили" className="min-h-20" />
          </Field>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button><Button disabled={saving}>{saving ? "Сохраняю…" : "Сохранить"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClientDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (open: boolean) => void; initial?: Client | null;
  onSave: (data: Record<string, unknown>, id?: number) => Promise<void>;
}) {
  const [type, setType] = useState(initial?.type || "company");
  const [saving, setSaving] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- dialog state is reset when opened for a different record. */
  useEffect(() => { if (open) setType(initial?.type || "company"); }, [open, initial]);
  /* eslint-enable react-hooks/set-state-in-effect */
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setSaving(true);
    try { await onSave({ name: values.get("name"), type, phone: values.get("phone"), email: values.get("email"), note: values.get("note") }, initial?.id); onOpenChange(false); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><UserRoundPlus /></div><DialogTitle>{initial ? "Изменить клиента" : "Новый клиент"}</DialogTitle><DialogDescription>Контакты и все связанные оплаты будут в одной карточке.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><Field label="Имя или компания"><Input name="name" required defaultValue={initial?.name || ""} placeholder="Например, ООО Север" /></Field><Field label="Тип"><Select value={type} onValueChange={setType}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="company">Компания</SelectItem><SelectItem value="person">Частное лицо</SelectItem></SelectContent></Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Телефон"><Input name="phone" defaultValue={initial?.phone || ""} placeholder="+7…" /></Field><Field label="Почта"><Input name="email" type="email" defaultValue={initial?.email || ""} placeholder="mail@example.ru" /></Field></div><Field label="Заметка"><Textarea name="note" defaultValue={initial?.note || ""} placeholder="Условия работы, предпочтения" /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button><Button disabled={saving}>{saving ? "Сохраняю…" : "Сохранить"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function BudgetDialog({ open, onOpenChange, month, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; month: string; onSave: (data: Record<string, unknown>) => Promise<void> }) {
  const [type, setType] = useState<"income" | "expense">("expense"); const [category, setCategory] = useState(expenseCategories[0]); const [saving, setSaving] = useState(false);
  function changeType(next: "income" | "expense") { setType(next); setCategory(next === "income" ? incomeCategories[0] : expenseCategories[0]); }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); setSaving(true); try { await onSave({ month, type, category, amountCents: Math.round(Number(values.get("amount")) * 100) }); onOpenChange(false); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><WalletCards /></div><DialogTitle>Добавить план</DialogTitle><DialogDescription>План сравнивается с фактическими операциями этой категории.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => changeType("income")} className={`h-10 rounded-lg text-sm font-semibold ${type === "income" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>Доход</button><button type="button" onClick={() => changeType("expense")} className={`h-10 rounded-lg text-sm font-semibold ${type === "expense" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}>Расход</button></div><Field label="Категория"><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{(type === "income" ? incomeCategories : expenseCategories).map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Плановая сумма, ₽"><Input name="amount" type="number" min="1" step="1" required /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button><Button disabled={saving}>{saving ? "Сохраняю…" : "Добавить"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function AccountDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (data: Record<string, unknown>) => Promise<void> }) {
  const [type, setType] = useState("bank"); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const values = new FormData(event.currentTarget); setSaving(true); try { await onSave({ name: values.get("name"), type, openingBalanceCents: Math.round(Number(values.get("balance") || 0) * 100) }); onOpenChange(false); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Landmark /></div><DialogTitle>Новый счёт</DialogTitle><DialogDescription>Касса, банковский счёт или карта бизнеса.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><Field label="Название"><Input name="name" required placeholder="Основной счёт" /></Field><Field label="Тип"><Select value={type} onValueChange={setType}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank">Банковский счёт</SelectItem><SelectItem value="cash">Касса</SelectItem><SelectItem value="card">Карта</SelectItem></SelectContent></Select></Field><Field label="Начальный остаток, ₽"><Input name="balance" type="number" step="0.01" defaultValue="0" /></Field><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button><Button disabled={saving}>{saving ? "Сохраняю…" : "Добавить"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
