import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { updateClient } from "../../actions";
import { ClientForm } from "../../client-form";

export const metadata = { title: "Edit client — ClientHub" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, workspaceId: workspace.id },
  });
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Edit client</h1>
        <p className="mt-1 text-sm text-slate-500">Update {client.name}&apos;s details.</p>
      </div>
      <ClientForm
        defaults={{
          id: client.id,
          name: client.name,
          company: client.company,
          email: client.email,
          phone: client.phone,
          website: client.website,
          address: client.address,
          industry: client.industry,
          notes: client.notes,
        }}
        action={updateClient}
        submitLabel="Save changes"
      />
    </div>
  );
}
