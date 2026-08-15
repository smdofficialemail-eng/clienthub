import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, timeAgo } from "@/lib/format";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();

  const [
    leadCount,
    valueAgg,
    clientCount,
    invoiceCount,
    taskCount,
    appointmentCount,
    recentLeads,
    recentActivities,
    pipeline,
    recentProposals,
    recentInvoices,
  ] = await Promise.all([
    prisma.lead.count({ where: { workspaceId: workspace.id, status: "active" } }),
    prisma.lead.aggregate({
      where: { workspaceId: workspace.id, status: "active" },
      _sum: { value: true },
    }),
    prisma.client.count({ where: { workspaceId: workspace.id } }),
    prisma.invoice.count({ where: { workspaceId: workspace.id } }),
    prisma.task.count({ where: { workspaceId: workspace.id, done: false } }),
    prisma.appointment.count({
      where: { workspaceId: workspace.id, status: "scheduled", startsAt: { gte: new Date() } },
    }),
    prisma.lead.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { stage: true },
    }),
    prisma.activity.findMany({
      where: { lead: { workspaceId: workspace.id } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { lead: true, user: true },
    }),
    prisma.pipeline.findFirst({
      where: { workspaceId: workspace.id },
      include: { stages: { orderBy: { position: "asc" }, include: { leads: true } } },
    }),
    prisma.proposal.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { items: true },
    }),
    prisma.invoice.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { items: true },
    }),
  ]);

  const invoiceTotal = (inv: { items: { qty: number; unitPrice: number }[] }) =>
    inv.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const [invoices, paidInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { workspaceId: workspace.id },
      include: { items: true },
    }),
    prisma.invoice.findMany({
      where: { workspaceId: workspace.id, status: "paid" },
      include: { items: true },
    }),
  ]);
  const outstanding = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + invoiceTotal(inv), 0);
  const collected = paidInvoices.reduce((sum, inv) => sum + invoiceTotal(inv), 0);

  const stats = [
    {
      label: "Open leads",
      value: String(leadCount),
      href: "/app/pipeline",
      chip: "bg-brand-50 text-brand-600",
      icon: "M9 12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h5zm10 0a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h5zM9 3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5zm10 0a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5z",
      sub: "in your pipeline",
    },
    {
      label: "Pipeline value",
      value: formatMoney(valueAgg._sum.value ?? 0, workspace.currency),
      href: "/app/pipeline",
      chip: "bg-sky-50 text-sky-600",
      icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15.9V19h-2v-1.1a5 5 0 0 1-3.4-2.2l1.7-1.2a3.4 3.4 0 0 0 5-1.1 1.9 1.9 0 0 0-1.6-2.9c-.5 0-1 .1-1.5.4a5.2 5.2 0 0 1-2.7.6 3.3 3.3 0 0 1-2.9-4.7 5 5 0 0 1 3.4-2.2V5h2v1.1a5 5 0 0 1 3.4 2.2l-1.7 1.2a3.4 3.4 0 0 0-5 1.1A1.9 1.9 0 0 0 9.3 13c.5 0 1-.1 1.5-.4a5.2 5.2 0 0 1 2.7-.6 3.3 3.3 0 0 1 2.9 4.7 5 5 0 0 1-3.4 2.2z",
      sub: "active deals",
    },
    {
      label: "Clients",
      value: String(clientCount),
      href: "/app/clients",
      chip: "bg-violet-50 text-violet-600",
      icon: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z",
      sub: "converted",
    },
    {
      label: "Invoices",
      value: String(invoiceCount),
      href: "/app/invoices",
      chip: "bg-slate-100 text-slate-600",
      icon: "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 3v2h10V7H7zm0 4v2h6v-2H7zm0 4v2h8v-2H7z",
      sub: "issued",
    },
    {
      label: "Collected",
      value: formatMoney(collected, workspace.currency),
      href: "/app/invoices",
      chip: "bg-emerald-50 text-emerald-600",
      icon: "M9 12l2 2 4-4m5.6-1.6A10 10 0 1 1 5.4 5.4 10 10 0 0 1 18.6 4.4z",
      sub: "paid in full",
    },
    {
      label: "Outstanding",
      value: formatMoney(outstanding, workspace.currency),
      href: "/app/invoices",
      chip: "bg-amber-50 text-amber-600",
      icon: "M13 7V5a1 1 0 0 0-2 0v2a1 1 0 0 0 2 0zm1 6.2a3 3 0 1 0-4 0V16a2 2 0 1 0 4 0v-2.8zM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
      sub: "to collect",
    },
  ];

  const stageBreakdown =
    pipeline?.stages.map((stage) => ({
      name: stage.name,
      color: stage.color,
      count: stage.leads.length,
      value: stage.leads.reduce((sum, lead) => sum + lead.value, 0),
    })) ?? [];
  const maxStageCount = Math.max(1, ...stageBreakdown.map((s) => s.count));

  const ACTIVITY_META: Record<string, { label: string; cls: string; icon: string }> = {
    note: { label: "Note", cls: "bg-slate-100 text-slate-600", icon: "M12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 20c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1z" },
    call: { label: "Call", cls: "bg-emerald-50 text-emerald-600", icon: "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1l-2.23 2.2z" },
    email: { label: "Email", cls: "bg-sky-50 text-sky-600", icon: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 9 9-6V6l-9 6-9-6v1l9 6z" },
    meeting: { label: "Meeting", cls: "bg-violet-50 text-violet-600", icon: "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11zM7 11h5v5H7v-5z" },
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{workspace.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s what&apos;s happening across your business.
          </p>
        </div>
        <Link href="/app/pipeline" className="btn-primary px-4 py-2">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
          </svg>
          New lead
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card card-hover group p-5"
          >
            <div className="flex items-start justify-between">
              <span className={`icon-chip ${s.chip}`}>
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                  <path d={s.icon} />
                </svg>
              </span>
              <span className="grid size-7 place-items-center rounded-lg text-slate-300 opacity-0 transition group-hover:opacity-100">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Pipeline overview + recent documents */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-1">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">Pipeline</h2>
            <Link href="/app/pipeline" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Open →
            </Link>
          </div>
          {stageBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No pipeline stages yet.</p>
          ) : (
            <div className="space-y-3.5">
              {stageBreakdown.map((stage) => (
                <div key={stage.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                      <span className="size-2 rounded-full" style={{ background: stage.color }} />
                      {stage.name}
                    </span>
                    <span className="text-slate-400">
                      {stage.count} · {formatMoney(stage.value, workspace.currency)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(stage.count / maxStageCount) * 100}%`, background: stage.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
            <div>
              <p className="font-bold uppercase tracking-wide text-slate-400">Open tasks</p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-800">{taskCount}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide text-slate-400">Appointments</p>
              <p className="mt-0.5 text-lg font-extrabold text-slate-800">{appointmentCount} upcoming</p>
            </div>
          </div>
        </section>

        <section className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">Recent documents</h2>
            <div className="flex items-center gap-3">
              <Link href="/app/proposals" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Proposals →
              </Link>
              <Link href="/app/invoices" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Invoices →
              </Link>
            </div>
          </div>
          {recentProposals.length === 0 && recentInvoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Proposals and invoices you create will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...recentProposals.map((p) => ({ kind: "proposal" as const, id: p.id, label: p.title, sub: p.clientName, date: p.updatedAt, total: invoiceTotal(p), href: `/app/proposals/${p.id}` })), ...recentInvoices.map((inv) => ({ kind: "invoice" as const, id: inv.id, label: `${inv.number} — ${inv.title}`, sub: inv.clientName, date: inv.updatedAt, total: invoiceTotal(inv), href: `/app/invoices/${inv.id}` }))]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 6)
                .map((doc) => (
                  <li key={doc.id}>
                    <Link href={doc.href} className="flex items-center gap-3 py-3 transition hover:bg-slate-50">
                      <span
                        className={`icon-chip size-9 ${
                          doc.kind === "proposal"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={doc.kind === "proposal" ? "M4 5a1 1 0 0 1 1-1h10l5 5v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm5 2v2h6V7H9zm0 4v2h6v-2H9zm0 4v2h4v-2H9z" : "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 3v2h10V7H7zm0 4v2h6v-2H7zm0 4v2h8v-2H7z"} />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{doc.label}</p>
                        <p className="truncate text-xs text-slate-400">{doc.sub} · {timeAgo(doc.date)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-extrabold text-slate-700">
                        {formatMoney(doc.total, workspace.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      {/* Feeds */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">Recent leads</h2>
            <Link href="/app/pipeline" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No leads yet — add your first one in the pipeline.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-center gap-3 py-3.5">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${lead.stage?.color ?? "#64748b"}, ${lead.stage?.color ?? "#64748b"}cc)`,
                    }}
                  >
                    {lead.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{lead.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {lead.company ?? "No company"} · {timeAgo(lead.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-700">
                      {formatMoney(lead.value, workspace.currency)}
                    </span>
                    <span
                      className="size-2 rounded-full"
                      style={{ background: lead.stage?.color ?? "#94a3b8" }}
                      title={lead.stage?.name ?? "No stage"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-5 text-base font-extrabold tracking-tight text-slate-900">
            Recent activity
          </h2>
          {recentActivities.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Follow-ups and notes you add to leads will appear here.
            </p>
          ) : (
            <ul className="space-y-1">
              {recentActivities.map((a) => {
                const meta = ACTIVITY_META[a.type] ?? ACTIVITY_META.note;
                return (
                  <li key={a.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50">
                    <span className={`icon-chip size-9 ${meta.cls}`}>
                      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                        <path d={meta.icon} />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{a.user?.name ?? "Someone"}</span>{" "}
                        <span className="text-slate-400">
                          {meta.label.toLowerCase()} on{" "}
                          <span className="font-semibold text-slate-600">{a.lead.name}</span>
                        </span>
                      </p>
                      <p className="truncate text-xs text-slate-400">{a.body}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-300">{timeAgo(a.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
