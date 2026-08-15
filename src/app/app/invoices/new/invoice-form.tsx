"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { createInvoice } from "../actions";
import { formatMoney } from "@/lib/format";

type ProposalOption = {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  items: { description: string; qty: number; unitPrice: number }[];
};

const emptyItem = { description: "", qty: 1, unitPrice: 0 };

export function InvoiceForm({
  proposals,
  preselectProposalId,
  currency = "USD",
}: {
  proposals: ProposalOption[];
  preselectProposalId: string | null;
  currency?: string;
}) {
  const [state, action, pending] = useActionState(createInvoice, undefined);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [title, setTitle] = useState("");
  const [proposalId, setProposalId] = useState(preselectProposalId ?? "");

  const total = items.reduce((sum, item) => sum + item.qty * (Number(item.unitPrice) || 0), 0);

  // Pre-fill from a selected approved proposal.
  useEffect(() => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;
    setTitle(proposal.title);
    setClientName(proposal.clientName);
    setClientEmail(proposal.clientEmail);
    setItems(
      proposal.items.length
        ? proposal.items.map((item) => ({
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
          }))
        : [{ ...emptyItem }]
    );
  }, [proposalId, proposals]);

  function updateItem(index: number, patch: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function moveItem(from: number, to: number) {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">
              From approved proposal (optional)
            </label>
            <select
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              className="input"
            >
              <option value="">Standalone invoice</option>
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.clientName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Selecting a proposal copies its client and line items in.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              Invoice title *
            </label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Website redesign — Phase 1"
              className="input"
            />
          </div>
          <div>
            <label className="label">
              Client name *
            </label>
            <input
              name="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="Jane Doe"
              className="input"
            />
          </div>
          <div>
            <label className="label">
              Client email *
            </label>
            <input
              name="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
              placeholder="jane@acme.com"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              Payment due date
            </label>
            <input
              name="dueDate"
              type="date"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">
              Note (optional)
            </label>
            <textarea
              name="intro"
              rows={2}
              placeholder="Payment details, thank-you note, or terms…"
              className="input"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Line items
        </h2>
        <div className="space-y-3">
          <div className="hidden grid-cols-[1fr_5rem_7rem_2.5rem] gap-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400 sm:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span />
          </div>
          {items.map((item, index) => (
            <div
              key={index}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  moveItem(dragIndex, index);
                }
                setDragIndex(null);
              }}
              className={`grid grid-cols-2 items-end gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition sm:grid-cols-[2rem_1fr_5rem_7rem_2.5rem] sm:border-0 sm:bg-transparent sm:p-0 ${
                dragIndex === index ? "ring-2 ring-brand-300" : ""
              }`}
            >
              <span
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragIndex(null)}
                className="mb-1 hidden cursor-grab select-none justify-center text-slate-300 transition hover:text-slate-500 active:cursor-grabbing sm:flex"
                title="Drag to reorder"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
                  <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
                  <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
                </svg>
              </span>
              <input
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                placeholder="e.g. Homepage design"
                className="input col-span-2 sm:col-span-1"
              />
              <input
                value={item.qty}
                onChange={(e) => updateItem(index, { qty: Number(e.target.value) || 0 })}
                type="number"
                min={1}
                aria-label="Quantity"
                className="input"
              />
              <input
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                aria-label="Unit price"
                className="input"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                className="col-span-2 grid size-9 place-items-center justify-self-end rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40 sm:col-span-1"
                aria-label="Remove item"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 7h12M9 7V5h6v2m-8 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/50"
        >
          + Add item
        </button>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 to-brand-50/40 px-5 py-4 ring-1 ring-slate-100">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-400">Total</span>
          <span className="text-2xl font-extrabold text-slate-900">{formatMoney(total, currency)}</span>
        </div>
      </section>

      <input
        type="hidden"
        name="proposalId"
        value={proposalId || ""}
      />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((item) => ({
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
          }))
        )}
      />

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/app/invoices"
          className="btn-ghost px-4 py-2"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-5 py-2"
        >
          {pending ? "Creating…" : "Create invoice"}
        </button>
      </div>
    </form>
  );
}
