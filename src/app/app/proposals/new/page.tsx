import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { ProposalForm } from "./proposal-form";

export const metadata = { title: "New proposal — ClientHub" };

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; client?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { lead, client } = await searchParams;

  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id, status: { in: ["active", "won"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">New proposal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Build the quote, then send your client a link to view and approve it.
        </p>
      </div>
      <ProposalForm
        leads={leads}
        preselectLeadId={lead ?? null}
        preselectClientName={client ?? null}
        currency={workspace.currency}
      />
    </div>
  );
}
