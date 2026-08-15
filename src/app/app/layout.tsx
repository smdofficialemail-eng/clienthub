import { requireWorkspace } from "@/lib/app";
import { Sidebar } from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, role } = await requireWorkspace();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        workspaceName={workspace.name}
        userName={user.name ?? user.email ?? "User"}
        role={role}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
