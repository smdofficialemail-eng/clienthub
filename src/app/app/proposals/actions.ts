"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";

async function workspaceGuard() {
  const { workspace } = await requireWorkspace();
  return workspace;
}

const itemSchema = z.object({
  description: z.string().min(1, "Describe the item"),
  qty: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
});

const proposalSchema = z.object({
  title: z.string().min(1, "Proposal title is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Enter a valid email"),
  intro: z.string().nullish(),
  leadId: z.string().nullish(),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
});

export async function createProposal(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();

  let itemsJson: unknown;
  try {
    itemsJson = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    itemsJson = [];
  }

  const parsed = proposalSchema.safeParse({
    title: formData.get("title"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    intro: formData.get("intro"),
    leadId: formData.get("leadId") || null,
    items: itemsJson,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Validate the lead belongs to this workspace when one is chosen.
  const leadId = parsed.data.leadId ?? null;
  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId: workspace.id },
    });
    if (!lead) return { error: "Lead not found" };
  }

  const proposal = await prisma.proposal.create({
    data: {
      title: parsed.data.title,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      intro: parsed.data.intro || null,
      leadId,
      workspaceId: workspace.id,
      items: {
        create: parsed.data.items.map((item, i) => ({
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath("/app/proposals");
  redirect(`/app/proposals/${proposal.id}`);
}

export async function sendProposal(proposalId: string) {
  const workspace = await workspaceGuard();
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, workspaceId: workspace.id },
  });
  if (!proposal) return { error: "Proposal not found" };
  if (proposal.status === "approved" || proposal.status === "declined") {
    return { error: `A ${proposal.status} proposal can't be re-sent` };
  }
  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "sent" },
  });
  revalidatePath(`/app/proposals/${proposalId}`);
  revalidatePath("/app/proposals");
}

export async function deleteProposal(proposalId: string) {
  const workspace = await workspaceGuard();
  await prisma.proposal.deleteMany({
    where: { id: proposalId, workspaceId: workspace.id },
  });
  revalidatePath("/app/proposals");
  redirect("/app/proposals");
}
