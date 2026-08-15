import { requireWorkspace } from "@/lib/app";
import { saveSettings } from "./actions";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings — ClientHub" };

export default async function SettingsPage() {
  const { workspace } = await requireWorkspace();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Company details, currency, and the email connection used to send invoices to clients.
        </p>
      </div>

      <SettingsForm
        workspace={{
          name: workspace.name,
          currency: workspace.currency,
          smtpHost: workspace.smtpHost,
          smtpPort: workspace.smtpPort,
          smtpUser: workspace.smtpUser,
          smtpPass: workspace.smtpPass,
          smtpFrom: workspace.smtpFrom,
        }}
        action={saveSettings}
      />
    </div>
  );
}
