import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, formatDate } from "@/lib/format";

export const metadata = { title: "Proposals — ClientHub" };

export const STATUS_META: Record<string, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", classes: "bg-sky-100 text-sky-700" },
  viewed: { label: "Viewed", classes: "bg-violet-100 text-violet-700" },
  approved: { label: "Approved", classes: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", classes: "bg-red-100 text-red-700" },
};

export const TABS = ["all", "draft", "sent", "viewed", "approved", "declined"] as const;

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { tab } = await searchParams;
  const activeTab = (TABS as readonly string[]).includes(tab ?? "") ? tab! : "all";

  const proposals = await prisma.proposal.findMany({
    where: {
      workspaceId: workspace.id,
      ...(activeTab !== "all" ? { status: activeTab } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  const totals = proposals.map((p) => ({
    ...p,
    total: p.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
  }));

  const allCounts = await prisma.proposal.groupBy({
    by: ["status"],
    where: { workspaceId: workspace.id },
    _count: { _all: true },
  });
  const counts: Record<string, number> = { all: 0 };
  for (const row of allCounts) {
    counts[row.status] = row._count._all;
    counts.all += row._count._all;
  }

  const approvedTotal = totals
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Proposals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quotes and proposals your clients can view and sign online.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Approved value
            </p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">
              {formatMoney(approvedTotal, workspace.currency)}
            </p>
          </div>
          <Link href="/app/proposals/new" className="btn-primary px-4 py-2">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
            </svg>
            New proposal
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={t === "all" ? "/app/proposals" : `/app/proposals?tab=${t}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-all ${
              activeTab === t
                ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/25"
                : "bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {t} {counts[t] !== undefined && `(${counts[t]})`}
          </Link>
        ))}
      </div>

      {totals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-16 text-center">
          <p className="font-extrabold text-slate-700">No {activeTab !== "all" ? activeTab : ""} proposals yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Create a proposal from a lead and send it a link to view and approve.
          </p>
          <Link href="/app/proposals/new" className="btn-primary mt-5 px-4 py-2">
            New proposal
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="pro-table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80">
                <th>Proposal</th>
                <th>Client</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {totals.map((p) => {
                const meta = STATUS_META[p.status] ?? STATUS_META.draft;
                return (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link href={`/app/proposals/${p.id}`} className="font-bold text-slate-900 hover:text-indigo-600">
                        {p.title}
                      </Link>
                      <p className="text-xs text-slate-400">{p.items.length} line item{p.items.length === 1 ? "" : "s"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700">{p.clientName}</p>
                      <p className="text-xs text-slate-400">{p.clientEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.classes}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                      {formatMoney(p.total, workspace.currency)}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(p.updatedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/app/proposals/${p.id}`}
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
        </div>
      )}
    </div>
  );
}
