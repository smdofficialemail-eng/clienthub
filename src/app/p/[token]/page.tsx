import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney, formatDate } from "@/lib/format";
import { PublicActions } from "./public-actions";

export const metadata: Metadata = { title: "Proposal — ClientHub" };

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      workspace: { select: { name: true, currency: true } },
    },
  });
  if (!proposal) notFound();

  // Opening a sent proposal marks it as viewed (drafts stay private).
  let status = proposal.status;
  if (status === "sent") {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: "viewed" },
    });
    status = "viewed";
  }

  const total = proposal.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const settled = status === "approved" || status === "declined";

  return (
    <div className="app-bg min-h-screen py-10">
      <div className="mx-auto max-w-3xl">
        {/* Brand bar */}
        <div className="mb-5 flex items-center justify-between px-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-extrabold text-white shadow-md shadow-brand-600/30">
              {proposal.workspace.name.charAt(0).toUpperCase()}
            </span>
            <p className="truncate font-extrabold tracking-tight text-slate-800">
              {proposal.workspace.name}
            </p>
          </div>
          <span
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide shadow-sm ${
              settled ? "bg-white text-slate-500" : "bg-brand-600/10 text-brand-700"
            }`}
          >
            {settled ? "Proposal closed" : "Awaiting your response"}
          </span>
        </div>

        {/* Document */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-pop">
          <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-50 to-brand-50/40 px-5 py-7 sm:px-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-violet-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
              Proposal for
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
              {proposal.clientName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {proposal.title} · {formatDate(proposal.createdAt)}
            </p>
          </div>

          <div className="px-5 py-8 sm:px-8">
            {proposal.intro && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {proposal.intro}
              </p>
            )}

            <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-4">Item</th>
                  <th className="w-16 py-2.5 text-right">Qty</th>
                  <th className="w-28 py-2.5 text-right">Unit price</th>
                  <th className="w-28 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proposal.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3.5 pr-4 font-semibold text-slate-800">{item.description}</td>
                    <td className="py-3.5 text-right text-slate-500">{item.qty}</td>
                    <td className="py-3.5 text-right text-slate-500">{formatMoney(item.unitPrice, proposal.workspace.currency)}</td>
                    <td className="py-3.5 text-right font-bold text-slate-800">
                      {formatMoney(item.qty * item.unitPrice, proposal.workspace.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-5 text-right text-sm font-bold uppercase tracking-wider text-slate-500">
                    Total
                  </td>
                  <td className="py-5 text-right text-2xl font-extrabold tracking-tight text-slate-900">
                    {formatMoney(total, proposal.workspace.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>

            {status === "approved" && (
              <div className="mt-8 rounded-xl bg-emerald-50 px-5 py-4 text-center text-sm font-bold text-emerald-700">
                ✓ Approved — thanks {proposal.clientName}! We&apos;ll be in touch to get started.
              </div>
            )}
            {status === "declined" && (
              <div className="mt-8 rounded-xl bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-700">
                This proposal was declined. No worries — happy to revise it.
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6">
          {settled ? (
            <p className="text-center text-sm text-slate-500">
              {status === "approved"
                ? "You've approved this proposal."
                : "You've declined this proposal."}
            </p>
          ) : (
            <PublicActions token={token} clientName={proposal.clientName} />
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href={`/p/${token}/pdf`}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download PDF
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Sent securely via {proposal.workspace.name} · {proposal.title}
        </p>
      </div>
    </div>
  );
}
