import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

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

export async function buildProposalPdf(proposal: {
  title: string;
  clientName: string;
  clientEmail: string;
  intro: string | null;
  status: string;
  createdAt: Date;
  items: PdfLineItem[];
}, companyName: string, currency = "USD"): Promise<Uint8Array> {
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
