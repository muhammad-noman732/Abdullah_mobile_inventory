'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ExpenseCreateSchema } from '@/lib/validation';
import type { ActionResult } from '@/actions/stock';
import { z } from 'zod';

const REVALIDATE = () => {
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/reports');
  revalidatePath('/dashboard');
};

// ── READ: Fetch expenses list with filters ─────────────────────────────────────
export async function getExpensesAction(params: {
  category?: string;
  from?: string;    // YYYY-MM-DD
  to?: string;      // YYYY-MM-DD
  search?: string;
  month?: string;   // YYYY-MM (legacy support)
}) {
  try {
    const { category, from, to, search, month } = params;
    const where: any = { deletedAt: null };

    if (category && category !== 'all') where.category = category;

    // date range: explicit from/to takes priority over month
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    } else if (month) {
      const [year, m] = month.split('-').map(Number);
      where.expenseDate = {
        gte: new Date(year, m - 1, 1),
        lte: new Date(year, m, 0, 23, 59, 59, 999),
      };
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const [rawExpenses, sum, categoryBreakdown] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { expenseDate: 'desc' } }),
      prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
      prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    // This month totals for summary
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    const [thisMonth, thisYear] = await Promise.all([
      prisma.expense.aggregate({
        where: { deletedAt: null, expenseDate: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { deletedAt: null, expenseDate: { gte: thisYearStart } },
        _sum: { amount: true },
      }),
    ]);

    const formattedExpenses = rawExpenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      expenseDate: e.expenseDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedExpenses,
      totalAmount: Number(sum._sum.amount || 0),
      totalCount: sum._count.id,
      thisMonthTotal: Number(thisMonth._sum.amount || 0),
      thisYearTotal: Number(thisYear._sum.amount || 0),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        amount: Number(c._sum.amount || 0),
      })),
    };
  } catch (error: any) {
    console.error('getExpensesAction error:', error);
    return {
      success: false, error: 'Failed to fetch expenses',
      data: [], totalAmount: 0, totalCount: 0,
      thisMonthTotal: 0, thisYearTotal: 0, categoryBreakdown: [],
    };
  }
}

// ── MUTATION: Record a new expense ─────────────────────────────────────────────
export async function addExpenseAction(payload: unknown): Promise<ActionResult> {
  const parsed = ExpenseCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Invalid expense data.',
    };
  }

  const data = parsed.data;
  try {
    await prisma.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        category: data.category,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        notes: data.notes || null,
      },
    });
    REVALIDATE();
    return { success: true };
  } catch (err) {
    console.error('addExpenseAction error:', err);
    return { success: false, error: 'Failed to record expense.' };
  }
}

// ── MUTATION: Update an expense ────────────────────────────────────────────────
export async function updateExpenseAction(id: number, payload: unknown): Promise<ActionResult> {
  const UpdateSchema = ExpenseCreateSchema.partial();
  const parsed = UpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Invalid update data.',
    };
  }

  try {
    const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: 'Expense not found.' };

    const data = parsed.data;
    await prisma.expense.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.expenseDate !== undefined && { expenseDate: new Date(data.expenseDate) }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });
    REVALIDATE();
    return { success: true };
  } catch (err) {
    console.error('updateExpenseAction error:', err);
    return { success: false, error: 'Failed to update expense.' };
  }
}

// ── MUTATION: Soft-delete an expense ──────────────────────────────────────────
export async function deleteExpenseAction(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: 'Expense not found.' };

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    REVALIDATE();
    return { success: true };
  } catch (err) {
    console.error('deleteExpenseAction error:', err);
    return { success: false, error: 'Failed to delete expense.' };
  }
}
