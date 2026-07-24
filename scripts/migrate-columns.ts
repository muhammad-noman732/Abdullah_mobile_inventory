// @ts-nocheck
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  const stmts = [
    'ALTER TABLE "Stock" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "Stock" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ',
    'ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ',
    'ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "Udhar" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "Udhar" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ',
    'ALTER TABLE "UdharPayment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "UdharPayment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ',
    'ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ',
    'ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'CREATE INDEX IF NOT EXISTS "Stock_deletedAt_idx" ON "Stock"("deletedAt")',
    'CREATE INDEX IF NOT EXISTS "Sale_deletedAt_idx" ON "Sale"("deletedAt")',
    'CREATE INDEX IF NOT EXISTS "Udhar_deletedAt_idx" ON "Udhar"("deletedAt")',
    'CREATE INDEX IF NOT EXISTS "Expense_deletedAt_idx" ON "Expense"("deletedAt")',
  ];
  for (const stmt of stmts) {
    try {
      await sql(stmt);
      console.log('OK:', stmt.slice(0, 70));
    } catch(e: any) {
      console.error('FAIL:', e.message ? e.message.slice(0, 100) : e);
    }
  }
  console.log('Migration complete!');
}
migrate().catch(console.error);
