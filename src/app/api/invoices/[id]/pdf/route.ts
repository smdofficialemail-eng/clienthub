import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { buildInvoicePdf, pdfFilename } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const pdf = await buildInvoicePdf(invoice, workspace.name, workspace.currency);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename("invoice", invoice.title, invoice.number)}"`,
    },
  });
}
