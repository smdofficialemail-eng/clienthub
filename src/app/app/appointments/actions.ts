"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";

async function workspaceGuard() {
  const { workspace } = await requireWorkspace();
  return workspace;
}

const appointmentSchema = z.object({
  title: z.string().min(1, "Appointment title is required").max(120),
  clientName: z.string().max(120).nullish(),
  startsAt: z.string().min(1, "Pick a date and time"),
  durationMin: z.coerce.number().int().min(5).max(600).default(60),
  notes: z.string().max(2000).nullish(),
  leadId: z.string().nullish(),
});

export async function createAppointment(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();
  const parsed = appointmentSchema.safeParse({
    title: formData.get("title"),
    clientName: formData.get("clientName") || null,
    startsAt: formData.get("startsAt"),
    durationMin: formData.get("durationMin") || 60,
    notes: formData.get("notes") || null,
    leadId: formData.get("leadId") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const leadId = parsed.data.leadId || null;
  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId: workspace.id },
    });
    if (!lead) return { error: "Lead not found" };
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "Pick a valid date and time" };

  await prisma.appointment.create({
    data: {
      title: parsed.data.title.trim(),
      clientName: parsed.data.clientName || null,
      startsAt,
      durationMin: parsed.data.durationMin,
      notes: parsed.data.notes || null,
      leadId,
      workspaceId: workspace.id,
    },
  });
  revalidatePath("/app/appointments");
}

export async function setAppointmentStatus(appointmentId: string, status: string) {
  const workspace = await workspaceGuard();
  if (!["scheduled", "completed", "cancelled"].includes(status)) return;
  await prisma.appointment.updateMany({
    where: { id: appointmentId, workspaceId: workspace.id },
    data: { status },
  });
  revalidatePath("/app/appointments");
}

export async function deleteAppointment(appointmentId: string) {
  const workspace = await workspaceGuard();
  await prisma.appointment.deleteMany({
    where: { id: appointmentId, workspaceId: workspace.id },
  });
  revalidatePath("/app/appointments");
}
