import Link from "next/link";

const FEATURES = [
  {
    title: "A pipeline that works the way you sell",
    body: "Drag leads through stages, never lose a follow-up, and convert wins into clients in one click.",
  },
  {
    title: "Proposals that get approved",
    body: "Send polished proposals with line items and a live approval link — no more email ping-pong.",
  },
  {
    title: "Invoicing without the spreadsheet",
    body: "Bill from approved proposals, track outstanding balances, and export crisp PDFs.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-slate-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_20%_-10%,rgba(99,102,241,0.35),transparent_60%),radial-gradient(700px_400px_at_100%_110%,rgba(139,92,246,0.28),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-extrabold text-white shadow-lg shadow-brand-600/40">
              C
            </span>
            <span className="text-xl font-extrabold tracking-tight text-white">
              Client<span className="text-brand-300">Hub</span>
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
              The operating system for your client work.
            </h1>
            <div className="mt-8 space-y-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300">
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ClientHub · Built for freelancers, consultants & small teams
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col bg-[#f6f7fb]">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <span className="flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-extrabold text-white">
              C
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Client<span className="text-brand-600">Hub</span>
            </span>
          </span>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          {children}
        </main>
        <footer className="pb-6 text-center text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            Manage leads, proposals, clients, and invoices in one place.
          </Link>
        </footer>
      </div>
    </div>
  );
}
