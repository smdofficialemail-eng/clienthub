// Canva-style proposal canvas: geometry, block types and helpers shared by the
// editor, the public viewer, the server actions and the PDF renderer.

// A4 page at 96 dpi — the editor canvas coordinate space.
export const CANVAS_W = 794;
export const CANVAS_H = 1123;

// A4 in PDF points and the scale that maps canvas px -> PDF pt.
export const PDF_PAGE_W = 595.5;
export const PDF_PAGE_H = 842;
export const PDF_SCALE = 0.75;

export type BlockType = "heading" | "text" | "table" | "image" | "divider" | "shape";

export type TableItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

export type TextAlign = "left" | "center" | "right";

export type LayoutBlock = {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  props: {
    text?: string;
    fontSize?: number;
    color?: string;
    align?: TextAlign;
    bold?: boolean;
    items?: TableItem[];
    url?: string;
    thickness?: number;
    fill?: string;
    radius?: number;
  };
};

export type ProposalLayout = {
  version: 1;
  blocks: LayoutBlock[];
};

const DEFAULTS: Record<
  BlockType,
  Omit<LayoutBlock, "id" | "x" | "y"> & { text?: string }
> = {
  heading: {
    type: "heading",
    w: 674,
    h: 72,
    props: { text: "Your proposal title", fontSize: 34, color: "#0f172a", align: "left", bold: true },
  },
  text: {
    type: "text",
    w: 674,
    h: 132,
    props: {
      text: "We're excited to work with you. This proposal outlines the scope, timeline and investment for the project — use it to review the details, and approve when you're ready to kick off.",
      fontSize: 13,
      color: "#475569",
      align: "left",
      bold: false,
    },
  },
  table: {
    type: "table",
    w: 674,
    h: 240,
    props: { items: [{ description: "", qty: 1, unitPrice: 0 }] },
  },
  image: {
    type: "image",
    w: 240,
    h: 160,
    props: { url: "" },
  },
  divider: {
    type: "divider",
    w: 674,
    h: 24,
    props: { color: "#e2e8f0", thickness: 2 },
  },
  shape: {
    type: "shape",
    w: 160,
    h: 80,
    props: { fill: "#4f46e5", radius: 8 },
  },
};

export function newBlockId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export function makeBlock(type: BlockType, cascade = 0): LayoutBlock {
  const base = DEFAULTS[type];
  const offset = (cascade % 6) * 28;
  return {
    id: newBlockId(),
    type,
    x: Math.min(64 + offset, CANVAS_W - base.w - 24),
    y: Math.min(72 + offset, CANVAS_H - base.h - 40),
    w: base.w,
    h: base.h,
    props: { ...base.props },
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Collect line items from all table blocks, in layout order. */
export function extractItems(layout: ProposalLayout): TableItem[] {
  const out: TableItem[] = [];
  for (const block of layout.blocks) {
    if (block.type !== "table") continue;
    for (const item of block.props.items ?? []) {
      if (item.description || item.qty > 0 || item.unitPrice > 0) {
        out.push({
          description: item.description || "",
          qty: Math.max(1, Math.round(item.qty || 1)),
          unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        });
      }
    }
  }
  return out;
}

export function totalOf(items: TableItem[]) {
  return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
}

/** Lenient parse of stored layout JSON — never throws. */
export function parseLayout(json: unknown): ProposalLayout | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  if (obj.version !== 1 || !Array.isArray(obj.blocks)) return null;

  const blocks: LayoutBlock[] = [];
  for (const raw of obj.blocks) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    const type = b.type as BlockType;
    if (!["heading", "text", "table", "image", "divider", "shape"].includes(type)) continue;
    const props = (b.props ?? {}) as Record<string, unknown>;
    const block: LayoutBlock = {
      id: typeof b.id === "string" ? b.id : newBlockId(),
      type,
      x: clamp(Number(b.x) || 0, 0, CANVAS_W - 20),
      y: clamp(Number(b.y) || 0, 0, CANVAS_H - 20),
      w: clamp(Number(b.w) || DEFAULTS[type].w, 40, CANVAS_W),
      h: clamp(Number(b.h) || DEFAULTS[type].h, 4, CANVAS_H),
      props: {},
    };
    if (typeof props.text === "string") block.props.text = props.text;
    if (typeof props.fontSize === "number") block.props.fontSize = props.fontSize;
    if (typeof props.color === "string") block.props.color = props.color;
    if (props.align === "left" || props.align === "center" || props.align === "right") {
      block.props.align = props.align;
    }
    if (typeof props.bold === "boolean") block.props.bold = props.bold;
    if (typeof props.url === "string") block.props.url = props.url;
    if (typeof props.thickness === "number") block.props.thickness = props.thickness;
    if (typeof props.fill === "string") block.props.fill = props.fill;
    if (typeof props.radius === "number") block.props.radius = props.radius;
    if (Array.isArray(props.items)) {
      block.props.items = props.items
        .map((it) => {
          if (!it || typeof it !== "object") return null;
          const row = it as Record<string, unknown>;
          return {
            description: String(row.description ?? ""),
            qty: Math.max(1, Math.round(Number(row.qty) || 1)),
            unitPrice: Math.max(0, Number(row.unitPrice) || 0),
          };
        })
        .filter(Boolean) as TableItem[];
    }
    blocks.push(block);
  }
  return blocks.length ? { version: 1, blocks } : null;
}

/** #rrggbb -> { r, g, b } in 0..1 for pdf-lib. */
export function hexToRgb(hex: string | undefined, fallback = "#0f172a") {
  const h = /^#?([0-9a-f]{6})$/i.exec(hex || "") ? hex! : fallback;
  const value = h.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}
