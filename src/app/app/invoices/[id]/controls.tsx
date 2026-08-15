"use client";

import { useState } from "react";

type SendAction = (invoiceId: string) => Promise<{ error?: string } | undefined>;
type EmailAction = (invoiceId: string) => Promise<{ error?: string; ok?: boolean } | undefined>;
type MarkPaidAction = (invoiceId: string) => Promise<{ error?: string } | undefined>;
type DeleteAction = (invoiceId: string) => Promise<void>;

export function InvoiceControls({
  invoiceId,
  status,
  canSend,
  canMarkPaid,
  sendAction,
  emailAction,
  markPaidAction,
  deleteAction,
}: {
  invoiceId: string;
  status: string;
  canSend: boolean;
  canMarkPaid: boolean;
  sendAction: SendAction;
  emailAction: EmailAction;
  markPaidAction: MarkPaidAction;
  deleteAction: DeleteAction;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(kind: "send" | "email" | "paid") {
    setPending(kind);
    setError(null);
    const result =
      kind === "send"
        ? await sendAction(invoiceId)
        : kind === "email"
          ? await emailAction(invoiceId)
          : await markPaidAction(invoiceId);
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
            className="btn-primary px-4 py-2"
          >
            {pending === "send" ? "Marking…" : "Send to client"}
          </button>
        )}
        {status !== "paid" && (
          <button
            onClick={() => run("email")}
            disabled={pending !== null}
            className="btn-secondary px-4 py-2"
            title="Email the invoice to the client with the PDF attached"
          >
            {pending === "email" ? "Sending…" : "✉ Email invoice"}
          </button>
        )}
        {canMarkPaid && (
          <button
            onClick={() => run("paid")}
            disabled={pending !== null}
            className="btn-success px-4 py-2"
          >
            {pending === "paid" ? "Marking…" : "✓ Mark as paid"}
          </button>
        )}
        {status === "paid" && (
          <p className="text-sm font-semibold text-emerald-600">
            🎉 This invoice has been paid in full.
          </p>
        )}
        <a href={`/api/invoices/${invoiceId}/pdf`} className="btn-secondary px-3 py-2 text-xs">
          ⬇ Download PDF
        </a>
        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-red-600">Delete this invoice?</span>
              <button onClick={() => deleteAction(invoiceId)} className="btn-danger px-3 py-1.5 text-xs">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost px-3 py-1.5 text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost px-3 py-2 text-xs hover:text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
