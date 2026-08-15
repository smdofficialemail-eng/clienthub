"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({
  workspaceName,
  userName,
  role,
  children,
}: {
  workspaceName: string;
  userName: string;
  role: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-bg flex min-h-screen">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar
        workspaceName={workspaceName}
        userName={userName}
        role={role}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-600 shadow-sm"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-extrabold text-white">
              {workspaceName.charAt(0).toUpperCase()}
            </span>
            <p className="truncate text-sm font-extrabold tracking-tight text-slate-900">
              {workspaceName}
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
