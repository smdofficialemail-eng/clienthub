"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";
import { sendTestEmail } from "@/lib/mail";

const settingsSchema = z.object({
  name: z.string().min(1, "Company name is required").max(60, "Keep it under 60 characters"),
  currency: z.string().min(1).max(8).default("USD"),
  smtpHost: z.string().max(200).nullish(),
  smtpPort: z.coerce.number().int().min(1).max(65535).nullish(),
  smtpUser: z.string().max(200).nullish(),
  smtpPass: z.string().max(500).nullish(),
  smtpFrom: z.string().max(200).nullish(),
});

export async function saveSettings(prev: unknown, formData: FormData) {
  const { workspace } = await requireWorkspace();

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency") || "USD",
    smtpHost: formData.get("smtpHost") || null,
    smtpPort: formData.get("smtpPort") || null,
    smtpUser: formData.get("smtpUser") || null,
    smtpPass: formData.get("smtpPass") || null,
    smtpFrom: formData.get("smtpFrom") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      name: parsed.data.name.trim(),
      currency: parsed.data.currency,
      smtpHost: parsed.data.smtpHost || null,
      smtpPort: parsed.data.smtpPort || null,
      smtpUser: parsed.data.smtpUser || null,
      smtpPass: parsed.data.smtpPass || null,
      smtpFrom: parsed.data.smtpFrom || null,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/settings");
  return { success: true, error: null };
}

const testEmailSchema = z.object({
  to: z.string().email("Enter a valid email address"),
});

export async function sendTestEmailAction(prev: unknown, formData: FormData) {
  const { workspace } = await requireWorkspace();

  const parsed = testEmailSchema.safeParse({ to: formData.get("to") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  try {
    const result = await sendTestEmail(workspace, parsed.data.to);
    if (!result.ok) return { error: result.error };
    return { success: true, error: null };
  } catch (err) {
    return {
      error:
        err instanceof Error ? `Couldn't connect: ${err.message}` : "Couldn't send the test email",
    };
  }
}
