"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import {
  CANVAS_H,
  CANVAS_W,
  totalOf,
  type LayoutBlock,
  type ProposalLayout,
} from "@/lib/layout";

export function LayoutViewer({
  layout,
  currency,
}: {
  layout: ProposalLayout;
  currency: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CANVAS_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full" style={{ height: CANVAS_H * scale }}>
      <div
        className="absolute left-0 top-0 bg-white"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {layout.blocks.map((block) => (
          <ViewBlock key={block.id} block={block} currency={currency} />
        ))}
      </div>
    </div>
  );
}

function ViewBlock({ block: b, currency }: { block: LayoutBlock; currency: string }) {
  const p = b.props;
  return (
    <div
      className="absolute"
      style={{ left: b.x, top: b.y, width: b.w, height: b.h, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
    >
      {b.type === "heading" && (
        <div
          className="break-words leading-tight"
          style={{
            fontSize: p.fontSize ?? 34,
            color: p.color ?? "#0f172a",
            textAlign: p.align ?? "left",
            fontWeight: p.bold ? 800 : 700,
          }}
        >
          {p.text}
        </div>
      )}
      {b.type === "text" && (
        <div
          className="whitespace-pre-wrap break-words leading-snug"
          style={{
            fontSize: p.fontSize ?? 13,
            color: p.color ?? "#475569",
            textAlign: p.align ?? "left",
            fontWeight: p.bold ? 700 : 400,
          }}
        >
          {p.text}
        </div>
      )}
      {b.type === "table" && (
        <TableBlock items={p.items ?? []} currency={currency} />
      )}
      {b.type === "image" &&
        (p.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.url} alt="" className="h-full w-full object-contain" />
        ) : null)}
      {b.type === "divider" && (
        <div className="flex h-full w-full items-center">
          <div style={{ borderTop: `${p.thickness ?? 2}px solid ${p.color ?? "#e2e8f0"}` }} className="w-full" />
        </div>
      )}
      {b.type === "shape" && (
        <div
          className="h-full w-full"
          style={{ background: p.fill ?? "#4f46e5", borderRadius: (p.radius ?? 0) > 0 ? p.radius : undefined }}
        />
      )}
    </div>
  );
}

function TableBlock({
  items,
  currency,
}: {
  items: { description: string; qty: number; unitPrice: number }[];
  currency: string;
}) {
  const total = totalOf(items);
  return (
    <div className="flex h-full w-full flex-col justify-center overflow-hidden">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            <th className="py-1.5 text-left">Item</th>
            <th className="w-14 py-1.5 text-right">Qty</th>
            <th className="w-24 py-1.5 text-right">Unit price</th>
            <th className="w-24 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-slate-100 text-slate-700">
              <td className="py-2 pr-3 font-semibold">{item.description || "Item"}</td>
              <td className="py-2 text-right text-slate-500">{item.qty}</td>
              <td className="py-2 text-right text-slate-500">{formatMoney(item.unitPrice, currency)}</td>
              <td className="py-2 text-right font-bold">
                {formatMoney(item.qty * item.unitPrice, currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Total
            </td>
            <td className="py-3 text-right text-xl font-extrabold text-slate-900">
              {formatMoney(total, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
