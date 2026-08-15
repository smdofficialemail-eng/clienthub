"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth-actions";

const NAV = [
  { href: "/app", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/app/pipeline", label: "Pipeline", icon: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm0 8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2zm0 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2z" },
  { href: "/app/clients", label: "Clients", icon: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" },
  { href: "/app/proposals", label: "Proposals", icon: "M4 5a1 1 0 0 1 1-1h10l5 5v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm5 2v2h6V7H9zm0 4v2h6v-2H9zm0 4v2h4v-2H9z" },
  { href: "/app/invoices", label: "Invoices", icon: "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 3v2h10V7H7zm0 4v2h6v-2H7zm0 4v2h8v-2H7z" },
  { href: "/app/soon?m=portal", label: "Client Portal", soon: true, icon: "M9 12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h5zm10 0a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h5zM9 3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5zm10 0a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5z" },
  { href: "/app/soon?m=settings", label: "Settings", soon: true, icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.9 4a6.9 6.9 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a6.9 6.9 0 0 0-1.7-1L16.4 3h-4l-.4 2.1a6.9 6.9 0 0 0-1.7 1l-2.3-1-2 3.4L8 11a6.9 6.9 0 0 0-.1 1l2 1.5-2 3.4 2.3 1a6.9 6.9 0 0 0 1.7 1l.4 2.1h4l.4-2.1a6.9 6.9 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.6.1-1z" },
];

export function Sidebar({
  workspaceName,
  userName,
  role,
}: {
  workspaceName: string;
  userName: string;
  role: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white font-extrabold text-lg shadow-md shadow-indigo-600/30">
          C
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-900">{workspaceName}</p>
          <p className="text-xs capitalize text-slate-400">{role}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href.split("?")[0]);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 pb-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
            {userName.charAt(0).toUpperCase()}
          </span>
          <p className="truncate text-sm font-semibold text-slate-700">{userName}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
