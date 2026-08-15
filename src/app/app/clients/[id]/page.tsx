import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, formatDate } from "@/lib/format";
import { deleteClient } from "../actions";
import { STATUS_META } from "../../proposals/page";
import { INVOICE_STATUS_META } from "../../invoices/page";

export const metadata = { title: "Client — ClientHub" };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { lead: { include: { stage: true } } },
  });
  if (!client) notFound();

  const [proposals, invoices] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [{ clientEmail: client.email ?? "__none__" }, { leadId: client.leadId ?? "__none__" }],
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [{ clientEmail: client.email ?? "__none__" }, { proposal: { leadId: client.leadId ?? "__none__" } }],
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const total = (inv: { items: { qty: number; unitPrice: number }[] }) =>
    inv.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  const invoiced = invoices.reduce((sum, inv) => sum + total(inv), 0);
  const collected = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + total(inv), 0);

  const detailRows = [
    { label: "Email", value: client.email, href: client.email ? `mailto:${client.email}` : null },
    { label: "Phone", value: client.phone, href: client.phone ? `tel:${client.phone}` : null },
    { label: "Website", value: client.website, href: client.website ? (client.website.startsWith("http") ? client.website : `https://${client.website}`) : null },
    { label: "Address", value: client.address, href: null },
    { label: "Industry", value: client.industry, href: null },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/app/clients"
            className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            aria-label="Back to clients"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-lg font-extrabold text-white shadow-md shadow-brand-600/25">
              {client.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{client.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {client.company ?? "No company"}
                {client.lead?.stage ? ` · won from ${client.lead.stage.name}` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/app/clients/${client.id}/edit`} className="btn-secondary px-4 py-2 text-sm">
            Edit
          </Link>
          <form
            action={async () => {
              "use server";
              await deleteClient(client.id);
            }}
          >
            <button type="submit" className="btn-ghost px-4 py-2 text-sm hover:text-red-600 hover:bg-red-50">
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Financial summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoiced</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {formatMoney(invoiced, workspace.currency)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Collected</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">
            {formatMoney(collected, workspace.currency)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">paid in full</p>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">
            {formatMoney(invoiced - collected, workspace.currency)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">to collect</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Profile */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-400">
              Details
            </h2>
            <dl className="space-y-3 text-sm">
              {detailRows
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label}>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5">
                      {row.href ? (
                        <a
                          href={row.href}
                          target={row.href.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer"
                          className="break-all font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          {row.value}
                        </a>
                      ) : (
                        <span className="text-slate-700">{row.value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Client since
                </dt>
                <dd className="mt-0.5 text-slate-700">{formatDate(client.createdAt)}</dd>
              </div>
            </dl>
            {client.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{client.notes}</p>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
              Quick actions
            </h2>
            <div className="space-y-2">
              <Link
                href={`/app/proposals/new?client=${encodeURIComponent(client.name)}`}
                className="btn-secondary w-full justify-center px-4 py-2 text-sm"
              >
                + New proposal
              </Link>
              <Link
                href="/app/invoices/new"
                className="btn-secondary w-full justify-center px-4 py-2 text-sm"
              >
                + New invoice
              </Link>
            </div>
          </section>
        </div>

        {/* Documents */}
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
              Proposals ({proposals.length})
            </h2>
            {proposals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-center text-sm text-slate-400">
                No proposals for this client yet.
              </p>
            ) : (
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {proposals.map((p) => {
                  const meta = STATUS_META[p.status] ?? STATUS_META.draft;
                  return (
                    <Link
                      key={p.id}
                      href={`/app/proposals/${p.id}`}
                      className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-slate-800">{p.title}</p>
                        <p className="text-xs text-slate-400">{formatDate(p.createdAt)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.classes}`}>
                        {meta.label}
                      </span>
                      <span className="w-24 text-right font-extrabold text-slate-800">
                        {formatMoney(total(p), workspace.currency)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">
              Invoices ({invoices.length})
            </h2>
            {invoices.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-center text-sm text-slate-400">
                No invoices for this client yet.
              </p>
            ) : (
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {invoices.map((inv) => {
                  const meta = INVOICE_STATUS_META[inv.status] ?? INVOICE_STATUS_META.draft;
                  return (
                    <Link
                      key={inv.id}
                      href={`/app/invoices/${inv.id}`}
                      className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-slate-800">
                          {inv.number} — {inv.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(inv.createdAt)}
                          {inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.classes}`}>
                        {meta.label}
                      </span>
                      <span className="w-24 text-right font-extrabold text-slate-800">
                        {formatMoney(total(inv), workspace.currency)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
