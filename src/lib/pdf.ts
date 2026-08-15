import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import {
  hexToRgb,
  parseLayout,
  totalOf,
  PDF_PAGE_H,
  PDF_PAGE_W,
  PDF_SCALE,
  type ProposalLayout,
} from "./layout";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;

const COLOR = {
  ink: rgb(0.09, 0.11, 0.17), // slate-900
  muted: rgb(0.42, 0.45, 0.51), // slate-500
  faint: rgb(0.69, 0.71, 0.76), // slate-400
  line: rgb(0.91, 0.92, 0.94), // slate-100
  indigo: rgb(0.31, 0.27, 0.9), // indigo-600
  emerald: rgb(0.05, 0.62, 0.42), // emerald-600
  red: rgb(0.87, 0.22, 0.27), // red-600
  amber: rgb(0.84, 0.55, 0.05), // amber-600
  white: rgb(1, 1, 1),
};

export type PdfLineItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

type DocumentData = {
  number: string;
  title: string;
  companyName: string;
  currency: string;
  documentLabel: string; // "Proposal" | "Invoice"
  forLabel: string; // "Prepared for" | "Billed to"
  clientName: string;
  clientEmail: string;
  metaLines: string[]; // e.g. ["Proposal · Aug 15, 2026", "Due Sep 15, 2026"]
  intro: string | null;
  items: PdfLineItem[];
  total: number;
  status: string;
};

const moneyFormatters = new Map<string, Intl.NumberFormat>();
function moneyFor(currency: string) {
  let fmt = moneyFormatters.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(currency, fmt);
  }
  return fmt;
}

const STATUS_META: Record<string, { label: string; color: ReturnType<typeof rgb> }> = {
  draft: { label: "Draft", color: COLOR.faint },
  sent: { label: "Sent", color: COLOR.indigo },
  viewed: { label: "Viewed", color: COLOR.indigo },
  overdue: { label: "Overdue", color: COLOR.amber },
  approved: { label: "Approved", color: COLOR.emerald },
  declined: { label: "Declined", color: COLOR.red },
  paid: { label: "Paid", color: COLOR.emerald },
};

const WINANSI_FIXES: Record<string, string> = {
  "—": "-", // em dash
  "–": "-", // en dash
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "•": "*",
  "·": "-",
  "✓": "",
  "€": "EUR",
  "₹": "Rs",
  "£": "GBP",
  "¥": "Yen",
};

/** Keep only characters the built-in WinAnsi fonts can encode. */
function toWinAnsi(text: string) {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
    } else if (WINANSI_FIXES[ch] !== undefined) {
      out += WINANSI_FIXES[ch];
    } else {
      out += " ";
    }
  }
  return out;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "document"
  );
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color = COLOR.ink
) {
  page.drawText(toWinAnsi(text), { x, y, size, font, color });
}

function drawRightText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  xRight: number,
  y: number,
  size: number,
  color = COLOR.ink
) {
  // Measure the sanitized string — raw text may contain chars WinAnsi can't encode
  // (e.g. ₹), which makes widthOfTextAtSize throw before drawText can sanitize.
  const safe = toWinAnsi(text);
  const width = font.widthOfTextAtSize(safe, size);
  drawText(page, font, safe, xRight - width, y, size, color);
}

function drawLine(page: PDFPage, x1: number, y: number, x2: number, color = COLOR.line, width = 1) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: width, color });
}

