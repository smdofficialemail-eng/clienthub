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
}: {
  proposals: ProposalOption[];
  preselectProposalId: string | null;
}) {
  const [state, action, pending] = useActionState(createInvoice, undefined);
  const [items, setItems] = useState([{ ...emptyItem }]);
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
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              From approved proposal (optional)
            </label>
            <select
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
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
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Invoice title *
            </label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Website redesign — Phase 1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Client name *
            </label>
            <input
              name="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Client email *
            </label>
            <input
              name="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
              placeholder="jane@acme.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Payment due date
            </label>
            <input
              name="dueDate"
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Note (optional)
            </label>
            <textarea
              name="intro"
              rows={2}
              placeholder="Payment details, thank-you note, or terms…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Line items
        </h2>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_5rem_7rem_2.5rem] gap-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400 sm:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span />
          </div>
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_5rem_7rem_2.5rem] items-center gap-2"
            >
              <input
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                placeholder="e.g. Homepage design"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <input
                value={item.qty}
                onChange={(e) => updateItem(index, { qty: Number(e.target.value) || 0 })}
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <input
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                className="grid size-9 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
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
          className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          + Add item
        </button>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-400">Total</span>
          <span className="text-2xl font-extrabold text-slate-900">{formatMoney(total)}</span>
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
          className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create invoice"}
        </button>
      </div>
    </form>
  );
}
