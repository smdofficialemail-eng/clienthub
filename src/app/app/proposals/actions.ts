"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { extractItems, parseLayout, type ProposalLayout } from "@/lib/layout";

async function workspaceGuard() {
  const { workspace } = await requireWorkspace();
  return workspace;
}

const tableItemSchema = z.object({
  description: z.string().default(""),
  qty: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
});

const layoutBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["heading", "text", "table", "image", "divider", "shape"]),
  x: z.coerce.number().min(0).default(0),
  y: z.coerce.number().min(0).default(0),
  w: z.coerce.number().min(40).default(400),
  h: z.coerce.number().min(4).default(100),
  props: z.record(z.string(), z.any()).default({}),
});

const layoutSchema = z.object({
  version: z.literal(1).default(1),
  blocks: z.array(layoutBlockSchema).min(1, "Add at least one element to the design").max(80),
});

const detailsSchema = z.object({
  title: z.string().min(1, "Proposal title is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Enter a valid email"),
  intro: z.string().nullish(),
  leadId: z.string().nullish(),
});

type ParsedDetails = z.infer<typeof detailsSchema>;

function parseDetails(formData: FormData) {
  return detailsSchema.safeParse({
    title: formData.get("title"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    intro: formData.get("intro"),
    leadId: formData.get("leadId") || null,
  });
}

/** Validate the canvas layout and normalize it via the shared parser. */
function parseLayoutField(formData: FormData): { ok: true; layout: ProposalLayout } | { ok: false; error: string } {
  const raw = String(formData.get("layout") ?? "");
  if (!raw) return { ok: false, error: "The design is missing — add elements to the canvas first." };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "The design could not be read. Try saving again." };
  }
  const parsed = layoutSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid design" };
  }
  const normalized = parseLayout(parsed.data);
  if (!normalized) return { ok: false, error: "The design has no elements — add blocks to the canvas." };
  return { ok: true, layout: normalized };
}

async function validateLead(leadId: string | null, workspaceId: string) {
  if (!leadId) return null;
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId },
  });
  if (!lead) return { error: "Lead not found" };
  return null;
}

export async function createProposal(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();

  const details = parseDetails(formData);
  if (!details.success) {
    return { error: details.error.issues[0]?.message ?? "Invalid input" };
  }
  const leadError = await validateLead(details.data.leadId ?? null, workspace.id);
  if (leadError) return leadError;

  const layoutResult = parseLayoutField(formData);
  if (!layoutResult.ok) return { error: layoutResult.error };

  const items = extractItems(layoutResult.layout);
  const proposal = await prisma.proposal.create({
    data: {
      title: details.data.title,
      clientName: details.data.clientName,
      clientEmail: details.data.clientEmail,
      intro: details.data.intro || null,
      leadId: details.data.leadId || null,
      workspaceId: workspace.id,
      layout: layoutResult.layout as unknown as object,
      items: {
        create: items.map((item, i) => ({
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

export async function updateProposal(id: string, prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();

  const proposal = await prisma.proposal.findFirst({
    where: { id, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!proposal) return { error: "Proposal not found" };

  const details = parseDetails(formData);
  if (!details.success) {
    return { error: details.error.issues[0]?.message ?? "Invalid input" };
  }
  const leadError = await validateLead(details.data.leadId ?? null, workspace.id);
  if (leadError) return leadError;

  const layoutResult = parseLayoutField(formData);
  if (!layoutResult.ok) return { error: layoutResult.error };

  const items = extractItems(layoutResult.layout);
  await prisma.$transaction([
    prisma.proposal.update({
      where: { id },
      data: {
        title: details.data.title,
        clientName: details.data.clientName,
        clientEmail: details.data.clientEmail,
        intro: details.data.intro || null,
        leadId: details.data.leadId || null,
        layout: layoutResult.layout as unknown as object,
      },
    }),
    prisma.proposalItem.deleteMany({ where: { proposalId: id } }),
    ...items.map((item, i) =>
      prisma.proposalItem.create({
        data: {
          proposalId: id,
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          sortOrder: i,
        },
      })
    ),
  ]);

  revalidatePath(`/app/proposals/${id}`);
  revalidatePath("/app/proposals");
  redirect(`/app/proposals/${id}`);
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
