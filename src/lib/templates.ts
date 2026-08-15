import {
  newBlockId,
  type LayoutBlock,
  type ProposalLayout,
  type TextAlign,
} from "./layout";

export type TemplateId = "modern" | "bold" | "minimal" | "executive" | "startup";

export type ProposalTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  accent: string;
  create: () => ProposalLayout;
};

type BlockArgs = {
  type: LayoutBlock["type"];
  x: number;
  y: number;
  w: number;
  h: number;
  props?: LayoutBlock["props"];
};

function blk({ type, x, y, w, h, props = {} }: BlockArgs): LayoutBlock {
  return { id: newBlockId(), type, x, y, w, h, props };
}

function heading(x: number, y: number, text: string, fontSize: number, color: string, opts: { w?: number; h?: number; align?: TextAlign; bold?: boolean } = {}) {
  return blk({
    type: "heading",
    x,
    y,
    w: opts.w ?? 666,
    h: opts.h ?? 64,
    props: { text, fontSize, color, align: opts.align ?? "left", bold: opts.bold ?? true },
  });
}

function text(x: number, y: number, value: string, color: string, opts: { w?: number; h?: number; fontSize?: number } = {}) {
  return blk({
    type: "text",
    x,
    y,
    w: opts.w ?? 666,
    h: opts.h ?? 110,
    props: { text: value, fontSize: opts.fontSize ?? 13, color, align: "left", bold: false },
  });
}

function table(x: number, y: number, opts: { w?: number; h?: number } = {}) {
  return blk({
    type: "table",
    x,
    y,
    w: opts.w ?? 666,
    h: opts.h ?? 250,
    props: { items: [{ description: "", qty: 1, unitPrice: 0 }] },
  });
}

function divider(x: number, y: number, color: string, thickness: number, w = 666, h = 24) {
  return blk({ type: "divider", x, y, w, h, props: { color, thickness } });
}

function shape(x: number, y: number, w: number, h: number, fill: string, radius = 0) {
  return blk({ type: "shape", x, y, w, h, props: { fill, radius } });
}

const INTRO =
  "We're excited to work with you. This proposal outlines the scope, timeline and investment for the project — use it to review the details, and approve when you're ready to kick off.";

const FOOTER = "Thank you for considering us — we look forward to building together.";

function page(blocks: LayoutBlock[]): ProposalLayout {
  return { version: 1, blocks };
}

export const TEMPLATES: ProposalTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean indigo accents with a bright, contemporary feel",
    accent: "#4f46e5",
    create: () =>
      page([
        shape(64, 80, 88, 10, "#4f46e5", 5),
        heading(64, 112, "Project Proposal", 42, "#0f172a"),
        text(64, 208, INTRO, "#475569", { h: 120 }),
        divider(64, 364, "#e2e8f0", 1.5),
        table(64, 396),
        text(64, 1010, FOOTER, "#94a3b8", { fontSize: 11, h: 40 }),
      ]),
  },
  {
    id: "bold",
    name: "Bold",
    description: "A dark navy header band with high-impact type",
    accent: "#f97316",
    create: () =>
      page([
        shape(0, 0, 794, 214, "#0f172a"),
        heading(64, 66, "Project Proposal", 40, "#ffffff"),
        text(64, 136, "Scope, timeline and investment for the work ahead.", "#cbd5e1", { h: 60, fontSize: 14 }),
        shape(64, 196, 72, 6, "#f97316", 3),
        table(64, 252),
        divider(64, 900, "#e2e8f0", 1.5),
        text(64, 940, FOOTER, "#64748b", { fontSize: 11, h: 40 }),
      ]),
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Monochrome, airy and quietly confident",
    accent: "#0f172a",
    create: () =>
      page([
        heading(64, 80, "PROJECT PROPOSAL", 13, "#94a3b8", { bold: false }),
        heading(64, 112, "Project Proposal", 36, "#0f172a"),
        divider(64, 200, "#0f172a", 2, 96, 24),
        text(64, 240, INTRO, "#475569", { h: 110 }),
        divider(64, 380, "#e2e8f0", 1),
        table(64, 412),
        text(64, 1010, FOOTER, "#94a3b8", { fontSize: 11, h: 40 }),
      ]),
  },
  {
    id: "executive",
    name: "Executive",
    description: "A refined letterhead with warm gold details",
    accent: "#b45309",
    create: () =>
      page([
        shape(64, 80, 16, 16, "#b45309", 3),
        heading(64, 116, "Project Proposal", 40, "#1c1917"),
        text(64, 212, INTRO, "#57534e", { h: 110 }),
        divider(64, 366, "#d6b37a", 2),
        table(64, 398),
        text(64, 1010, "Prepared with care.", "#a8a29e", { fontSize: 11, h: 40 }),
      ]),
  },
  {
    id: "startup",
    name: "Startup",
    description: "A vivid violet band with a playful energy",
    accent: "#22d3ee",
    create: () =>
      page([
        shape(0, 0, 794, 128, "#4f46e5"),
        shape(660, 12, 70, 70, "#22d3ee", 12),
        heading(64, 42, "Project Proposal", 36, "#ffffff"),
        shape(64, 112, 76, 8, "#22d3ee", 4),
        text(64, 170, INTRO, "#475569", { h: 110 }),
        table(64, 316),
        divider(64, 900, "#e2e8f0", 1.5),
        text(64, 940, FOOTER, "#64748b", { fontSize: 11, h: 40 }),
      ]),
  },
];

export function getTemplate(id: string | null | undefined): ProposalTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
