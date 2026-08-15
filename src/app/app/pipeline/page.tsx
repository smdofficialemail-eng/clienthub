import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { PipelineBoard } from "./board";

export default async function PipelinePage() {
  const { workspace } = await requireWorkspace();

  const pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    include: {
      stages: {
        orderBy: { position: "asc" },
        include: {
          leads: {
            orderBy: { createdAt: "desc" },
            include: {
              activities: { orderBy: { createdAt: "desc" } },
              tasks: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-extrabold text-slate-900">No pipeline yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your workspace doesn&apos;t have a pipeline. Head back to the dashboard.
        </p>
        <Link href="/app" className="mt-4 inline-block text-sm font-bold text-indigo-600">
          Back to dashboard →
        </Link>
      </div>
    );
  }

  return <PipelineBoard pipeline={pipeline} currency={workspace.currency} />;
}
