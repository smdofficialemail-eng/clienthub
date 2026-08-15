"use client";

import { useState } from "react";

type SendAction = (invoiceId: string) => Promise<{ error?: string } | undefined>;
type MarkPaidAction = (invoiceId: string) => Promise<{ error?: string } | undefined>;
type DeleteAction = (invoiceId: string) => Promise<void>;

export function InvoiceControls({
  invoiceId,
  status,
  canSend,
  canMarkPaid,
  sendAction,
  markPaidAction,
  deleteAction,
}: {
  invoiceId: string;
  status: string;
  canSend: boolean;
  canMarkPaid: boolean;
  sendAction: SendAction;
  markPaidAction: MarkPaidAction;
  deleteAction: DeleteAction;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(kind: "send" | "paid") {
    setPending(kind);
    setError(null);
    const result =
      kind === "send" ? await sendAction(invoiceId) : await markPaidAction(invoiceId);
    if (result?.error) setError(result.error);
    setPending(null);
  }

  return (
    <div className="mb-6">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {canSend && (
          <button
            onClick={() => run("send")}
            disabled={pending !== null}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending === "send" ? "Marking…" : "Send to client"}
          </button>
        )}
        {canMarkPaid && (
          <button
            onClick={() => run("paid")}
            disabled={pending !== null}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending === "paid" ? "Marking…" : "✓ Mark as paid"}
          </button>
        )}
        {status === "paid" && (
          <p className="text-sm font-semibold text-emerald-600">
            🎉 This invoice has been paid in full.
          </p>
        )}
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
        >
          ⬇ Download PDF
        </a>
        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-red-600">Delete this invoice?</span>
              <button
                onClick={() => deleteAction(invoiceId)}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
