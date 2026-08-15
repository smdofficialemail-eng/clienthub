"use client";

import { useActionState } from "react";
import Link from "next/link";

type ClientDefaults = {
  id?: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  industry: string | null;
  notes: string | null;
};

export function ClientForm({
  defaults,
  action,
  submitLabel,
}: {
  defaults: ClientDefaults;
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string } | undefined>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-400">
          Contact details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Client name *</label>
            <input name="name" required defaultValue={defaults.name} className="input" />
          </div>
          <div>
            <label className="label">Company</label>
            <input name="company" defaultValue={defaults.company ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={defaults.email ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" defaultValue={defaults.phone ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Industry</label>
            <input
              name="industry"
              defaultValue={defaults.industry ?? ""}
              placeholder="e.g. SaaS, Retail, Healthcare"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Website</label>
            <input
              name="website"
              defaultValue={defaults.website ?? ""}
              placeholder="https://example.com"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input
              name="address"
              defaultValue={defaults.address ?? ""}
              placeholder="Street, City, Country"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={defaults.notes ?? ""}
              placeholder="Preferences, context, billing terms…"
              className="input"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link href={defaults.id ? `/app/clients/${defaults.id}` : "/app/clients"} className="btn-ghost px-4 py-2">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
