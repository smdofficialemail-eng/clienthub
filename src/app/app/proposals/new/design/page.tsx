import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { getTemplate } from "@/lib/templates";
import { ProposalEditor } from "../../canvas/editor";

export const metadata = { title: "New proposal — ClientHub" };

export default async function DesignProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; lead?: string; client?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { template, lead, client } = await searchParams;

  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id, status: { in: ["active", "won"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const tpl = getTemplate(template);

  return (
    <ProposalEditor
      mode="create"
      leads={leads.map((l) => ({ id: l.id, name: l.name, company: l.company }))}
      preselectLeadId={lead ?? null}
      preselectClientName={client ?? null}
      currency={workspace.currency}
      initialLayout={tpl?.create() ?? undefined}
    />
  );
}
