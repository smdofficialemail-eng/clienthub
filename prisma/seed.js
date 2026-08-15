// ClientHub demo seed — creates a demo workspace with a pipeline, leads,
// an approved proposal, and an invoice so the app has content to explore.
//
// Run: npm run db:seed   (requires DATABASE_URL in .env)
// Idempotent: safe to re-run.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEMO = {
  name: "Test Owner",
  email: "owner@acme.test",
  password: "password123",
  workspace: "Acme Agency",
};

const STAGES = [
  { name: "New", color: "#64748b" },
  { name: "Contacted", color: "#0ea5e9" },
  { name: "Proposal Sent", color: "#8b5cf6" },
  { name: "Negotiation", color: "#f59e0b" },
  { name: "Won", color: "#10b981" },
  { name: "Lost", color: "#ef4444" },
];

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO.email } });
  if (existing) {
    console.log(`Demo user already exists (${DEMO.email}) — nothing to do.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: DEMO.name,
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 10),
      memberships: {
        create: {
          role: "owner",
          workspace: {
            create: {
              name: DEMO.workspace,
              slug: `acme-agency-${Math.random().toString(36).slice(2, 7)}`,
              pipelines: {
                create: {
                  name: "Sales Pipeline",
                  stages: { create: STAGES.map((s, i) => ({ ...s, position: i })) },
                },
              },
            },
          },
        },
      },
    },
  });

  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const workspace = await prisma.workspace.findUnique({
    where: { id: membership.workspaceId },
    include: { pipelines: { include: { stages: { orderBy: { position: "asc" } } } } },
  });
  const pipeline = workspace.pipelines[0];
  const [newStage, contacted, won] = pipeline.stages;

  // Lead that's been contacted and moved down the pipeline.
  const lead = await prisma.lead.create({
    data: {
      name: "Website Redesign",
      company: "Acme Corp",
      email: "jane@acmecorp.com",
      phone: "+1 555 0100",
      value: 12000,
      source: "Website",
      notes: "Needs a new site plus SEO retainer.",
      stageId: contacted.id,
      pipelineId: pipeline.id,
      workspaceId: workspace.id,
      tasks: { create: [{ title: "Send follow-up email" }] },
      activities: { create: [{ body: "Called Jane — interested in the starter package", type: "call", userId: user.id }] },
    },
  });

  // A second lead sitting in "New".
  await prisma.lead.create({
    data: {
      name: "Brand Refresh",
      company: "Bluepeak Fitness",
      email: "marcus@bluepeak.fit",
      value: 6800,
      source: "Referral",
      stageId: newStage.id,
      pipelineId: pipeline.id,
      workspaceId: workspace.id,
    },
  });

  // An approved proposal + a paid invoice to show off the pipeline.
  const proposal = await prisma.proposal.create({
    data: {
      title: "Website Redesign — Phase 1",
      clientName: "Jane Doe",
      clientEmail: "jane@acmecorp.com",
      intro: "Thanks for the intro call! Here's our proposal to redesign acmecorp.com.",
      status: "approved",
      leadId: lead.id,
      workspaceId: workspace.id,
      items: {
        create: [
          { description: "Homepage + 4 page design", qty: 1, unitPrice: 4500, sortOrder: 0 },
          { description: "Development & CMS build", qty: 1, unitPrice: 6500, sortOrder: 1 },
          { description: "SEO setup", qty: 1, unitPrice: 1000, sortOrder: 2 },
        ],
      },
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "won", stageId: won.id },
  });

  await prisma.client.create({
    data: {
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      leadId: lead.id,
      workspaceId: workspace.id,
    },
  });

  await prisma.invoice.create({
    data: {
      number: "INV-0001",
      title: proposal.title,
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      intro: "Net 30. Thank you for your business!",
      status: "paid",
      paidAt: new Date(),
      proposalId: proposal.id,
      workspaceId: workspace.id,
      items: {
        create: [
          { description: "Homepage + 4 page design", qty: 1, unitPrice: 4500, sortOrder: 0 },
          { description: "Development & CMS build", qty: 1, unitPrice: 6500, sortOrder: 1 },
          { description: "SEO setup", qty: 1, unitPrice: 1000, sortOrder: 2 },
        ],
      },
    },
  });

  console.log(`Seeded demo workspace "${DEMO.workspace}" for ${DEMO.email} / ${DEMO.password}`);
  console.log(`Proposal token: ${proposal.token} (public link + PDF work without login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
