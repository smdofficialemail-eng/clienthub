import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, formatDate } from "@/lib/format";
import { INVOICE_STATUS_META } from "../page";
import { markInvoiceSent, markInvoicePaid, emailInvoice, deleteInvoice } from "../actions";
import { InvoiceControls } from "./controls";

export const metadata = { title: "Invoice — ClientHub" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      proposal: { select: { id: true, title: true, status: true } },
    },
  });
  if (!invoice) notFound();

  const total = invoice.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const meta = INVOICE_STATUS_META[invoice.status] ?? INVOICE_STATUS_META.draft;
  const canSend = invoice.status === "draft";
  const canMarkPaid = invoice.status !== "paid";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/app/invoices"
            className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            aria-label="Back to invoices"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {invoice.number} — {invoice.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {invoice.clientName} · {invoice.clientEmail}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${meta.classes}`}>
          {meta.label}
        </span>
      </div>

      <InvoiceControls
        invoiceId={invoice.id}
        status={invoice.status}
        canSend={canSend}
        canMarkPaid={canMarkPaid}
        sendAction={markInvoiceSent}
        emailAction={emailInvoice}
        markPaidAction={markInvoicePaid}
        deleteAction={deleteInvoice}
      />

      {invoice.proposal && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-400">From proposal:</span>
          <Link
            href={`/app/proposals/${invoice.proposal.id}`}
            className="font-bold text-indigo-600 hover:text-indigo-700"
          >
            {invoice.proposal.title}
          </Link>
        </div>
      )}

      {/* Document preview */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-lg font-extrabold text-white">
                {workspace.name.charAt(0).toUpperCase()}
              </span>
              <p className="truncate font-extrabold text-slate-900">{workspace.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-extrabold text-slate-900">{invoice.number}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Invoice · {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="px-5 py-8 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Billed to</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">{invoice.clientName}</h2>
          <p className="text-sm text-slate-500">{invoice.clientEmail}</p>

          {invoice.dueDate && (
            <p className="mt-4 inline-block rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
              Due {formatDate(invoice.dueDate)}
            </p>
          )}

          {invoice.intro && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {invoice.intro}
            </p>
          )}

          <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Item</th>
                <th className="w-16 py-2 text-right">Qty</th>
                <th className="w-28 py-2 text-right">Unit price</th>
                <th className="w-28 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4 font-semibold text-slate-800">{item.description}</td>
                  <td className="py-3 text-right text-slate-500">{item.qty}</td>
                  <td className="py-3 text-right text-slate-500">{formatMoney(item.unitPrice, workspace.currency)}</td>
                  <td className="py-3 text-right font-bold text-slate-800">
                    {formatMoney(item.qty * item.unitPrice, workspace.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} className="py-4 text-right text-sm font-bold uppercase tracking-wide text-slate-500">
                  Total
                </td>
                <td className="py-4 text-right text-xl font-extrabold text-slate-900">
                  {formatMoney(total, workspace.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>

          {invoice.status === "paid" && invoice.paidAt && (
            <div className="mt-8 rounded-xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
              ✓ Paid in full on {formatDate(invoice.paidAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
