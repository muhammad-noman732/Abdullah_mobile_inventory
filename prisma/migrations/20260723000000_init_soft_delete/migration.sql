-- Migration: Add updatedAt, deletedAt (soft delete) to all models
-- Adds columns with safe defaults so existing rows are not broken

-- Stock table
ALTER TABLE "Stock" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Stock" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- Sale table
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- SaleItem table
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Udhar table
ALTER TABLE "Udhar" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Udhar" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- UdharPayment table
ALTER TABLE "UdharPayment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "UdharPayment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- Expense table
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- Setting table
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for soft delete queries
CREATE INDEX IF NOT EXISTS "Stock_deletedAt_idx" ON "Stock"("deletedAt");
CREATE INDEX IF NOT EXISTS "Sale_deletedAt_idx" ON "Sale"("deletedAt");
CREATE INDEX IF NOT EXISTS "Udhar_deletedAt_idx" ON "Udhar"("deletedAt");
CREATE INDEX IF NOT EXISTS "Expense_deletedAt_idx" ON "Expense"("deletedAt");
