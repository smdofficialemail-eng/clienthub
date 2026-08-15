import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { formatMoney, formatDate } from "@/lib/format";
import { STATUS_META } from "../page";
import { sendProposal, deleteProposal } from "../actions";
import { ProposalControls } from "./controls";

export const metadata = { title: "Proposal — ClientHub" };

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const proposal = await prisma.proposal.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      lead: { select: { id: true, name: true, company: true, status: true } },
    },
  });
  if (!proposal) notFound();

  const total = proposal.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const meta = STATUS_META[proposal.status] ?? STATUS_META.draft;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const publicUrl = `http://${host}/p/${proposal.token}`;

  const canSend = proposal.status === "draft" || proposal.status === "sent" || proposal.status === "viewed";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/app/proposals"
            className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            aria-label="Back to proposals"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{proposal.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {proposal.clientName} · {proposal.clientEmail}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/proposals/${proposal.id}/edit`}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-brand-400 hover:text-brand-600"
          >
            ✏️ Edit design
          </Link>
          <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${meta.classes}`}>
            {meta.label}
          </span>
        </div>
      </div>

      <ProposalControls
        proposalId={proposal.id}
        publicUrl={publicUrl}
        status={proposal.status}
        canSend={canSend}
        sendAction={sendProposal}
        deleteAction={deleteProposal}
      />

      {proposal.status === "approved" && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div>
            <p className="font-extrabold text-emerald-800">Approved — time to bill 🎉</p>
            <p className="text-sm text-emerald-700">
              Create an invoice from this approved proposal in one click.
            </p>
          </div>
          <Link
            href={`/app/invoices/new?proposal=${proposal.id}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700"
          >
            + Create invoice
          </Link>
        </div>
      )}

      {proposal.lead && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-400">From lead:</span>
          <Link href="/app/pipeline" className="font-bold text-indigo-600 hover:text-indigo-700">
            {proposal.lead.name}
          </Link>
          {proposal.lead.company && <span className="text-slate-400">· {proposal.lead.company}</span>}
        </div>
      )}

      {/* Document preview */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-lg font-extrabold text-white">
                {workspace.name.charAt(0).toUpperCase()}
              </span>
              <p className="truncate font-extrabold text-slate-900">{workspace.name}</p>
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Proposal · {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>
        <div className="px-5 py-8 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Prepared for</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">{proposal.clientName}</h2>
          <p className="text-sm text-slate-500">{proposal.clientEmail}</p>

          {proposal.intro && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {proposal.intro}
            </p>
          )}

          <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Item</th>
                <th className="w-16 py-2 text-right">Qty</th>
                <th className="w-28 py-2 text-right">Unit price</th>
                <th className="w-28 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proposal.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4 font-semibold text-slate-800">{item.description}</td>
                  <td className="py-3 text-right text-slate-500">{item.qty}</td>
                  <td className="py-3 text-right text-slate-500">{formatMoney(item.unitPrice, workspace.currency)}</td>
                  <td className="py-3 text-right font-bold text-slate-800">
                    {formatMoney(item.qty * item.unitPrice, workspace.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} className="py-4 text-right text-sm font-bold uppercase tracking-wide text-slate-500">
                  Total
                </td>
                <td className="py-4 text-right text-xl font-extrabold text-slate-900">
                  {formatMoney(total, workspace.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>

          {proposal.status === "approved" && (
            <div className="mt-8 rounded-xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
              ✓ Approved by {proposal.clientName}
            </div>
          )}
          {proposal.status === "declined" && (
            <div className="mt-8 rounded-xl bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              Declined by {proposal.clientName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
