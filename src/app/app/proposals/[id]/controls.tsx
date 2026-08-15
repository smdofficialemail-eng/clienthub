"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type SendAction = (proposalId: string) => Promise<{ error?: string } | undefined>;
type DeleteAction = (proposalId: string) => Promise<void>;

export function ProposalControls({
  proposalId,
  publicUrl,
  status,
  canSend,
  sendAction,
  deleteAction,
}: {
  proposalId: string;
  publicUrl: string;
  status: string;
  canSend: boolean;
  sendAction: SendAction;
  deleteAction: DeleteAction;
}) {
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLive = status === "sent" || status === "viewed" || status === "approved" || status === "declined";

  async function handleSend() {
    setSending(true);
    setError(null);
    const result = await sendAction(proposalId);
    if (result?.error) setError(result.error);
    setSending(false);
  }

  async function handleCopy() {
    if (inputRef.current) {
      inputRef.current.select();
      try {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <div className="mb-6 space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
      )}

      {canSend ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            onClick={handleSend}
            disabled={sending}
            className="btn-primary px-4 py-2"
          >
            {sending ? "Sending…" : status === "draft" ? "Send to client" : "Re-send link"}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              ref={inputRef}
              readOnly
              value={publicUrl}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className="btn-secondary shrink-0 px-3 py-2 text-xs"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
          <a href={`/api/proposals/${proposalId}/pdf`} className="btn-secondary shrink-0 px-3 py-2 text-xs">
            ⬇ Download PDF
          </a>
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-red-600">Delete this proposal?</span>
              <button onClick={() => deleteAction(proposalId)} className="btn-danger px-3 py-1.5 text-xs">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost px-3 py-1.5 text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost shrink-0 px-3 py-2 text-xs hover:text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">
            {status === "approved"
              ? "🎉 Your client approved this proposal."
              : "Your client declined this proposal."}
          </p>
          <div className="flex items-center gap-2">
            <a href={`/api/proposals/${proposalId}/pdf`} className="btn-secondary px-3 py-2 text-xs">
              ⬇ Download PDF
            </a>
            <Link href={publicUrl} className="btn-secondary px-3 py-2 text-xs">
              Open client view ↗
            </Link>
          </div>
        </div>
      )}

      {isLive && (
        <p className="text-xs text-slate-400">
          Client link: <span className="font-mono">{publicUrl}</span>
        </p>
      )}
    </div>
  );
}
