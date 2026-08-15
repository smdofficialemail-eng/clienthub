"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleTask, deleteTask } from "./actions";
import { formatDate } from "@/lib/format";

type TaskWithLead = {
  id: string;
  title: string;
  done: boolean;
  priority: string;
  dueDate: Date | null;
  lead: { id: string; name: string; company: string | null } | null;
};

const PRIORITY_META: Record<string, { label: string; classes: string }> = {
  low: { label: "Low", classes: "bg-slate-100 text-slate-500" },
  normal: { label: "Normal", classes: "bg-sky-50 text-sky-600" },
  high: { label: "High", classes: "bg-red-50 text-red-600" },
};

export function TaskList({ tasks }: { tasks: TaskWithLead[]; showDone: boolean }) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(kind: "toggle" | "delete", id: string) {
    setPendingId(id);
    if (kind === "toggle") await toggleTask(id);
    else await deleteTask(id);
    setPendingId(null);
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const meta = PRIORITY_META[task.priority] ?? PRIORITY_META.normal;
        const isOverdue = !task.done && task.dueDate && task.dueDate.getTime() < Date.now();
        return (
          <li
            key={task.id}
            className="card flex items-center gap-3 p-4 transition hover:shadow-raised"
          >
            <button
              onClick={() => run("toggle", task.id)}
              disabled={pendingId === task.id}
              aria-label={task.done ? "Mark as not done" : "Mark as done"}
              className={`grid size-6 shrink-0 place-items-center rounded-lg border-2 transition ${
                task.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 text-transparent hover:border-emerald-400"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`font-bold ${
                  task.done ? "text-slate-300 line-through" : "text-slate-800"
                }`}
              >
                {task.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className={`rounded-full px-2 py-0.5 font-bold ${meta.classes}`}>
                  {meta.label}
                </span>
                {task.dueDate && (
                  <span className={isOverdue ? "font-bold text-red-500" : ""}>
                    {isOverdue ? "⚠ Overdue · " : "Due "}
                    {formatDate(task.dueDate)}
                  </span>
                )}
                {task.lead && (
                  <Link
                    href="/app/pipeline"
                    className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
                    </svg>
                    {task.lead.name}
                  </Link>
                )}
              </div>
            </div>

            <button
              onClick={() => run("delete", task.id)}
              disabled={pendingId === task.id}
              aria-label="Delete task"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 7h12M9 7V5h6v2m-8 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
