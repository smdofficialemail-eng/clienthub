import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center gap-2 px-6 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white font-extrabold text-lg shadow-md shadow-indigo-600/30">
          C
        </span>
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          Client<span className="text-indigo-600">Hub</span>
        </span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        {children}
      </main>
      <footer className="pb-6 text-center text-xs text-slate-400">
        <Link href="/" className="hover:text-slate-600">
          Manage leads, proposals, clients, and invoices in one place.
        </Link>
      </footer>
    </div>
  );
}
