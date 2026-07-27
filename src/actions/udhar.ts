'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { UdharCreateSchema, UdharPaymentSchema } from '@/lib/validation';
import type { ActionResult } from '@/actions/stock';

// ── READ: Fetch Udhar ledger records with filters and summary metrics ──────────
export async function getUdharAction(params: {
  search?: string;
  status?: string;
  due?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const search = params.search?.trim() || '';
    const status = params.status || 'all';
    const dueFilter = params.due || 'all';
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(200, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.UdharWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status !== 'all') where.status = status;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueFilter === 'overdue') {
      where.dueDate = { lt: today };
      where.status = { not: 'Paid' };
    } else if (dueFilter === 'week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      where.dueDate = { gte: today, lte: weekEnd };
    } else if (dueFilter === 'month') {
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      where.dueDate = { gte: today, lte: monthEnd };
    }

    const [rawRecords, totalCount] = await Promise.all([
      prisma.udhar.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.udhar.count({ where }),
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [outstanding, overdueAgg, collectedMonth] = await Promise.all([
      prisma.udhar.aggregate({
        where: { status: { not: 'Paid' }, deletedAt: null },
        _sum: { remaining: true },
        _count: { id: true },
      }),
      prisma.udhar.aggregate({
        where: { status: { not: 'Paid' }, dueDate: { lt: today }, deletedAt: null },
        _sum: { remaining: true },
      }),
      prisma.udharPayment.aggregate({
        where: { paymentDate: { gte: monthStart }, deletedAt: null, udhar: { deletedAt: null } },
        _sum: { amountPaid: true },
      }),
    ]);

    const formattedRecords = rawRecords.map((item) => ({
      ...item,
      totalAmount: Number(item.totalAmount),
      paidAmount: Number(item.paidAmount),
      remaining: Number(item.remaining),
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedRecords,
      pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
      summary: {
        totalOutstanding: Number(outstanding._sum.remaining || 0),
        activeDebtors: outstanding._count.id,
        overdueAmount: Number(overdueAgg._sum.remaining || 0),
        collectedThisMonth: Number(collectedMonth._sum.amountPaid || 0),
      },
    };
  } catch (error: any) {
    console.error('getUdharAction error:', error);
    return {
      success: false,
      error: 'Failed to fetch credit records',
      data: [],
      pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      summary: { totalOutstanding: 0, activeDebtors: 0, overdueAmount: 0, collectedThisMonth: 0 },
    };
  }
}

// ── READ: Fetch payment history for a single Udhar record ─────────────────────
export async function getUdharPaymentHistoryAction(udharId: number) {
  try {
    const rawPayments = await prisma.udharPayment.findMany({
      where: { udharId },
      orderBy: { paymentDate: 'asc' },
    });

    const formattedPayments = rawPayments.map((p) => ({
      ...p,
      amountPaid: Number(p.amountPaid),
      paymentDate: p.paymentDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
    }));

    return { success: true, data: formattedPayments };
  } catch (error: any) {
    console.error('getUdharPaymentHistoryAction error:', error);
    return { success: false, error: 'Failed to fetch payment history', data: [] };
  }
}

// ── MUTATION: Create new Udhar entry (standalone, no Sale record) ─────────────
export async function createUdharAction(payload: unknown): Promise<ActionResult> {
  const parsed = UdharCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Please fix validation errors.',
    };
  }

  const data = parsed.data;
  const paidUpfront = data.paidUpfront || 0;
  const remaining = Math.max(0, data.totalAmount - paidUpfront);
  const status = remaining === 0 ? 'Paid' : paidUpfront > 0 ? 'Partial' : 'Unpaid';

  try {
    await prisma.udhar.create({
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        phoneSold: data.phoneSold || null,
        totalAmount: data.totalAmount,
        paidAmount: paidUpfront,
        remaining,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        status,
        ...(paidUpfront > 0 && {
          payments: {
            create: { amountPaid: paidUpfront, notes: 'Upfront payment' },
          },
        }),
      },
    });

    revalidatePath('/dashboard/udhar');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('createUdharAction error:', err);
    return { success: false, error: 'Failed to create credit entry.' };
  }
}

// ── MUTATION: Record an installment payment (with concurrency-safe transaction) ──
export async function recordUdharPaymentAction(
  udharId: number,
  payload: unknown
): Promise<ActionResult> {
  const parsed = UdharPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Invalid payment details.',
    };
  }

  const { amountPaid, paymentDate, notes } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const udhar = await tx.udhar.findUnique({ where: { id: udharId } });
      if (!udhar) throw new Error('Udhar record not found.');
      if (udhar.deletedAt) throw new Error('This credit record has been deleted.');
      if (udhar.status === 'Paid') throw new Error('This credit is already fully paid.');
      if (amountPaid > Number(udhar.remaining)) {
        throw new Error(`Payment (Rs ${amountPaid}) exceeds remaining balance (Rs ${udhar.remaining}).`);
      }

      await tx.udharPayment.create({
        data: {
          udharId,
          amountPaid,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
        },
      });

      const newPaid = Number(udhar.paidAmount) + amountPaid;
      const newRemaining = Math.max(0, Number(udhar.totalAmount) - newPaid);
      const newStatus = newRemaining === 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

      await tx.udhar.update({
        where: { id: udharId },
        data: { paidAmount: newPaid, remaining: newRemaining, status: newStatus },
      });
    });

    revalidatePath('/dashboard/udhar');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('recordUdharPaymentAction error:', err);
    return { success: false, error: err.message || 'Failed to record payment.' };
  }
}

// ── MUTATION: Soft-delete Udhar record and its payments ──────────────────
export async function deleteUdharAction(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.udhar.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: 'Udhar record not found.' };

    const now = new Date();
    await prisma.$transaction([
      prisma.udharPayment.updateMany({ where: { udharId: id, deletedAt: null }, data: { deletedAt: now } }),
      prisma.udhar.update({ where: { id }, data: { deletedAt: now } }),
    ]);
    revalidatePath('/dashboard/udhar');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('deleteUdharAction error:', err);
    return { success: false, error: 'Failed to delete Udhar record.' };
  }
}
