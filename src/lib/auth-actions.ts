"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  workspace: z.string().min(1, "Workspace name is required"),
});

const DEFAULT_STAGES = [
  { name: "New", color: "#64748b" },
  { name: "Contacted", color: "#0ea5e9" },
  { name: "Proposal Sent", color: "#8b5cf6" },
  { name: "Negotiation", color: "#f59e0b" },
  { name: "Won", color: "#10b981" },
  { name: "Lost", color: "#ef4444" },
];

export async function registerAction(_prev: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    workspace: formData.get("workspace"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const slug = `${parsed.data.workspace.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 7)}`;

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      memberships: {
        create: {
          role: "owner",
          workspace: {
            create: {
              name: parsed.data.workspace,
              slug,
              pipelines: {
                create: {
                  name: "Sales Pipeline",
                  stages: {
                    create: DEFAULT_STAGES.map((s, i) => ({ ...s, position: i })),
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but automatic sign-in failed. Please log in." };
    }
  }

  redirect(`/app`);
}

export async function loginAction(_prev: unknown, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
  redirect("/app");
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
