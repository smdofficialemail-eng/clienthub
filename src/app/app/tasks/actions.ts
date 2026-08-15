"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";

async function workspaceGuard() {
  const { workspace } = await requireWorkspace();
  return workspace;
}

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(120),
  dueDate: z.string().nullish(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  leadId: z.string().nullish(),
});

export async function createTask(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    dueDate: formData.get("dueDate") || null,
    priority: formData.get("priority") || "normal",
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

  await prisma.task.create({
    data: {
      title: parsed.data.title.trim(),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority,
      leadId,
      workspaceId: workspace.id,
    },
  });
  revalidatePath("/app/tasks");
}

export async function toggleTask(taskId: string) {
  const workspace = await workspaceGuard();
  const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId: workspace.id } });
  if (!task) return;
  await prisma.task.update({ where: { id: taskId }, data: { done: !task.done } });
  revalidatePath("/app/tasks");
  revalidatePath("/app/pipeline");
}

export async function deleteTask(taskId: string) {
  const workspace = await workspaceGuard();
  await prisma.task.deleteMany({ where: { id: taskId, workspaceId: workspace.id } });
  revalidatePath("/app/tasks");
  revalidatePath("/app/pipeline");
}
