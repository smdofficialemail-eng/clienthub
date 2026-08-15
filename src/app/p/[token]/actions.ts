"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const tokenSchema = z.string().min(1);

async function findByToken(token: unknown) {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return null;
  return prisma.proposal.findUnique({
    where: { token: parsed.data },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function approveProposal(token: string) {
  const proposal = await findByToken(token);
  if (!proposal) return { error: "Proposal not found" };
  if (proposal.status !== "sent" && proposal.status !== "viewed") {
    return { error: `A ${proposal.status} proposal can't be approved` };
  }
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "approved" },
  });
  revalidatePath(`/p/${token}`);
}

export async function declineProposal(token: string) {
  const proposal = await findByToken(token);
  if (!proposal) return { error: "Proposal not found" };
  if (proposal.status !== "sent" && proposal.status !== "viewed") {
    return { error: `A ${proposal.status} proposal can't be declined` };
  }
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "declined" },
  });
  revalidatePath(`/p/${token}`);
}
