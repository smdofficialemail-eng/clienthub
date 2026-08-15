"use client";

import Link from "next/link";
import { LayoutViewer } from "@/components/layout-viewer";
import { TEMPLATES, type ProposalTemplate } from "@/lib/templates";
import { formatMoney } from "@/lib/format";

type GalleryProps = {
  leads: { id: string; name: string; company: string | null }[];
  preselectLeadId: string | null;
  preselectClientName: string | null;
  currency: string;
};

export function TemplateGallery({ leads, preselectLeadId, preselectClientName, currency }: GalleryProps) {
  const qs = new URLSearchParams();
  if (preselectLeadId) qs.set("lead", preselectLeadId);
  if (preselectClientName) qs.set("client", preselectClientName);

  const designHref = (template?: string) => {
    const params = new URLSearchParams(qs);
    if (template) params.set("template", template);
    const s = params.toString();
    return `/app/proposals/new/design${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* Blank */}
      <Link
        href={designHref()}
        className="group overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 transition hover:border-brand-400 hover:bg-white hover:shadow-md"
      >
        <div className="grid h-52 place-items-center">
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl border-2 border-slate-300 text-2xl font-extrabold text-slate-400 transition group-hover:border-brand-400 group-hover:text-brand-500">
              +
            </span>
            <p className="mt-3 font-extrabold text-slate-700">Blank canvas</p>
            <p className="text-xs text-slate-400">Start from scratch</p>
          </div>
        </div>
      </Link>

      {TEMPLATES.map((t) => (
        <TemplateCard key={t.id} template={t} href={designHref(t.id)} currency={currency} />
      ))}

      {/* Lead quick-pick footer */}
      <div className="col-span-full mt-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">From a lead instead?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/app/proposals/new/design?template=modern&lead=${lead.id}`}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
            >
              {lead.name}
              {lead.company ? ` · ${lead.company}` : ""}
            </Link>
          ))}
          {leads.length === 0 && (
            <p className="text-sm text-slate-400">No open leads — create a standalone proposal above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, href, currency }: { template: ProposalTemplate; href: string; currency: string }) {
  const layout = template.create();
  const total = layout.blocks
    .filter((b) => b.type === "table")
    .flatMap((b) => b.props.items ?? [])
    .reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-400 hover:shadow-lg"
    >
      <div className="relative h-52 overflow-hidden bg-slate-100">
        <div className="pointer-events-none">
          <LayoutViewer layout={layout} currency={currency} />
        </div>
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm"
          style={{ background: template.accent }}
        >
          {template.name}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-800">{template.description}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {total > 0 ? formatMoney(total, currency) : "Start with a price table"}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-extrabold text-white transition group-hover:bg-brand-600">
          Use →
        </span>
      </div>
    </Link>
  );
}
