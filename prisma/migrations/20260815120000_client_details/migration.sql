-- AlterTable: Client gets richer profile fields
ALTER TABLE "Client" ADD COLUMN "address" TEXT;
ALTER TABLE "Client" ADD COLUMN "website" TEXT;
ALTER TABLE "Client" ADD COLUMN "industry" TEXT;
ALTER TABLE "Client" ADD COLUMN "notes" TEXT;
