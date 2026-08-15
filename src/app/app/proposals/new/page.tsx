import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { TemplateGallery } from "./template-gallery";

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">New proposal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a starting design — you can drag, style and rearrange everything afterwards.
        </p>
      </div>
      <TemplateGallery
        leads={leads.map((l) => ({ id: l.id, name: l.name, company: l.company }))}
        preselectLeadId={lead ?? null}
        preselectClientName={client ?? null}
        currency={workspace.currency}
      />
    </div>
  );
}
