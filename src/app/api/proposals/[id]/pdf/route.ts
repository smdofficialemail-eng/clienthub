import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { buildProposalPdf, pdfFilename } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();

  const proposal = await prisma.proposal.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!proposal) {
    return new Response("Proposal not found", { status: 404 });
  }

  const pdf = await buildProposalPdf(proposal, workspace.name, workspace.currency);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename("proposal", proposal.title)}"`,
    },
  });
}
