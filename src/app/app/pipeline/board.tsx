"use client";

import { useActionState, useState } from "react";
import type { Pipeline, PipelineStage, Lead, Activity, Task } from "@prisma/client";
import {
  createLead,
  createStage,
  deleteStage,
  moveLead,
  addActivity,
  addTask,
  toggleTask,
  updateLeadNotes,
  convertToClient,
} from "./actions";
import { formatMoney, formatDate, timeAgo } from "@/lib/format";

type LeadWithData = Lead & { activities: Activity[]; tasks: Task[] };
type StageWithLeads = PipelineStage & { leads: LeadWithData[] };
type BoardPipeline = Pipeline & { stages: StageWithLeads[] };

const TYPE_BADGES: Record<string, string> = {
  note: "bg-slate-100 text-slate-600",
  call: "bg-sky-100 text-sky-700",
  email: "bg-violet-100 text-violet-700",
  meeting: "bg-amber-100 text-amber-700",
};

export function PipelineBoard({ pipeline }: { pipeline: BoardPipeline }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingToStage, setAddingToStage] = useState<string | null>(null);
  const [dragLead, setDragLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [stageState, stageAction, stagePending] = useActionState(createStage, undefined);
  const [leadState, leadAction, leadPending] = useActionState(createLead, undefined);

  const selected =
    pipeline.stages
      .flatMap((s) => s.leads)
      .find((l) => l.id === selectedId) ?? null;

  async function handleDrop(stageId: string) {
    if (dragLead) {
      await moveLead(dragLead, stageId);
    }
    setDragLead(null);
    setDragOverStage(null);
  }

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{pipeline.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag leads between stages to move them through your sales process.
          </p>
        </div>
        <button
          onClick={() => setAddingToStage(pipeline.stages[0]?.id ?? "")}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          + Add lead
        </button>
      </div>

      {/* Board */}
      <div className="board-scroll flex flex-1 gap-4 overflow-x-auto pb-4">
        {pipeline.stages.map((stage) => (
          <div
            key={stage.id}
            className={`column-drop flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/70 ${
              dragOverStage === stage.id ? "drag-over" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverStage !== stage.id) setDragOverStage(stage.id);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
            onDrop={() => handleDrop(stage.id)}
          >
            <div className="flex items-center gap-2 px-4 pb-2 pt-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: stage.color }}
              />
              <h2 className="flex-1 truncate text-sm font-extrabold text-slate-800">
                {stage.name}
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 shadow-sm">
                {stage.leads.length}
              </span>
              <button
                onClick={async () => {
                  await deleteStage(stage.id);
                }}
                className="text-slate-300 transition hover:text-red-500"
                title="Delete stage"
                aria-label={`Delete ${stage.name}`}
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 7h12M9 7V5h6v2m-8 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-2">
              {stage.leads.map((lead) => (
                <button
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragLead(lead.id)}
                  onDragEnd={() => {
                    setDragLead(null);
                    setDragOverStage(null);
                  }}
                  onClick={() => setSelectedId(lead.id)}
                  className={`lead-card block w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    dragLead === lead.id ? "dragging" : ""
                  } ${selectedId === lead.id ? "ring-2 ring-indigo-400" : ""}`}
                >
                  <p className="truncate font-bold text-slate-800">{lead.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {lead.company ?? "No company"}
                    {lead.source ? ` · ${lead.source}` : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-700">
                      {formatMoney(lead.value)}
                    </span>
                    <span className="text-xs text-slate-300">
                      {lead.tasks.filter((t) => !t.done).length > 0
                        ? `${lead.tasks.filter((t) => !t.done).length} task${lead.tasks.filter((t) => !t.done).length > 1 ? "s" : ""}`
                        : timeAgo(lead.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
              {stage.leads.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-slate-400">No leads here yet</p>
              )}
            </div>

            <button
              onClick={() => setAddingToStage(stage.id)}
              className="mx-3 mb-3 rounded-lg border border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-400 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              + Add lead
            </button>
          </div>
        ))}

        {/* Add stage */}
        <div className="w-64 shrink-0 self-start rounded-2xl border border-dashed border-slate-300 bg-white/60 p-3">
          <form action={stageAction} className="space-y-2">
            <input
              name="name"
              required
              maxLength={60}
              placeholder="New stage name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            {stageState?.error && (
              <p className="text-xs font-medium text-red-500">{stageState.error}</p>
            )}
            <button
              type="submit"
              disabled={stagePending}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {stagePending ? "Adding…" : "Add stage"}
            </button>
          </form>
        </div>
      </div>

      {/* Add lead modal */}
      {addingToStage !== null && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setAddingToStage(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-slate-900">Add a lead</h3>
            <p className="mt-1 text-sm text-slate-500">New leads land in the first stage.</p>
            <form action={leadAction} className="mt-5 grid grid-cols-2 gap-3">
              <input type="hidden" name="stageId" value={addingToStage} />
              {leadState?.error && (
                <p className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                  {leadState.error}
                </p>
              )}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Name *
                </label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Company
                </label>
                <input
                  name="company"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Value ($)
                </label>
                <input
                  name="value"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Source
                </label>
                <input
                  name="source"
                  placeholder="e.g. Website"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2 mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingToStage(null)}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leadPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {leadPending ? "Adding…" : "Add lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead detail slide-over */}
      {selected && (
        <LeadDetail
          lead={selected}
          onClose={() => setSelectedId(null)}
          onConvert={async () => {
            await convertToClient(selected.id);
          }}
        />
      )}
    </div>
  );
}

function LeadDetail({
  lead,
  onClose,
  onConvert,
}: {
  lead: LeadWithData;
  onClose: () => void;
  onConvert: () => void;
}) {
  const [notes, setNotes] = useState(lead.notes ?? "");

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose}>
      <div
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{lead.name}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {lead.company ?? "No company"}
              {lead.email ? ` · ${lead.email}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                {formatMoney(lead.value)}
              </span>
              {lead.source && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                  {lead.source}
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                Added {formatDate(lead.createdAt)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 p-5">
          {/* Notes */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Notes
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add context about this lead…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <button
              onClick={async () => {
                await updateLeadNotes(lead.id, notes);
              }}
              className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              Save notes
            </button>
          </section>

          {/* Tasks */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Tasks ({lead.tasks.filter((t) => !t.done).length} open)
            </h4>
            <form action={addTask} className="flex gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input
                name="title"
                required
                placeholder="e.g. Send follow-up email"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Add
              </button>
            </form>
            {lead.tasks.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {lead.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <button
                      onClick={async () => toggleTask(t.id)}
                      className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
                        t.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 hover:border-emerald-400"
                      }`}
                      aria-label={t.done ? "Mark as not done" : "Mark as done"}
                    >
                      {t.done && (
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${t.done ? "text-slate-300 line-through" : "text-slate-700"}`}
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Activity */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Activity
            </h4>
            <form action={addActivity} className="space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="flex gap-2">
                <select
                  name="type"
                  className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
                <input
                  name="body"
                  required
                  placeholder="Log a note, call, email or meeting…"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  Log
                </button>
              </div>
            </form>
            {lead.activities.length > 0 && (
              <ul className="mt-3 space-y-3">
                {lead.activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${TYPE_BADGES[a.type] ?? TYPE_BADGES.note}`}
                    >
                      {a.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{a.body}</p>
                      <p className="text-xs text-slate-400">{timeAgo(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Convert */}
          <section className="border-t border-slate-100 pt-4">
            <button
              onClick={onConvert}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700"
            >
              Convert to client 🎉
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Marks the lead as won and creates a client record.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
