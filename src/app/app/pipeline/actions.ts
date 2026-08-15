"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/app";

async function workspaceGuard() {
  const { workspace } = await requireWorkspace();
  return workspace;
}

const stageSchema = z.object({ name: z.string().min(1).max(60) });
const leadSchema = z.object({
  name: z.string().min(1, "Lead name is required"),
  company: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  value: z.coerce.number().min(0).default(0),
  source: z.string().nullish(),
  notes: z.string().nullish(),
});

export async function createStage(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();
  const parsed = stageSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });
  if (!pipeline) return { error: "No pipeline found" };

  const maxPos = await prisma.pipelineStage.aggregate({
    where: { pipelineId: pipeline.id },
    _max: { position: true },
  });
  await prisma.pipelineStage.create({
    data: {
      name: parsed.data.name,
      pipelineId: pipeline.id,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });
  revalidatePath("/app/pipeline");
}

export async function deleteStage(stageId: string) {
  const workspace = await workspaceGuard();
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipeline: { workspaceId: workspace.id } },
    include: { pipeline: true },
  });
  if (!stage) return { error: "Stage not found" };

  // Reassign leads to the first stage so they are never orphaned.
  const firstStage = await prisma.pipelineStage.findFirst({
    where: { pipelineId: stage.pipelineId },
    orderBy: { position: "asc" },
  });
  await prisma.$transaction([
    prisma.lead.updateMany({
      where: { stageId },
      data: { stageId: firstStage ? firstStage.id : null },
    }),
    prisma.pipelineStage.delete({ where: { id: stageId } }),
  ]);
  revalidatePath("/app/pipeline");
}

export async function createLead(prev: unknown, formData: FormData) {
  const workspace = await workspaceGuard();
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    value: formData.get("value"),
    source: formData.get("source"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  if (!pipeline) return { error: "No pipeline found" };

  const firstStage = pipeline.stages[0];
  await prisma.lead.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      value: parsed.data.value,
      source: parsed.data.source || null,
      notes: parsed.data.notes || null,
      stageId: firstStage?.id ?? null,
      pipelineId: pipeline.id,
      workspaceId: workspace.id,
    },
  });
  revalidatePath("/app/pipeline");
}

export async function moveLead(leadId: string, stageId: string) {
  const workspace = await workspaceGuard();
  await prisma.lead.updateMany({
    where: { id: leadId, workspaceId: workspace.id },
    data: { stageId, status: stageId ? undefined : "active" },
  });
  revalidatePath("/app/pipeline");
}

export async function updateLeadNotes(leadId: string, notes: string) {
  const workspace = await workspaceGuard();
  await prisma.lead.updateMany({
    where: { id: leadId, workspaceId: workspace.id },
    data: { notes },
  });
  revalidatePath("/app/pipeline");
}

export async function addActivity(formData: FormData) {
  const workspace = await workspaceGuard();
  const session = await (await import("@/lib/app")).getSession();
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "note");
  const leadId = String(formData.get("leadId") ?? "");
  if (!body || !leadId) return;

  await prisma.activity.create({
    data: { body, type, leadId, userId: session?.user?.id ?? null },
  });
  revalidatePath("/app/pipeline");
}

export async function addTask(formData: FormData) {
  const workspace = await workspaceGuard();
  const title = String(formData.get("title") ?? "").trim();
  const leadId = String(formData.get("leadId") ?? "");
  if (!title || !leadId) return;

  await prisma.task.create({ data: { title, leadId, workspaceId: workspace.id } });
  revalidatePath("/app/pipeline");
}

export async function toggleTask(taskId: string) {
  const workspace = await workspaceGuard();
  const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId: workspace.id } });
  if (!task) return;
  await prisma.task.update({ where: { id: taskId }, data: { done: !task.done } });
  revalidatePath("/app/pipeline");
}

export async function convertToClient(leadId: string) {
  const workspace = await workspaceGuard();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId: workspace.id } });
  if (!lead) return { error: "Lead not found" };

  const existing = await prisma.client.findUnique({ where: { leadId } });
  if (existing) return { error: "Already a client" };

  await prisma.$transaction([
    prisma.client.create({
      data: {
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        leadId: lead.id,
        workspaceId: workspace.id,
      },
    }),
    prisma.lead.update({ where: { id: leadId }, data: { status: "won" } }),
  ]);
  revalidatePath("/app/pipeline");
  revalidatePath("/app/clients");
}
