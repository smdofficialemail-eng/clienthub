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
    { label: "Open leads", value: String(leadCount), href: "/app/pipeline" },
    { label: "Pipeline value", value: formatMoney(valueAgg._sum.value ?? 0), href: "/app/pipeline" },
    { label: "Clients", value: String(clientCount), href: "/app/clients" },
    { label: "Outstanding", value: formatMoney(outstanding), href: "/app/invoices" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {workspace.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s what&apos;s happening across your business.
          </p>
        </div>
        <Link
          href="/app/pipeline"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          Open pipeline
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900">Recent leads</h2>
            <Link href="/app/pipeline" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No leads yet — add your first one in the pipeline.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{lead.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {lead.company ?? "No company"} · {timeAgo(lead.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">
                      {formatMoney(lead.value)}
                    </span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: lead.stage?.color ?? "#94a3b8" }}
                      title={lead.stage?.name ?? "No stage"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-extrabold text-slate-900">Recent activity</h2>
          {recentActivities.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Follow-ups and notes you add to leads will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentActivities.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                    {a.user?.name?.charAt(0) ?? "U"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{a.user?.name ?? "Someone"}</span>{" "}
                      <span className="text-slate-400">
                        {a.type} on <span className="font-semibold text-slate-600">{a.lead.name}</span>
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-400">{a.body}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-slate-300">
                    {timeAgo(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
