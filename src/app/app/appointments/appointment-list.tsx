"use client";

import { useState } from "react";
import Link from "next/link";
import { setAppointmentStatus, deleteAppointment } from "./actions";
import { formatDateTime } from "@/lib/format";

type AppointmentRow = {
  id: string;
  title: string;
  clientName: string | null;
  startsAt: Date;
  durationMin: number;
  notes: string | null;
  status: string;
  lead: { id: string; name: string } | null;
};

function durationLabel(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function AppointmentList({
  appointments,
  showActions,
}: {
  appointments: AppointmentRow[];
  showActions: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(kind: "complete" | "cancel" | "delete", id: string) {
    setPendingId(id);
    if (kind === "complete") await setAppointmentStatus(id, "completed");
    else if (kind === "cancel") await setAppointmentStatus(id, "cancelled");
    else await deleteAppointment(id);
    setPendingId(null);
  }

  return (
    <ul className="space-y-2">
      {appointments.map((appt) => (
        <li key={appt.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${
                appt.status === "cancelled"
                  ? "bg-slate-100 text-slate-400"
                  : appt.status === "completed"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-brand-50 text-brand-600"
              }`}
            >
              {appt.startsAt.getHours() < 12 ? "AM" : "PM"}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-slate-800">{appt.title}</p>
              <p className="text-sm text-slate-500">{formatDateTime(appt.startsAt)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="font-semibold">{durationLabel(appt.durationMin)}</span>
                {appt.clientName && <span>{appt.clientName}</span>}
                {appt.lead && (
                  <Link
                    href="/app/pipeline"
                    className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
                    </svg>
                    {appt.lead.name}
                  </Link>
                )}
                {appt.status === "completed" && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">
                    Completed
                  </span>
                )}
                {appt.status === "cancelled" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-500">
                    Cancelled
                  </span>
                )}
              </div>
              {appt.notes && <p className="mt-1 text-xs text-slate-400">{appt.notes}</p>}
            </div>
          </div>

          {showActions && appt.status === "scheduled" && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => run("complete", appt.id)}
                disabled={pendingId === appt.id}
                className="btn-success px-3 py-1.5 text-xs"
              >
                ✓ Done
              </button>
              <button
                onClick={() => run("cancel", appt.id)}
                disabled={pendingId === appt.id}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => run("delete", appt.id)}
                disabled={pendingId === appt.id}
                aria-label="Delete appointment"
                className="grid size-8 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 7h12M9 7V5h6v2m-8 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
