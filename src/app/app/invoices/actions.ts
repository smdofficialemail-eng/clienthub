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

const invoiceSchema = z.object({
  title: z.string().min(1, "Invoice title is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Enter a valid email"),
  intro: z.string().nullish(),
  dueDate: z.string().nullish(),
  proposalId: z.string().nullish(),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
});

function nextInvoiceNumber(count: number) {
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

export async function createInvoice(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();

  let itemsJson: unknown;
  try {
    itemsJson = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    itemsJson = [];
  }

  const parsed = invoiceSchema.safeParse({
    title: formData.get("title"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    intro: formData.get("intro"),
    dueDate: formData.get("dueDate"),
    proposalId: formData.get("proposalId") || null,
    items: itemsJson,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Validate the proposal belongs to this workspace when one is chosen.
  const proposalId = parsed.data.proposalId ?? null;
  if (proposalId) {
    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, workspaceId: workspace.id },
    });
    if (!proposal) return { error: "Proposal not found" };
    const existing = await prisma.invoice.findUnique({ where: { proposalId } });
    if (existing) return { error: "An invoice already exists for this proposal" };
  }

  const [count] = await Promise.all([
    prisma.invoice.count({ where: { workspaceId: workspace.id } }),
  ]);

  const invoice = await prisma.invoice.create({
    data: {
      number: nextInvoiceNumber(count),
      title: parsed.data.title,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      intro: parsed.data.intro || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      proposalId,
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

  revalidatePath("/app/invoices");
  revalidatePath("/app");
  redirect(`/app/invoices/${invoice.id}`);
}

export async function markInvoiceSent(invoiceId: string) {
  const workspace = await workspaceGuard();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: workspace.id },
  });
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "paid") return { error: "A paid invoice can't be re-sent" };
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent" },
  });
  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath("/app/invoices");
}

export async function markInvoicePaid(invoiceId: string) {
  const workspace = await workspaceGuard();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: workspace.id },
  });
  if (!invoice) return { error: "Invoice not found" };
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date() },
  });
  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath("/app/invoices");
  revalidatePath("/app");
}

export async function deleteInvoice(invoiceId: string) {
  const workspace = await workspaceGuard();
  await prisma.invoice.deleteMany({
    where: { id: invoiceId, workspaceId: workspace.id },
  });
  revalidatePath("/app/invoices");
  redirect("/app/invoices");
}
