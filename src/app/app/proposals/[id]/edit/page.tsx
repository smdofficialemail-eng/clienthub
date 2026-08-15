import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { parseLayout } from "@/lib/layout";
import { ProposalEditor } from "../../canvas/editor";

export const metadata = { title: "Edit proposal — ClientHub" };

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const proposal = await prisma.proposal.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { lead: { select: { id: true, name: true, company: true } } },
  });
  if (!proposal) notFound();

  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id, status: { in: ["active", "won"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const layout = parseLayout(proposal.layout);

  return (
    <ProposalEditor
      mode="edit"
      proposalId={proposal.id}
      leads={leads.map((l) => ({ id: l.id, name: l.name, company: l.company }))}
      currency={workspace.currency}
      initialDetails={{
        title: proposal.title,
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail,
        intro: proposal.intro,
        leadId: proposal.leadId,
      }}
      initialLayout={layout ?? undefined}
    />
  );
}
