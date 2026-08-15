import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { InvoiceForm } from "./invoice-form";

export const metadata = { title: "New invoice — ClientHub" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ proposal?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { proposal } = await searchParams;

  const approvedProposals = await prisma.proposal.findMany({
    where: {
      workspaceId: workspace.id,
      status: "approved",
      invoice: null,
    },
    orderBy: { updatedAt: "desc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">New invoice</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bill for approved work — pick a proposal to pre-fill the details, or start fresh.
        </p>
      </div>
      <InvoiceForm proposals={approvedProposals} preselectProposalId={proposal ?? null} />
    </div>
  );
}
