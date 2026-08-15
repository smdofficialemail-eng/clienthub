import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, timeAgo } from "@/lib/format";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();

  const [leadCount, valueAgg, clientCount, taskCount, recentLeads, recentActivities] =
    await Promise.all([
      prisma.lead.count({ where: { workspaceId: workspace.id } }),
      prisma.lead.aggregate({
        where: { workspaceId: workspace.id, status: "active" },
        _sum: { value: true },
      }),
      prisma.client.count({ where: { workspaceId: workspace.id } }),
      prisma.task.count({
        where: { done: false, lead: { workspaceId: workspace.id } },
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
    ]);

  const outstandingInvoices = await prisma.invoice.findMany({
    where: { workspaceId: workspace.id, status: { not: "paid" } },
    include: { items: true },
  });
  const outstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, item) => s + item.qty * item.unitPrice, 0),
    0
  );

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
      label: "Outstanding",
      value: formatMoney(outstanding, workspace.currency),
      href: "/app/invoices",
      chip: "bg-amber-50 text-amber-600",
      icon: "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 3v2h10V7H7zm0 4v2h6v-2H7zm0 4v2h8v-2H7z",
      sub: "to collect",
    },
  ];

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
