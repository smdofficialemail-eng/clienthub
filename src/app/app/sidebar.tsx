"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth-actions";

const MAIN_NAV = [
  { href: "/app", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z", exact: true },
  { href: "/app/pipeline", label: "Pipeline", icon: "M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm0 8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2zm0 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2z" },
  { href: "/app/clients", label: "Clients", icon: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" },
  { href: "/app/proposals", label: "Proposals", icon: "M4 5a1 1 0 0 1 1-1h10l5 5v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm5 2v2h6V7H9zm0 4v2h6v-2H9zm0 4v2h4v-2H9z" },
  { href: "/app/invoices", label: "Invoices", icon: "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 3v2h10V7H7zm0 4v2h6v-2H7zm0 4v2h8v-2H7z" },
  { href: "/app/tasks", label: "Tasks", icon: "M9 11l2 2 4-4m5.5-1.5A10 10 0 1 1 5.4 5.4 10 10 0 0 1 18.6 4.4z" },
  { href: "/app/appointments", label: "Appointments", icon: "M8 2v4m8-4v4M4 8h16M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm3 8h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z" },
];

const OTHER_NAV = [
  { href: "/app/soon?m=portal", label: "Client Portal", icon: "M9 12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h5zm10 0a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h5zM9 3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5zm10 0a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5z" },
  { href: "/app/settings", label: "Settings", icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.9 4a6.9 6.9 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a6.9 6.9 0 0 0-1.7-1L16.4 3h-4l-.4 2.1a6.9 6.9 0 0 0-1.7 1l-2.3-1-2 3.4L8 11a6.9 6.9 0 0 0-.1 1l2 1.5-2 3.4 2.3 1a6.9 6.9 0 0 0 1.7 1l.4 2.1h4l.4-2.1a6.9 6.9 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.6.1-1z" },
];

function NavItem({
  item,
  pathname,
  onSoon,
  onClose,
}: {
  item: (typeof MAIN_NAV)[number];
  pathname: string;
  onSoon?: boolean;
  onClose?: () => void;
}) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href.split("?")[0]);
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/25"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-5 shrink-0 transition-colors ${
          active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
        }`}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={item.icon} />
      </svg>
      <span className="flex-1">{item.label}</span>
      {onSoon && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
          }`}
        >
          Soon
        </span>
      )}
    </Link>
  );
}

export function Sidebar({
  workspaceName,
  userName,
  role,
  open = false,
  onClose,
}: {
  workspaceName: string;
  userName: string;
  role: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white transition-transform duration-300 lg:sticky lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-extrabold text-white shadow-lg shadow-brand-600/30">
          C
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight text-slate-900">
            Client<span className="text-brand-600">Hub</span>
          </p>
          <p className="text-[11px] font-medium text-slate-400">Client operations</p>
        </div>
      </div>

      <div className="mx-5 border-t border-slate-100" />

      {/* Workspace */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-extrabold text-white">
            {workspaceName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800">{workspaceName}</p>
            <p className="text-[11px] font-medium capitalize text-slate-400">{role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="section-title px-3 pb-2">Workspace</p>
        {MAIN_NAV.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} onClose={onClose} />
        ))}
        <p className="section-title px-3 pb-2 pt-5">Other</p>
        {OTHER_NAV.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            pathname={pathname}
            onSoon={item.href.includes("?m=")}
            onClose={onClose}
          />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{userName}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Log out"
              className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M12 4h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
