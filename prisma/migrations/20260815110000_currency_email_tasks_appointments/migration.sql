-- AlterTable: Workspace gets currency + outgoing SMTP settings
ALTER TABLE "Workspace" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Workspace" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "smtpPort" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "smtpUser" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "smtpPass" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "smtpFrom" TEXT;

-- AlterTable: Task becomes workspace-scoped, lead optional, gains priority.
-- Backfill workspaceId from the first workspace so existing rows survive.
ALTER TABLE "Task" ADD COLUMN "workspaceId" TEXT;
UPDATE "Task" SET "workspaceId" = (SELECT "id" FROM "Workspace" LIMIT 1) WHERE "workspaceId" IS NULL;
ALTER TABLE "Task" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Task" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_leadId_fkey";

-- AlterTable: leadId is now optional (standalone tasks allowed)
ALTER TABLE "Task" ALTER COLUMN "leadId" DROP NOT NULL;

-- AddForeignKey (SetNull instead of Cascade)
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Task -> Workspace
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Task_workspaceId_idx" ON "Task"("workspaceId");

-- CreateTable: Appointment
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT,
    "leadId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Appointment -> Lead
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Appointment -> Workspace
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Appointment_workspaceId_idx" ON "Appointment"("workspaceId");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");
