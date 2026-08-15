import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { AppointmentForm } from "./appointment-form";
import { AppointmentList } from "./appointment-list";

export const metadata = { title: "Appointments — ClientHub" };

export default async function AppointmentsPage() {
  const { workspace } = await requireWorkspace();
  const now = new Date();

  const [upcoming, past, leads] = await Promise.all([
    prisma.appointment.findMany({
      where: { workspaceId: workspace.id, status: "scheduled", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: { lead: { select: { id: true, name: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [{ status: { in: ["completed", "cancelled"] } }, { startsAt: { lt: now } }],
      },
      orderBy: { startsAt: "desc" },
      take: 30,
      include: { lead: { select: { id: true, name: true } } },
    }),
    prisma.lead.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, company: true },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = upcoming.filter((a) => a.startsAt >= today).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Appointments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Calls, meetings and check-ins — schedule them here and keep your week straight.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-700">
            {upcoming.length} upcoming
          </span>
          {todayCount > 0 && (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-600">
              {todayCount} today
            </span>
          )}
        </div>
      </div>

      <AppointmentForm leads={leads} />

      <h2 className="mb-3 mt-8 text-sm font-extrabold uppercase tracking-wide text-slate-400">
        Upcoming
      </h2>
      <AppointmentList appointments={upcoming} showActions />

      <h2 className="mb-3 mt-8 text-sm font-extrabold uppercase tracking-wide text-slate-400">
        Past & settled
      </h2>
      {past.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-center text-sm text-slate-400">
          No past appointments yet.
        </p>
      ) : (
        <AppointmentList appointments={past} showActions={false} />
      )}
    </div>
  );
}
