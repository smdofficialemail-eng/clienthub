"use client";

import { useActionState } from "react";
import { saveSettings, sendTestEmailAction } from "./actions";

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar ($)" },
  { code: "EUR", label: "EUR — Euro (€)" },
  { code: "GBP", label: "GBP — British Pound (£)" },
  { code: "INR", label: "INR — Indian Rupee (₹)" },
  { code: "AUD", label: "AUD — Australian Dollar (A$)" },
  { code: "CAD", label: "CAD — Canadian Dollar (C$)" },
  { code: "SGD", label: "SGD — Singapore Dollar (S$)" },
  { code: "AED", label: "AED — UAE Dirham (د.إ)" },
  { code: "JPY", label: "JPY — Japanese Yen (¥)" },
  { code: "ZAR", label: "ZAR — South African Rand (R)" },
  { code: "BRL", label: "BRL — Brazilian Real (R$)" },
  { code: "MXN", label: "MXN — Mexican Peso (MX$)" },
];

export function SettingsForm({
  workspace,
  action,
}: {
  workspace: {
    name: string;
    currency: string;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPass: string | null;
    smtpFrom: string | null;
  };
  action: (prev: unknown, formData: FormData) => Promise<{ error: string | null; success?: boolean }>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [emailState, emailAction, emailPending] = useActionState(sendTestEmailAction, undefined);

  return (
    <div className="space-y-5">
      {state?.success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600 ring-1 ring-emerald-100">
          ✓ Settings saved — they apply across the app, documents, PDFs and emails.
        </p>
      )}
      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <form action={formAction} className="space-y-5">
        {/* Company details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">
            Company details
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            The name clients see on proposals and invoices.
          </p>
          <label className="label">Company name</label>
          <input
            name="name"
            defaultValue={workspace.name}
            required
            maxLength={60}
            placeholder="e.g. Acme Agency"
            className="input"
          />
        </section>

        {/* Currency */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">
            Currency
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Used everywhere money appears — the dashboard, pipeline, proposals, invoices and PDFs.
          </p>
          <label className="label">Default currency</label>
          <select name="currency" defaultValue={workspace.currency} className="input">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </section>

        {/* Email (SMTP) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">
            Email (SMTP)
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Connect your provider (Gmail, Outlook, SendGrid, Mailgun…) so you can email invoices
            straight to clients with the PDF attached.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">SMTP host</label>
              <input
                name="smtpHost"
                defaultValue={workspace.smtpHost ?? ""}
                placeholder="smtp.gmail.com"
                className="input"
              />
            </div>
            <div>
              <label className="label">SMTP port</label>
              <input
                name="smtpPort"
                type="number"
                defaultValue={workspace.smtpPort ?? 587}
                placeholder="587"
                className="input"
              />
            </div>
            <div>
              <label className="label">Username</label>
              <input
                name="smtpUser"
                defaultValue={workspace.smtpUser ?? ""}
                placeholder="you@gmail.com"
                autoComplete="off"
                className="input"
              />
            </div>
            <div>
              <label className="label">Password / app password</label>
              <input
                name="smtpPass"
                type="password"
                defaultValue={workspace.smtpPass ?? ""}
                placeholder="••••••••"
                autoComplete="new-password"
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">From address (optional)</label>
              <input
                name="smtpFrom"
                defaultValue={workspace.smtpFrom ?? ""}
                placeholder="Acme Agency <billing@acme.com>"
                className="input"
              />
              <p className="mt-1 text-xs text-slate-400">
                Defaults to your username if left blank.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button type="submit" disabled={pending} className="btn-primary px-5 py-2">
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {/* Test email */}
      <form action={emailAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Test email
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Save your SMTP details above first, then send a test message to confirm they work.
        </p>
        {emailState?.success && (
          <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
            ✓ Test email sent — check your inbox.
          </p>
        )}
        {emailState?.error && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {emailState.error}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="to"
            type="email"
            required
            placeholder="you@yourcompany.com"
            className="input flex-1"
          />
          <button type="submit" disabled={emailPending} className="btn-secondary px-4 py-2">
            {emailPending ? "Sending…" : "Send test email"}
          </button>
        </div>
      </form>
    </div>
  );
}
