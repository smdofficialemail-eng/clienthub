"use client";

import { useActionState } from "react";
import { createAppointment } from "./actions";

type LeadOption = { id: string; name: string; company: string | null };

export function AppointmentForm({ leads }: { leads: LeadOption[] }) {
  const [state, action, pending] = useActionState(createAppointment, undefined);

  // Default start = next hour, rounded to :00 — as a LOCAL datetime string
  // (datetime-local inputs are interpreted in the visitor's timezone, not UTC).
  const defaultStart = (() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2v4m8-4v4M4 8h16M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 9h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Schedule an appointment
        </h2>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Title *</label>
          <input
            name="title"
            required
            maxLength={120}
            placeholder="e.g. Kickoff call with Jane"
            className="input"
          />
        </div>
        <div>
          <label className="label">Client (optional)</label>
          <input name="clientName" maxLength={120} placeholder="Jane Doe" className="input" />
        </div>
        <div>
          <label className="label">Link to lead (optional)</label>
          <select name="leadId" className="input" defaultValue="">
            <option value="">No lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
                {lead.company ? ` — ${lead.company}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date & time *</label>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultStart}
            className="input"
          />
        </div>
        <div>
          <label className="label">Duration (minutes)</label>
          <select name="durationMin" className="input" defaultValue="60">
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes (optional)</label>
          <textarea
            name="notes"
            rows={2}
            maxLength={2000}
            placeholder="Agenda, links, prep work…"
            className="input"
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2">
          {pending ? "Scheduling…" : "Schedule"}
        </button>
      </div>
    </form>
  );
}
