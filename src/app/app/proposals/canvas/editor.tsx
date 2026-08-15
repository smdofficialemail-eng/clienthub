"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createProposal, updateProposal } from "../actions";
import { formatMoney } from "@/lib/format";
import { LayoutViewer } from "@/components/layout-viewer";
import { TEMPLATES, type ProposalTemplate } from "@/lib/templates";
import {
  CANVAS_H,
  CANVAS_W,
  clamp,
  makeBlock,
  totalOf,
  type BlockType,
  type LayoutBlock,
  type ProposalLayout,
  type TableItem,
} from "@/lib/layout";

type LeadOption = { id: string; name: string; company: string | null };

type EditorProps = {
  mode: "create" | "edit";
  proposalId?: string;
  leads: LeadOption[];
  preselectLeadId?: string | null;
  preselectClientName?: string | null;
  currency: string;
  initialDetails?: { title: string; clientName: string; clientEmail: string; intro: string | null; leadId: string | null } | null;
  initialLayout?: ProposalLayout | null;
};

const PALETTE: { type: BlockType; label: string; icon: string; hint: string }[] = [
  { type: "heading", label: "Heading", icon: "T", hint: "Big bold title" },
  { type: "text", label: "Text", icon: "¶", hint: "Paragraph" },
  { type: "table", label: "Price table", icon: "≡", hint: "Line items + total" },
  { type: "image", label: "Image", icon: "◫", hint: "Logo or photo" },
  { type: "shape", label: "Shape", icon: "▭", hint: "Band or accent block" },
  { type: "divider", label: "Divider", icon: "—", hint: "Horizontal line" },
];

function starterLayout(): LayoutBlock[] {
  const heading = makeBlock("heading");
  const text = makeBlock("text");
  const table = makeBlock("table");
  heading.x = 64; heading.y = 64;
  text.x = 64; text.y = 156;
  table.x = 64; table.y = 316;
  return [heading, text, table];
}

const ZOOMS = [1, 0.75, 0.5];