async function buildDocument(data: DocumentData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Brand bar
  page.drawRectangle({
    x: MARGIN,
    y: y - 24,
    width: 24,
    height: 24,
    color: COLOR.indigo,
  });
  drawText(page, bold, (data.companyName.charAt(0) || "C").toUpperCase(), MARGIN + 8, y - 19, 13, COLOR.white);
  drawText(page, bold, data.companyName, MARGIN + 34, y - 18, 15, COLOR.ink);
  drawRightText(page, bold, data.number, PAGE_W - MARGIN, y - 18, 15, COLOR.ink);
  drawRightText(
    page,
    font,
    data.documentLabel,
    PAGE_W - MARGIN,
    y - 1,
    8,
    COLOR.muted
  );
  y -= 48;

  // Title + client
  drawText(page, font, data.forLabel.toUpperCase(), MARGIN, y, 8, COLOR.indigo);
  y -= 16;
  drawText(page, bold, data.clientName, MARGIN, y, 18, COLOR.ink);
  y -= 16;
  drawText(page, font, data.clientEmail, MARGIN, y, 10, COLOR.muted);
  y -= 20;

  // Meta lines on the right column
  const metaX = PAGE_W - MARGIN;
  for (const line of data.metaLines) {
    drawRightText(page, font, line, metaX, y, 9, COLOR.muted);
    y -= 14;
  }
  // Status badge
  const status = STATUS_META[data.status] ?? STATUS_META.draft;
  y -= 4;
  page.drawRectangle({
    x: metaX - bold.widthOfTextAtSize(status.label, 9) - 20,
    y,
    width: bold.widthOfTextAtSize(status.label, 9) + 20,
    height: 16,
    color: status.color,
  });
  drawRightText(page, bold, status.label, metaX - 10, y + 4, 9, COLOR.white);
  y -= 28;

  // Intro
  if (data.intro) {
    drawText(page, font, data.intro, MARGIN, y, 10, COLOR.ink);
    // Simple multi-line wrap at ~78 chars
    const words = data.intro.split(" ");
    let line = "";
    for (const word of words) {
      if ((line + " " + word).trim().length > 92) {
        y -= 14;
        drawText(page, font, line.trim(), MARGIN, y, 10, COLOR.ink);
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    }
    if (line) {
      y -= 14;
      drawText(page, font, line.trim(), MARGIN, y, 10, COLOR.ink);
    }
    y -= 16;
  }

  y -= 14;

  // Items table
  drawLine(page, MARGIN, y + 16, PAGE_W - MARGIN);
  drawText(page, bold, "ITEM", MARGIN, y, 8, COLOR.faint);
  drawRightText(page, bold, "QTY", PAGE_W - MARGIN - 168, y, 8, COLOR.faint);
  drawRightText(page, bold, "UNIT PRICE", PAGE_W - MARGIN - 108, y, 8, COLOR.faint);
  drawRightText(page, bold, "AMOUNT", PAGE_W - MARGIN, y, 8, COLOR.faint);
  y -= 12;

  for (const item of data.items) {
    drawLine(page, MARGIN, y + 8, PAGE_W - MARGIN);
    y -= 8;
    drawText(page, font, item.description, MARGIN, y, 10, COLOR.ink);
    drawRightText(page, font, String(item.qty), PAGE_W - MARGIN - 168, y, 10, COLOR.muted);
    const money = moneyFor(data.currency);
    drawRightText(page, font, money.format(item.unitPrice), PAGE_W - MARGIN - 108, y, 10, COLOR.muted);
    drawRightText(page, bold, money.format(item.qty * item.unitPrice), PAGE_W - MARGIN, y, 10, COLOR.ink);
    y -= 20;
  }

  // Total row
  drawLine(page, MARGIN, y + 6, PAGE_W - MARGIN, COLOR.ink, 1.5);
  y -= 6;
  drawRightText(page, bold, "TOTAL", PAGE_W - MARGIN - 108, y, 10, COLOR.muted);
  drawRightText(page, bold, moneyFor(data.currency).format(data.total), PAGE_W - MARGIN, y, 14, COLOR.ink);

  // Settled banner
  if (data.status === "approved" || data.status === "paid") {
    y -= 34;
    page.drawRectangle({ x: MARGIN, y, width: PAGE_W - MARGIN * 2, height: 24, color: COLOR.emerald });
    drawText(
      page,
      bold,
      `✓ ${data.status === "paid" ? "Paid in full" : "Approved"} by ${data.clientName}`,
      MARGIN + 12,
      y + 7,
      10,
      COLOR.white
    );
  } else if (data.status === "declined") {
    y -= 34;
    page.drawRectangle({ x: MARGIN, y, width: PAGE_W - MARGIN * 2, height: 24, color: COLOR.red });
    drawText(page, bold, "Declined by " + data.clientName, MARGIN + 12, y + 7, 10, COLOR.white);
  }

  // Footer
  drawText(page, font, `Generated from ${data.companyName} · ${data.title}`, MARGIN, MARGIN - 12, 8, COLOR.faint);

  return pdf.save();
}

/** Filled rectangle, optionally with rounded corners (via SVG path). */
function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  color: ReturnType<typeof rgb>
) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r <= 0.5) {
    page.drawRectangle({ x, y, width: w, height: h, color });
    return;
  }
  const path = [
    `M ${r} 0`,
    `H ${w - r}`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `V ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
  page.drawSvgPath(path, { x, y, color });
}

/** Wrap text to a max width, keeping words intact. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawAligned(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  maxWidth: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
  align: "left" | "center" | "right" = "left"
) {
  const safe = toWinAnsi(text);
  const width = font.widthOfTextAtSize(safe, size);
  let start = x;
  if (align === "center") start = x + (maxWidth - width) / 2;
  else if (align === "right") start = x + maxWidth - width;
  drawText(page, font, safe, start, y, size, color);
}

function drawLayoutTable(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  x: number,
  yTop: number,
  w: number,
  items: { description: string; qty: number; unitPrice: number }[],
  currency: string
) {
  const money = moneyFor(currency);
  const qtyW = w * 0.1;
  const unitW = w * 0.18;
  const amtW = w * 0.18;
  const descW = w - qtyW - unitW - amtW;
  const headerH = 14;
  const rowH = 18;
  let y = PDF_PAGE_H - yTop;

  y -= headerH;
  drawText(page, bold, "ITEM", x, y, 7, COLOR.faint);
  drawRightText(page, bold, "QTY", x + descW + qtyW, y, 7, COLOR.faint);
  drawRightText(page, bold, "UNIT PRICE", x + descW + qtyW + unitW, y, 7, COLOR.faint);
  drawRightText(page, bold, "AMOUNT", x + w, y, 7, COLOR.faint);
  drawLine(page, x, y + 2, x + w, COLOR.ink, 1);
  y -= rowH;

  for (const item of items) {
    drawText(page, font, item.description || "Item", x, y, 9, COLOR.ink);
    drawRightText(page, font, String(item.qty), x + descW + qtyW, y, 9, COLOR.muted);
    drawRightText(page, font, money.format(item.unitPrice), x + descW + qtyW + unitW, y, 9, COLOR.muted);
    drawRightText(page, bold, money.format(item.qty * item.unitPrice), x + w, y, 9, COLOR.ink);
    drawLine(page, x, y + 2, x + w, COLOR.line, 0.75);
    y -= rowH;
  }

  y -= 4;
  drawLine(page, x, y + 4, x + w, COLOR.ink, 1.2);
  drawRightText(page, bold, "TOTAL", x + descW + qtyW + unitW, y, 9, COLOR.muted);
  drawRightText(page, bold, money.format(totalOf(items)), x + w, y, 12, COLOR.ink);
}

async function drawLayoutImage(
  page: PDFPage,
  pdf: PDFDocument,
  bold: PDFFont,
  x: number,
  yTop: number,
  w: number,
  h: number,
  url: string | undefined
) {
  if (!url) return;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("bad status");
    const buffer = await res.arrayBuffer();
    const type = res.headers.get("content-type") || "";
    let image;
    if (type.includes("png")) {
      image = await pdf.embedPng(buffer);
    } else if (type.includes("jpeg") || type.includes("jpg")) {
      image = await pdf.embedJpg(buffer);
    } else {
      throw new Error("unsupported image type");
    }
    const boxW = w - 6;
    const boxH = h - 6;
    const s = Math.min(boxW / image.width, boxH / image.height);
    const dw = image.width * s;
    const dh = image.height * s;
    page.drawImage(image, {
      x: x + (w - dw) / 2,
      y: PDF_PAGE_H - yTop - (h - dh) / 2 - dh,
      width: dw,
      height: dh,
    });
  } catch {
    page.drawRectangle({ x, y: PDF_PAGE_H - yTop - h, width: w, height: h, color: COLOR.line });
    drawText(page, bold, "Image unavailable", x + 8, PDF_PAGE_H - yTop - h + 14, 8, COLOR.muted);
  }
}

/** Render a Canva-style layout at A4 scale. */
async function buildLayoutPdf(layout: ProposalLayout, currency: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PDF_PAGE_W, PDF_PAGE_H]);
  const scale = PDF_SCALE;

  for (const b of layout.blocks) {
    const x = b.x * scale;
    const yTop = b.y * scale;
    const w = b.w * scale;
    const h = b.h * scale;
    const p = b.props;

    if (b.type === "heading" || b.type === "text") {
      const size = (p.fontSize ?? (b.type === "heading" ? 34 : 13)) * scale;
      const f = p.bold || b.type === "heading" ? bold : font;
      const color = rgb(hexToRgb(p.color).r, hexToRgb(p.color).g, hexToRgb(p.color).b);
      const lines = wrapText(p.text ?? "", f, size, w);
      const lineH = size * 1.28;
      let y = PDF_PAGE_H - yTop - size;
      for (const line of lines) {
        drawAligned(page, f, line, x, w, y, size, color, p.align ?? "left");
        y -= lineH;
      }
    } else if (b.type === "table") {
      drawLayoutTable(page, font, bold, x, yTop, w, p.items ?? [], currency);
    } else if (b.type === "image") {
      await drawLayoutImage(page, pdf, bold, x, yTop, w, h, p.url);
    } else if (b.type === "divider") {
      const c = rgb(hexToRgb(p.color, "#e2e8f0").r, hexToRgb(p.color, "#e2e8f0").g, hexToRgb(p.color, "#e2e8f0").b);
      drawLine(page, x, PDF_PAGE_H - yTop - h / 2, x + w, c, (p.thickness ?? 2) * scale);
    } else if (b.type === "shape") {
      const fill = rgb(hexToRgb(p.fill, "#4f46e5").r, hexToRgb(p.fill, "#4f46e5").g, hexToRgb(p.fill, "#4f46e5").b);
      drawRoundedRect(page, x, PDF_PAGE_H - yTop - h, w, h, (p.radius ?? 0) * scale, fill);
    }
  }

  return pdf.save();
}

export async function buildProposalPdf(proposal: {
  title: string;
  clientName: string;
  clientEmail: string;
  intro: string | null;
  status: string;
  createdAt: Date;
  items: PdfLineItem[];
  layout?: unknown;
}, companyName: string, currency = "USD"): Promise<Uint8Array> {
  const layout = parseLayout(proposal.layout);
  if (layout) {
    return buildLayoutPdf(layout, currency);
  }

  const total = proposal.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const metaLines = [
    "Proposal · " +
      proposal.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    proposal.title,
  ];
  return buildDocument({
    number: "PROPOSAL",
    title: proposal.title,
    companyName,
    currency,
    documentLabel: "PROPOSAL",
    forLabel: "Prepared for",
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    metaLines,
    intro: proposal.intro,
    items: proposal.items,
    total,
    status: proposal.status,
  });
}

export async function buildInvoicePdf(invoice: {
  number: string;
  title: string;
  clientName: string;
  clientEmail: string;
  intro: string | null;
  status: string;
  createdAt: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  items: PdfLineItem[];
}, companyName: string, currency = "USD"): Promise<Uint8Array> {
  const total = invoice.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const metaLines = [
    "Invoice · " + fmt(invoice.createdAt),
    invoice.title,
    ...(invoice.dueDate ? ["Due " + fmt(invoice.dueDate)] : []),
    ...(invoice.paidAt ? ["Paid " + fmt(invoice.paidAt)] : []),
  ];
  return buildDocument({
    number: invoice.number,
    title: invoice.title,
    companyName,
    currency,
    documentLabel: "INVOICE",
    forLabel: "Billed to",
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    metaLines,
    intro: invoice.intro,
    items: invoice.items,
    total,
    status: invoice.status,
  });
}

export function pdfFilename(prefix: string, title: string, number?: string) {
  return `${prefix}-${number ? number.toLowerCase() + "-" : ""}${slugify(title)}.pdf`;
}
