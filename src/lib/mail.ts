import nodemailer from "nodemailer";
import { buildInvoicePdf } from "./pdf";
import { formatMoney } from "./format";

type SmtpWorkspace = {
  name: string;
  currency: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
};

export function hasSmtp(workspace: SmtpWorkspace) {
  return Boolean(workspace.smtpHost && workspace.smtpUser && workspace.smtpPass);
}

function transporterFor(workspace: SmtpWorkspace) {
  return nodemailer.createTransport({
    host: workspace.smtpHost!,
    port: workspace.smtpPort ?? 587,
    secure: (workspace.smtpPort ?? 587) === 465,
    auth: { user: workspace.smtpUser!, pass: workspace.smtpPass! },
  });
}

/** Renders a small, brandable HTML invoice body. */
function invoiceHtml(invoice: {
  number: string;
  title: string;
  clientName: string;
  intro: string | null;
  items: { description: string; qty: number; unitPrice: number }[];
}, workspace: SmtpWorkspace) {
  const total = formatMoney(
    invoice.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    workspace.currency
  );
  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f4;color:#1e293b;font-size:14px">${escapeHtml(item.description)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f4;color:#64748b;font-size:14px;text-align:right">${item.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f4;color:#64748b;font-size:14px;text-align:right">${formatMoney(item.unitPrice, workspace.currency)}</td>
      </tr>`
    )
    .join("");
  const intro = invoice.intro
    ? `<p style="margin:18px 0;color:#475569;font-size:14px;line-height:1.6">${escapeHtml(invoice.intro)}</p>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;font-family:Segoe UI, Arial, sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
          <tr><td style="background:linear-gradient(90deg,#4f46e5,#7c3aed);padding:22px 28px">
            <table role="presentation" width="100%"><tr>
              <td style="color:#ffffff;font-size:18px;font-weight:700">${escapeHtml(workspace.name)}</td>
              <td align="right" style="color:#c7d2fe;font-size:13px;font-weight:600">${escapeHtml(invoice.number)}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:28px">
            <h1 style="margin:0 0 4px;color:#0f172a;font-size:20px">Your invoice from ${escapeHtml(workspace.name)}</h1>
            <p style="margin:0;color:#64748b;font-size:14px">Hi ${escapeHtml(invoice.clientName)}, thanks for your business!</p>
            ${intro}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;margin-top:16px">
              <tr style="background:#f8fafc">
                <th align="left" style="padding:10px 12px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Item</th>
                <th align="right" style="padding:10px 12px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Qty</th>
                <th align="right" style="padding:10px 12px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.04em">Unit price</th>
              </tr>
              ${rows}
              <tr>
                <td colspan="2" align="right" style="padding:12px;color:#64748b;font-size:13px;font-weight:700">Total due</td>
                <td align="right" style="padding:12px;color:#0f172a;font-size:16px;font-weight:800">${total}</td>
              </tr>
            </table>
            <p style="margin:22px 0 0;color:#94a3b8;font-size:12px">The PDF of this invoice is attached. Questions? Just reply to this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type InvoiceForMail = {
  id: string;
  number: string;
  title: string;
  clientName: string;
  clientEmail: string;
  intro: string | null;
  status: string;
  createdAt: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  items: { description: string; qty: number; unitPrice: number }[];
};

/** Emails an invoice (HTML body + PDF attachment) to the client. */
export async function sendInvoiceEmail(workspace: SmtpWorkspace, invoice: InvoiceForMail) {
  if (!hasSmtp(workspace)) {
    return { ok: false as const, error: "Email isn't set up yet — add your SMTP details in Settings → Email." };
  }

  const pdf = await buildInvoicePdf(invoice, workspace.name, workspace.currency);
  const transporter = transporterFor(workspace);
  const from = workspace.smtpFrom || `${workspace.name} <${workspace.smtpUser}>`;

  await transporter.sendMail({
    from,
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.number} from ${workspace.name}`,
    html: invoiceHtml(invoice, workspace),
    attachments: [
      {
        filename: `invoice-${invoice.number.toLowerCase()}.pdf`,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });

  return { ok: true as const };
}

/** Sends a test message to verify SMTP settings. */
export async function sendTestEmail(workspace: SmtpWorkspace, to: string) {
  if (!hasSmtp(workspace)) {
    return { ok: false as const, error: "Fill in host, username and password first." };
  }
  const transporter = transporterFor(workspace);
  const from = workspace.smtpFrom || `${workspace.name} <${workspace.smtpUser}>`;
  await transporter.sendMail({
    from,
    to,
    subject: `Test email from ${workspace.name} (ClientHub)`,
    text: "Your email settings work. You're ready to send invoices to clients.",
  });
  return { ok: true as const };
}
