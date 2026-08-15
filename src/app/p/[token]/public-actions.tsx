"use client";

import { useState } from "react";
import { approveProposal, declineProposal } from "./actions";

export function PublicActions({
  token,
  clientName,
}: {
  token: string;
  clientName: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  async function handle(kind: "approve" | "decline") {
    setPending(kind);
    setError(null);
    const action = kind === "approve" ? approveProposal : declineProposal;
    const result = await action(token);
    if (result?.error) setError(result.error);
    setPending(null);
    // On success the page re-renders server-side with the new status.
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {confirmingDecline ? (
        <div className="text-center">
          <p className="font-extrabold text-slate-900">Decline this proposal?</p>
          <p className="mt-1 text-sm text-slate-500">
            {clientName}, you can always ask us to revise it.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setConfirmingDecline(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
            >
              Keep reviewing
            </button>
            <button
              onClick={() => handle("decline")}
              disabled={pending === "decline"}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {pending === "decline" ? "Submitting…" : "Yes, decline"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setConfirmingDecline(true)}
            disabled={pending !== null}
            className="w-full rounded-lg border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
          >
            Decline
          </button>
          <button
            onClick={() => handle("approve")}
            disabled={pending !== null}
            className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
          >
            {pending === "approve" ? "Submitting…" : "✓ Approve proposal"}
          </button>
        </div>
      )}
    </div>
  );
}
