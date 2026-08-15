import { prisma } from "@/lib/db";
import { buildProposalPdf, pdfFilename } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      workspace: { select: { name: true, currency: true } },
    },
  });
  if (!proposal) {
    return new Response("Proposal not found", { status: 404 });
  }

  const pdf = await buildProposalPdf(proposal, proposal.workspace.name, proposal.workspace.currency);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename("proposal", proposal.title)}"`,
    },
  });
}
