import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, timeAgo } from "@/lib/format";

export const metadata = { title: "Clients — ClientHub" };

export default async function ClientsPage() {
  const { workspace } = await requireWorkspace();

  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: { lead: { include: { stage: true } } },
  });

  const totalValue = clients.reduce(
    (sum, c) => sum + (c.lead?.status === "won" ? c.lead.value : 0),
    0
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Everyone you&apos;ve converted from leads — with the stage they won from.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Won value</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMoney(totalValue)}</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-16 text-center">
          <p className="font-extrabold text-slate-700">No clients yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Convert a lead from the pipeline to add your first client.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-base font-extrabold text-white shadow-md shadow-indigo-600/25">
                  {client.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-900">{client.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {client.company ?? "No company"}
                  </p>
                </div>
              </div>
              <dl className="mt-4 space-y-1.5 text-sm">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Email
                    </span>
                    <span className="truncate text-slate-600">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Phone
                    </span>
                    <span className="truncate text-slate-600">{client.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Value
                  </span>
                  <span className="font-bold text-emerald-600">
                    {formatMoney(client.lead?.value ?? 0)}
                  </span>
                </div>
              </dl>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">Client since {timeAgo(client.createdAt)}</span>
                {client.lead?.stage && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: client.lead.stage.color }}
                    />
                    {client.lead.stage.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
