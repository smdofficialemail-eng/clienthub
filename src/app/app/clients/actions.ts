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

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(120),
  company: z.string().max(120).nullish(),
  email: z.string().email("Enter a valid email").nullish().or(z.literal("")),
  phone: z.string().max(40).nullish(),
  website: z.string().max(200).nullish(),
  address: z.string().max(300).nullish(),
  industry: z.string().max(80).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function createClient(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    website: formData.get("website") || null,
    address: formData.get("address") || null,
    industry: formData.get("industry") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name.trim(),
      company: parsed.data.company?.trim() || null,
      email: parsed.data.email?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      website: parsed.data.website?.trim() || null,
      address: parsed.data.address?.trim() || null,
      industry: parsed.data.industry?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      workspaceId: workspace.id,
    },
  });

  revalidatePath("/app/clients");
  revalidatePath("/app");
  redirect(`/app/clients/${client.id}`);
}

export async function updateClient(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();
  const clientId = String(formData.get("id") ?? "");
  const existing = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: workspace.id },
  });
  if (!existing) return { error: "Client not found" };

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    website: formData.get("website") || null,
    address: formData.get("address") || null,
    industry: formData.get("industry") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: parsed.data.name.trim(),
      company: parsed.data.company?.trim() || null,
      email: parsed.data.email?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      website: parsed.data.website?.trim() || null,
      address: parsed.data.address?.trim() || null,
      industry: parsed.data.industry?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${clientId}`);
  redirect(`/app/clients/${clientId}`);
}

export async function deleteClient(clientId: string) {
  const workspace = await workspaceGuard();
  await prisma.client.deleteMany({ where: { id: clientId, workspaceId: workspace.id } });
  revalidatePath("/app/clients");
  revalidatePath("/app");
  redirect("/app/clients");
}
