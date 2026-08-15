import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatDate } from "@/lib/format";
import { createTask } from "./actions";
import { TaskList } from "./task-list";

export const metadata = { title: "Tasks — ClientHub" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { done } = await searchParams;
  const showDone = done === "1";

  const [tasks, leads] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: workspace.id, done: showDone },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: { lead: { select: { id: true, name: true, company: true } } },
    }),
    prisma.lead.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, company: true },
    }),
  ]);

  const open = await prisma.task.count({ where: { workspaceId: workspace.id, done: false } });
  const overdue = await prisma.task.count({
    where: { workspaceId: workspace.id, done: false, dueDate: { lt: new Date() } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your to-do list — everything from lead follow-ups to admin, in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-700">
            {open} open
          </span>
          {overdue > 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1.5 font-bold text-red-600">
              {overdue} overdue
            </span>
          )}
        </div>
      </div>

      {/* Quick add */}
      <form
        action={async (formData) => {
          "use server";
          await createTask(undefined, formData);
        }}
        className="card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      >        <input name="title"
          required
          maxLength={120}
          placeholder="What needs doing? e.g. Send the proposal draft…"
          className="input flex-1"
        />
        <input name="dueDate" type="date" className="input sm:w-40" title="Due date" />
        <select name="priority" className="input sm:w-28" defaultValue="normal">
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <select name="leadId" className="input sm:w-44" defaultValue="">
          <option value="">No lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name}
              {lead.company ? ` — ${lead.company}` : ""}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary px-4 py-2">
          + Add task
        </button>
      </form>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm font-semibold shadow-sm">
        <Link
          href="/app/tasks"
          className={`flex-1 rounded-lg px-3 py-1.5 text-center transition ${
            !showDone ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Open ({open})
        </Link>
        <Link
          href="/app/tasks?done=1"
          className={`flex-1 rounded-lg px-3 py-1.5 text-center transition ${
            showDone ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Completed
        </Link>
      </div>

      <TaskList tasks={tasks} showDone={showDone} />

      {tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
          <p className="font-extrabold text-slate-700">
            {showDone ? "Nothing completed yet" : "No open tasks 🎉"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {showDone
              ? "Tasks you finish will appear here."
              : "Add a task above, or create one from any lead in the pipeline."}
          </p>
        </div>
      )}
    </div>
  );
}