export function ProposalEditor({
  mode,
  proposalId,
  leads,
  preselectLeadId,
  preselectClientName,
  currency,
  initialDetails,
  initialLayout,
}: EditorProps) {
  const boundAction = useMemo(
    () => (mode === "edit" && proposalId ? updateProposal.bind(null, proposalId) : createProposal),
    [mode, proposalId]
  );
  const [state, action, pending] = useActionState(boundAction, undefined);

  const [blocks, setBlocks] = useState<LayoutBlock[]>(() =>
    initialLayout?.blocks?.length
      ? initialLayout.blocks.map((b) => ({ ...b, props: { ...b.props } }))
      : starterLayout()
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [zoom, setZoom] = useState(0.75);
  const [drag, setDrag] = useState<{
    kind: "move" | "resize";
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const cascadeRef = useRef(blocks.length);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const layoutJson = useMemo(
    () => JSON.stringify({ version: 1, blocks } satisfies ProposalLayout),
    [blocks]
  );

  // Keyboard: delete selected, nudge with arrows, escape to deselect.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setBlocks((prev) => prev.filter((b) => b.id !== selectedId));
        setSelectedId(null);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === selectedId
              ? {
                  ...b,
                  x: clamp(b.x + dx, 0, CANVAS_W - b.w),
                  y: clamp(b.y + dy, 0, CANVAS_H - b.h),
                }
              : b
          )
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function addBlock(type: BlockType, pos?: { x: number; y: number }) {
    const block = makeBlock(type, cascadeRef.current++);
    if (pos) block.x = pos.x;
    if (pos) block.y = pos.y;
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  }

  function applyTemplate(template: ProposalTemplate | "blank") {
    setBlocks(template === "blank" ? starterLayout() : template.create().blocks);
    setSelectedId(null);
    setShowTemplates(false);
  }

  function startDrag(e: React.PointerEvent, id: string, kind: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    setSelectedId(id);
    setDrag({
      kind,
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: block.x,
      origY: block.y,
      origW: block.w,
      origH: block.h,
    });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // pointer capture is a progressive enhancement
    }
  }

  function onDragMove(e: React.PointerEvent) {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / zoom;
    const dy = (e.clientY - drag.startY) / zoom;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== drag.id) return b;
        if (drag.kind === "move") {
          return {
            ...b,
            x: clamp(drag.origX + dx, 0, CANVAS_W - b.w),
            y: clamp(drag.origY + dy, 0, CANVAS_H - b.h),
          };
        }
        return {
          ...b,
          w: clamp(drag.origW + dx, 60, CANVAS_W - b.x),
          h: clamp(drag.origH + dy, 32, CANVAS_H - b.y),
        };
      })
    );
  }

  function updateBlock(id: string, patch: Partial<LayoutBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function updateProps(id: string, patch: Partial<LayoutBlock["props"]>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)));
  }

  function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain") as BlockType;
    if (!PALETTE.some((p) => p.type === type)) return;
    const rect = canvasAreaRef.current?.getBoundingClientRect();
    if (!rect) {
      addBlock(type);
      return;
    }
    addBlock(type, {
      x: clamp((e.clientX - rect.left) / zoom - 60, 0, CANVAS_W - 120),
      y: clamp((e.clientY - rect.top) / zoom - 20, 0, CANVAS_H - 80),
    });
  }

  return (
    <form
      action={action}
      className="flex min-h-screen flex-col"
      onSubmit={() => undefined}
    >
      {state?.error && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-center text-sm font-semibold text-red-600">
          {state.error}
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <Link
          href="/app/proposals"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
          aria-label="Back to proposals"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <input
          name="title"
          required
          defaultValue={initialDetails?.title ?? ""}
          placeholder="Proposal title — e.g. Website redesign"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-base font-extrabold tracking-tight text-slate-900 outline-none transition placeholder:font-semibold placeholder:text-slate-300 hover:border-slate-200 focus:border-brand-400 focus:bg-white"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="mr-1 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
            title="Browse design templates"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span className="hidden sm:inline">Templates</span>
          </button>
          {ZOOMS.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                zoom === z ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {z * 100}%
            </button>
          ))}
          <button
            type="submit"
            disabled={pending}
            className="btn-primary ml-1 px-5 py-2"
          >
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create proposal"}
          </button>
        </div>
      </header>

      {/* Details strip */}
      <div className="grid gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 sm:grid-cols-3">
        <div>
          <label className="label">Client name *</label>
          <input
            name="clientName"
            required
            defaultValue={initialDetails?.clientName ?? preselectClientName ?? undefined}
            placeholder="Jane Doe"
            className="input"
          />
        </div>
        <div>
          <label className="label">Client email *</label>
          <input
            name="clientEmail"
            type="email"
            required
            defaultValue={initialDetails?.clientEmail ?? undefined}
            placeholder="jane@acme.com"
            className="input"
          />
        </div>
        <div>
          <label className="label">Link to lead (optional)</label>
          <select
            name="leadId"
            defaultValue={preselectLeadId ?? initialDetails?.leadId ?? ""}
            className="input"
          >
            <option value="">No lead — standalone proposal</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
                {lead.company ? ` — ${lead.company}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="label">Short note (optional)</label>
          <input
            name="intro"
            defaultValue={initialDetails?.intro ?? undefined}
            placeholder="A one-line note shown under the client details — e.g. 'Proposal for the Q3 website project'"
            className="input"
          />
        </div>
      </div>

      <input type="hidden" name="layout" value={layoutJson} />

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-pop">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Design templates</h2>
                <p className="text-sm text-slate-500">Start from a designed layout — your details stay intact.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close templates"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TemplateCard
                name="Blank canvas"
                description="Start from scratch"
                accent="#94a3b8"
                onUse={() => applyTemplate("blank")}
              />
              {TEMPLATES.map((t) => (
                <TemplateCard
                  key={t.id}
                  name={t.name}
                  description={t.description}
                  accent={t.accent}
                  layout={t.create()}
                  onUse={() => applyTemplate(t)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workspace */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Palette */}
        <aside className="shrink-0 border-b border-slate-200 bg-white p-2.5 md:w-56 md:border-b-0 md:border-r md:p-3">
          <p className="mb-2 hidden text-[11px] font-extrabold uppercase tracking-widest text-slate-400 md:block">
            Elements
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {PALETTE.map((item) => (
              <button
                key={item.type}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", item.type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => addBlock(item.type)}
                className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-brand-400 hover:bg-brand-50/60 hover:shadow-sm active:scale-[0.98]"
                title={`${item.label} — ${item.hint}. Click to add, or drag onto the page.`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-extrabold text-slate-600">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800">{item.label}</span>
                  <span className="hidden text-xs text-slate-400 md:block">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <div
          ref={canvasAreaRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
          onPointerDown={(e) => {
            // Click on empty canvas deselects.
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
          className="relative min-h-0 flex-1 overflow-auto bg-slate-200/50 p-4 sm:p-6"
        >
          <div
            className="relative mx-auto"
            style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}
          >
            <div
              className="relative overflow-hidden bg-white shadow-2xl ring-1 ring-slate-900/10"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              {blocks.map((b) => (
                <CanvasBlock
                  key={b.id}
                  block={b}
                  selected={b.id === selectedId}
                  currency={currency}
                  onPointerDown={(e) => startDrag(e, b.id, "move")}
                  onPointerMove={onDragMove}
                  onPointerUp={() => setDrag(null)}
                  onResizeDown={(e) => startDrag(e, b.id, "resize")}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Properties */}
        <aside
        className={`${
          selected ? "block" : "hidden"
        } fixed inset-x-0 bottom-0 z-40 max-h-[50vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-6 shadow-pop lg:block lg:static lg:z-auto lg:max-h-none lg:w-80 lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:p-4 lg:shadow-none`}
        >
          {selected ? (
            <BlockPanel
              block={selected}
              currency={currency}
              onChange={(patch) => updateBlock(selected.id, patch)}
              onPropsChange={(patch) => updateProps(selected.id, patch)}
              onDelete={() => {
                setBlocks((prev) => prev.filter((b) => b.id !== selected.id));
                setSelectedId(null);
              }}
            />
          ) : (
            <TipsPanel />
          )}
        </aside>
      </div>
    </form>
  );
}

function CanvasBlock({
  block: b,
  selected,
  currency,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResizeDown,
}: {
  block: LayoutBlock;
  selected: boolean;
  currency: string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onResizeDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute select-none rounded-md transition-shadow ${
        selected ? "z-30 ring-2 ring-brand-500/90 shadow-lg" : "z-10 hover:ring-1 hover:ring-brand-300"
      }`}
      style={{
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        cursor: "move",
        touchAction: "none",
      }}
    >
      <div className="h-full w-full overflow-hidden">
        <BlockContent block={b} currency={currency} />
      </div>

      {selected && (
        <>
          <span className="pointer-events-none absolute -top-7 left-0 rounded-md bg-brand-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
            {b.type}
          </span>
          {/* Resize handle */}
          <div
            onPointerDown={onResizeDown}
            className="absolute -right-1.5 -bottom-1.5 size-4 cursor-nwse-resize rounded-sm border-2 border-white bg-brand-600 shadow"
            style={{ touchAction: "none" }}
            aria-label="Resize"
          />
        </>
      )}
    </div>
  );
}

