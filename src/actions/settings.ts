'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { SettingsUpdateSchema } from '@/lib/validation';
import type { ActionResult } from '@/actions/stock';

// ── READ: Fetch shop settings ──────────────────────────────────────────────────
export async function getSettingsAction() {
  try {
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          shopName: 'My Mobile Shop',
          city: 'Faisalabad',
          currencyLabel: 'Rs',
          receiptFooter: 'Thank you for shopping with us! No returns without receipt.',
        },
      });
    }

    return {
      success: true,
      data: settings,
    };
  } catch (error: any) {
    console.error('getSettingsAction error:', error);
    return { success: false, error: 'Failed to fetch settings', data: null };
  }
}

// ── MUTATION: Update shop settings ─────────────────────────────────────────────
export async function updateSettingsAction(payload: unknown): Promise<ActionResult> {
  const parsed = SettingsUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Invalid shop configuration.',
    };
  }

  const data = parsed.data;

  try {
    const existing = await prisma.setting.findFirst();
    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.setting.create({
        data: {
          shopName: data.shopName || 'Mobile Inventory POS',
          ...data,
        },
      });
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('updateSettingsAction error:', err);
    return { success: false, error: 'Failed to update settings.' };
  }
}

// ── MUTATION: Clear all data ───────────────────────────────────────────────────
export async function clearAllDataAction(confirmationText: string): Promise<ActionResult> {
  if (confirmationText !== 'DELETE ALL DATA') {
    return { success: false, error: 'Confirmation string does not match.' };
  }

  try {
    await prisma.$transaction([
      prisma.udharPayment.deleteMany(),
      prisma.udhar.deleteMany(),
      prisma.saleItem.deleteMany(),
      prisma.sale.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.stock.deleteMany(),
    ]);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/udhar');
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/reports');

    return { success: true };
  } catch (err) {
    console.error('clearAllDataAction error:', err);
    return { success: false, error: 'Failed to clear database data.' };
  }
}
