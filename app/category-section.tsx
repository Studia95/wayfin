"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category } from "./finance-types";

type Editor = { mode: "create" | "edit"; type: "income" | "expense"; parentId: number | null; category?: Category };

export function CategorySection({ title, type, items, onCreate, onUpdate }: {
  title: string;
  type: "income" | "expense";
  items: Category[];
  onCreate: (type: "income" | "expense", name: string, parentId: number | null) => Promise<Category | undefined>;
  onUpdate: (id: number, data: Record<string, unknown>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editor, setEditor] = useState<Editor | null>(null);
  const [name, setName] = useState("");
  const roots = items.filter(item => !item.parentId);
  const childrenOf = (id: number) => items.filter(item => item.parentId === id);
  const openCreate = (parentId: number | null = null) => { setName(""); setEditor({ mode: "create", type, parentId }); };
  const openEdit = (category: Category) => { setName(category.name); setEditor({ mode: "edit", type, parentId: category.parentId, category }); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value || !editor) return;
    if (editor.mode === "edit" && editor.category) await onUpdate(editor.category.id, { name: value });
    else await onCreate(type, value, editor.parentId);
    setEditor(null);
  };
  const row = (item: Category, depth = 0): React.ReactNode => {
    const children = childrenOf(item.id);
    const isExpanded = expanded.has(item.id);
    return <div key={item.id}>
      <div className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-blue-300 ${depth ? "ml-5 border-dashed bg-slate-50" : ""}`} onClick={() => children.length && setExpanded(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}>
        <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-medium text-slate-800">{item.name}</span>{children.length > 0 && <span className="shrink-0 text-xs text-slate-400">{children.length} подкатег.</span>}</div>
        <div className="flex shrink-0 items-center gap-1"><Button size="icon-xs" variant="ghost" aria-label={`Редактировать ${item.name}`} onClick={event => { event.stopPropagation(); openEdit(item); }}><Pencil /></Button><Button size="icon-xs" variant="ghost" aria-label={`Добавить подкатегорию к ${item.name}`} onClick={event => { event.stopPropagation(); openCreate(item.id); }}><Plus /></Button>{children.length > 0 && <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`} />}</div>
      </div>
      {isExpanded && <div className="mt-2 space-y-2">{children.map(child => row(child, depth + 1))}</div>}
    </div>;
  };
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-medium">{title}</h4><Button size="sm" variant="outline" onClick={() => openCreate()}><Plus />Добавить</Button></div><div className="mt-3 space-y-2">{roots.length ? roots.map(item => row(item)) : <p className="text-sm text-slate-500">Категорий пока нет</p>}</div>{editor && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center"><form role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h3 id="category-dialog-title" className="text-lg font-semibold">{editor.mode === "edit" ? "Редактировать категорию" : editor.parentId ? "Добавить подкатегорию" : "Новая категория"}</h3><p className="mt-1 text-sm text-slate-500">{editor.parentId ? `Вложенная категория в разделе «${items.find(item => item.id === editor.parentId)?.name || "категория"}»` : title}</p></div><Button type="button" size="icon-sm" variant="ghost" aria-label="Закрыть" onClick={() => setEditor(null)}><X /></Button></div><label className="mt-5 grid gap-2 text-sm font-medium">Название<Input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Например, Бухгалтер" /></label><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditor(null)}>Отмена</Button><Button type="submit" disabled={!name.trim()}>Сохранить</Button></div></form></div>}</div>;
}
