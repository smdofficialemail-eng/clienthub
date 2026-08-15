import { requireWorkspace } from "@/lib/app";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, role } = await requireWorkspace();

  return (
    <AppShell
      workspaceName={workspace.name}
      userName={user.name ?? user.email ?? "User"}
      role={role}
    >
      {children}
    </AppShell>
  );
}
