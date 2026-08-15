import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, formatDate } from "@/lib/format";

export const metadata = { title: "Invoices — ClientHub" };

export const INVOICE_STATUS_META: Record<string, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", classes: "bg-sky-100 text-sky-700" },
  overdue: { label: "Overdue", classes: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", classes: "bg-emerald-100 text-emerald-700" },
};

export const TABS = ["all", "draft", "sent", "overdue", "paid"] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { tab } = await searchParams;
  const activeTab = (TABS as readonly string[]).includes(tab ?? "") ? tab! : "all";

  const invoices = await prisma.invoice.findMany({
    where: {
      workspaceId: workspace.id,
      ...(activeTab !== "all" ? { status: activeTab } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  const rows = invoices.map((inv) => ({
    ...inv,
    total: inv.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
  }));

  const allInvoices = await prisma.invoice.findMany({
    where: { workspaceId: workspace.id },
    include: { items: true },
  });
  const outstanding = allInvoices
    .filter((inv) => inv.status !== "paid")
    .reduce(
      (sum, inv) =>
        sum + inv.items.reduce((s, item) => s + item.qty * item.unitPrice, 0),
      0
    );

  const counts: Record<string, number> = { all: allInvoices.length };
  for (const inv of allInvoices) {
    counts[inv.status] = (counts[inv.status] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bill for approved work and track what&apos;s been paid.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Outstanding balance
            </p>
            <p className="mt-1 text-xl font-extrabold text-amber-600">
              {formatMoney(outstanding)}
            </p>
          </div>
          <Link
            href="/app/invoices/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            + New invoice
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={t === "all" ? "/app/invoices" : `/app/invoices?tab=${t}`}
            className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize transition ${
              activeTab === t
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {t} ({counts[t] ?? 0})
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-16 text-center">
          <p className="font-extrabold text-slate-700">No {activeTab !== "all" ? activeTab : ""} invoices yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Create an invoice from an approved proposal and mark it paid when the money lands.
          </p>
          <Link
            href="/app/invoices/new"
            className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            + New invoice
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((inv) => {
                const meta = INVOICE_STATUS_META[inv.status] ?? INVOICE_STATUS_META.draft;
                return (
                  <tr key={inv.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/app/invoices/${inv.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600"
                      >
                        {inv.number} — {inv.title}
                      </Link>
                      <p className="text-xs text-slate-400">
                        {inv.items.length} line item{inv.items.length === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700">{inv.clientName}</p>
                      <p className="text-xs text-slate-400">{inv.clientEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.classes}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                      {formatMoney(inv.total)}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/app/invoices/${inv.id}`}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