function BlockContent({ block: b, currency }: { block: LayoutBlock; currency: string }) {
  const p = b.props;
  switch (b.type) {
    case "heading":
      return (
        <div
          className="break-words leading-tight"
          style={{
            fontSize: p.fontSize ?? 34,
            color: p.color ?? "#0f172a",
            textAlign: p.align ?? "left",
            fontWeight: p.bold ? 800 : 700,
            fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {p.text || "Double-tap to edit"}
        </div>
      );
    case "text":
      return (
        <div
          className="whitespace-pre-wrap break-words leading-snug"
          style={{
            fontSize: p.fontSize ?? 13,
            color: p.color ?? "#475569",
            textAlign: p.align ?? "left",
            fontWeight: p.bold ? 700 : 400,
            fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {p.text || "Your text here"}
        </div>
      );
    case "table": {
      const items = p.items ?? [];
      const total = totalOf(items);
      return (
        <div className="flex h-full w-full flex-col justify-center overflow-hidden">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b-2 border-slate-800 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-1 text-left">Item</th>
                <th className="w-10 py-1 text-right">Qty</th>
                <th className="w-20 py-1 text-right">Unit</th>
                <th className="w-20 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 text-slate-700">
                  <td className="py-1 pr-2 font-semibold">{item.description || "Untitled item"}</td>
                  <td className="py-1 text-right text-slate-500">{item.qty}</td>
                  <td className="py-1 text-right text-slate-500">{formatMoney(item.unitPrice, currency)}</td>
                  <td className="py-1 text-right font-bold">{formatMoney(item.qty * item.unitPrice, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-1.5 text-right text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                  Total
                </td>
                <td className="py-1.5 text-right text-sm font-extrabold text-slate-900">
                  {formatMoney(total, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }
    case "image":
      return p.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url} alt="" className="h-full w-full object-contain" draggable={false} />
      ) : (
        <div className="grid h-full w-full place-items-center rounded-md border-2 border-dashed border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-400">
          Add an image URL in the panel →
        </div>
      );
    case "divider":
      return (
        <div className="flex h-full w-full items-center">
          <div
            className="w-full"
            style={{
              borderTop: `${p.thickness ?? 2}px solid ${p.color ?? "#e2e8f0"}`,
            }}
          />
        </div>
      );
    case "shape":
      return (
        <div
          className="h-full w-full"
          style={{
            background: p.fill ?? "#4f46e5",
            borderRadius: (p.radius ?? 0) > 0 ? p.radius : undefined,
          }}
        />
      );
  }
}

function BlockPanel({
  block,
  currency,
  onChange,
  onPropsChange,
  onDelete,
}: {
  block: LayoutBlock;
  currency: string;
  onChange: (patch: Partial<LayoutBlock>) => void;
  onPropsChange: (patch: Partial<LayoutBlock["props"]>) => void;
  onDelete: () => void;
}) {
  const p = block.props;
  const isTextLike = block.type === "heading" || block.type === "text";
  const isTable = block.type === "table";
  const isImage = block.type === "image";
  const isDivider = block.type === "divider";
  const isShape = block.type === "shape";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400 capitalize">
          {block.type}
        </h3>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {isTextLike && (
        <>
          <div>
            <label className="label">Text</label>
            <textarea
              rows={isTextLike && block.type === "text" ? 6 : 2}
              value={p.text ?? ""}
              onChange={(e) => onPropsChange({ text: e.target.value })}
              className="input resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Font size</label>
              <input
                type="number"
                min={8}
                max={120}
                value={p.fontSize ?? (block.type === "heading" ? 34 : 13)}
                onChange={(e) => onPropsChange({ fontSize: Number(e.target.value) || 12 })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Text color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={p.color ?? "#0f172a"}
                  onChange={(e) => onPropsChange({ color: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                />
                <input
                  type="text"
                  value={p.color ?? "#0f172a"}
                  onChange={(e) => onPropsChange({ color: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Align</label>
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => onPropsChange({ align: a })}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold capitalize transition ${
                      (p.align ?? "left") === a ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Bold</label>
              <button
                type="button"
                onClick={() => onPropsChange({ bold: !(p.bold ?? block.type === "heading") })}
                className={`w-full rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  p.bold ?? block.type === "heading"
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {p.bold ?? block.type === "heading" ? "On" : "Off"}
              </button>
            </div>
          </div>
        </>
      )}

      {isTable && (
        <TableEditor
          items={p.items ?? []}
          currency={currency}
          onChange={(items) => onPropsChange({ items })}
        />
      )}

      {isImage && (
        <div>
          <label className="label">Image URL</label>
          <input
            type="url"
            value={p.url ?? ""}
            onChange={(e) => onPropsChange({ url: e.target.value })}
            placeholder="https://…"
            className="input"
          />
          <p className="mt-2 text-xs text-slate-400">
            Paste a link to a logo or photo. PNG and JPG work best in the PDF.
          </p>
        </div>
      )}

      {isDivider && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Thickness</label>
            <input
              type="number"
              min={1}
              max={12}
              value={p.thickness ?? 2}
              onChange={(e) => onPropsChange({ thickness: Number(e.target.value) || 2 })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Color</label>
            <input
              type="color"
              value={p.color ?? "#e2e8f0"}
              onChange={(e) => onPropsChange({ color: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
            />
          </div>
        </div>
      )}

      {isShape && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Fill color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={p.fill ?? "#4f46e5"}
                onChange={(e) => onPropsChange({ fill: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
              />
              <input
                type="text"
                value={p.fill ?? "#4f46e5"}
                onChange={(e) => onPropsChange({ fill: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Corner radius</label>
            <input
              type="number"
              min={0}
              max={80}
              value={p.radius ?? 0}
              onChange={(e) => onPropsChange({ radius: Number(e.target.value) || 0 })}
              className="input"
            />
          </div>
        </div>
      )}

      {/* Position & size */}
      <div>
        <label className="label">Position &amp; size (px)</label>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ["x", block.x, (v: number) => onChange({ x: v })],
              ["y", block.y, (v: number) => onChange({ y: v })],
              ["w", block.w, (v: number) => onChange({ w: v })],
              ["h", block.h, (v: number) => onChange({ h: v })],
            ] as const
          ).map(([key, value, setter]) => (
            <div key={key}>
              <input
                type="number"
                value={Math.round(value)}
                onChange={(e) => setter(Number(e.target.value) || 0)}
                aria-label={key}
                className="input px-2 py-1.5 text-center text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
        Drag the element to move it, drag the corner dot to resize. Press Delete or Backspace to remove.
      </p>
    </div>
  );
}

function TableEditor({
  items,
  currency,
  onChange,
}: {
  items: TableItem[];
  currency: string;
  onChange: (items: TableItem[]) => void;
}) {
  const empty: TableItem = { description: "", qty: 1, unitPrice: 0 };
  const rows = items.length ? items : [empty];

  function update(index: number, patch: Partial<TableItem>) {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <label className="label">Line items</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_3.2rem_4.5rem_2rem] items-end gap-1.5">
            <input
              value={row.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Item description"
              className="input px-2 py-1.5 text-xs"
            />
            <input
              type="number"
              min={1}
              value={row.qty}
              onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
              aria-label="Quantity"
              className="input px-2 py-1.5 text-center text-xs"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={row.unitPrice}
              onChange={(e) => update(i, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
              aria-label="Unit price"
              className="input px-2 py-1.5 text-center text-xs"
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
              className="grid size-7 place-items-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              aria-label="Remove row"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...empty, description: "", qty: 1, unitPrice: 0 }])}
        className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-600"
      >
        + Add row
      </button>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</span>
        <span className="text-base font-extrabold text-slate-900">{formatMoney(totalOf(rows), currency)}</span>
      </div>
    </div>
  );
}

function TemplateCard({
  name,
  description,
  accent,
  layout,
  onUse,
}: {
  name: string;
  description: string;
  accent: string;
  layout?: ProposalLayout;
  onUse: () => void;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-400 hover:shadow-md">
      <div className="relative h-44 overflow-hidden bg-slate-50">
        {layout ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 scale-[1.35] origin-top">
            <LayoutViewer layout={layout} currency="USD" />
          </div>
        ) : (
          <div className="grid h-full place-items-center">
            <span className="grid size-14 place-items-center rounded-2xl text-2xl font-extrabold text-white" style={{ background: accent }}>
              +
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-800">{name}</p>
          <p className="truncate text-xs text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onUse}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition group-hover:shadow-md"
          style={{ background: accent }}
        >
          Use
        </button>
      </div>
    </div>
  );
}

function TipsPanel() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Design tips</h3>
      <ul className="space-y-2.5 text-[13px] leading-relaxed text-slate-500">
        <li className="flex gap-2">
          <span className="text-brand-500">•</span>
          Click an element to select it — edit its text, colors and size on the right.
        </li>
        <li className="flex gap-2">
          <span className="text-brand-500">•</span>
          Drag anywhere on the page to move elements; drag the corner dot to resize.
        </li>
        <li className="flex gap-2">
          <span className="text-brand-500">•</span>
          Use <b className="text-slate-700">Price table</b> for your line items — the total flows into the PDF and dashboard automatically.
        </li>
        <li className="flex gap-2">
          <span className="text-brand-500">•</span>
          Headings and paragraphs wrap to the width of their box. Make a box wider for longer text.
        </li>
        <li className="flex gap-2">
          <span className="text-brand-500">•</span>
          Your client sees this exact design on the link you send them.
        </li>
      </ul>
    </div>
  );
}
