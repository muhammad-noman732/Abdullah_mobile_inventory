'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SaleCreateSchema } from '@/lib/validation';
import type { ActionResult } from '@/actions/stock';

// ── READ: Fetch paginated sales list with filters ──────────────────────────────
export async function getSalesAction(params: {
  from?: string;
  to?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const from = params.from;
    const to = params.to;
    const paymentMethod = params.paymentMethod;
    const search = params.search?.trim() || '';
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = { deletedAt: null };

    if (from || to) {
      where.saleDate = {};
      if (from) (where.saleDate as any).gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (where.saleDate as any).lte = toDate;
      }
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { items: { some: { model: { contains: search, mode: 'insensitive' } } } },
        { items: { some: { brand: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [rawSales, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      prisma.sale.count({ where }),
    ]);

    const summaryAgg = await prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true, totalProfit: true },
      _count: { id: true },
    });

    const unitsSoldAgg = await prisma.saleItem.aggregate({
      where: { sale: where },
      _sum: { quantity: true },
    });

    const totalRevenue = Number(summaryAgg._sum.totalAmount || 0);
    const totalProfit = Number(summaryAgg._sum.totalProfit || 0);
    const totalTransactions = summaryAgg._count.id;
    const totalUnits = unitsSoldAgg._sum.quantity || 0;
    const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const formattedSales = rawSales.map((sale) => ({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      totalProfit: Number(sale.totalProfit),
      totalCost: Number(sale.totalCost),
      saleDate: sale.saleDate.toISOString(),
      createdAt: sale.createdAt.toISOString(),
      items: sale.items.map((item) => ({
        ...item,
        purchasePrice: Number(item.purchasePrice),
        salePrice: Number(item.salePrice),
        subtotal: Number(item.subtotal),
        profit: Number(item.profit),
      })),
    }));

    return {
      success: true,
      data: formattedSales,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalRevenue,
        totalProfit,
        totalTransactions,
        totalUnits,
        avgSale,
      },
    };
  } catch (error: any) {
    console.error('getSalesAction error:', error);
    return {
      success: false,
      error: 'Failed to fetch sales history',
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      summary: { totalRevenue: 0, totalProfit: 0, totalTransactions: 0, totalUnits: 0, avgSale: 0 },
    };
  }
}

// ── READ: Fetch today and month sales summary ─────────────────────────────────
export async function getSalesSummaryAction() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, monthSales, totalUnitsToday, totalUnitsMonth] = await Promise.all([
      prisma.sale.aggregate({
        where: { saleDate: { gte: today, lte: todayEnd } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { saleDate: { gte: monthStart } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),
      prisma.saleItem.aggregate({
        where: { sale: { saleDate: { gte: today, lte: todayEnd } } },
        _sum: { quantity: true },
      }),
      prisma.saleItem.aggregate({
        where: { sale: { saleDate: { gte: monthStart } } },
        _sum: { quantity: true },
      }),
    ]);

    return {
      success: true,
      data: {
        today: {
          revenue: Number(todaySales._sum.totalAmount || 0),
          profit: Number(todaySales._sum.totalProfit || 0),
          transactions: todaySales._count.id,
          units: totalUnitsToday._sum.quantity || 0,
        },
        month: {
          revenue: Number(monthSales._sum.totalAmount || 0),
          profit: Number(monthSales._sum.totalProfit || 0),
          transactions: monthSales._count.id,
          units: totalUnitsMonth._sum.quantity || 0,
        },
      },
    };
  } catch (error: any) {
    console.error('getSalesSummaryAction error:', error);
    return {
      success: false,
      data: {
        today: { revenue: 0, profit: 0, transactions: 0, units: 0 },
        month: { revenue: 0, profit: 0, transactions: 0, units: 0 },
      },
    };
  }
}

// ── MUTATION: Record a new sale (atomic multi-item) ───────────────────────────
export async function createSaleAction(payload: unknown): Promise<ActionResult<{ saleId: number }>> {
  const parsed = SaleCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Invalid sale data.',
    };
  }

  const { items, customerName, paymentMethod, isUdhar, customerPhone, paidUpfront, dueDate, notes } =
    parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalCost = 0;
      let totalAmount = 0;

      const stockItems = await Promise.all(
        items.map(async (item) => {
          const stock = await tx.stock.findUnique({ where: { id: item.stockId } });
          if (!stock) throw new Error(`Stock item ID ${item.stockId} not found.`);
          if (stock.quantity < item.quantity)
            throw new Error(
              `Insufficient stock for ${stock.brand} ${stock.model}. Available: ${stock.quantity}`
            );
          return { stock, requestedQty: item.quantity, salePrice: item.salePrice };
        })
      );

      stockItems.forEach(({ stock, requestedQty, salePrice }) => {
        totalCost += Number(stock.purchasePrice) * requestedQty;
        totalAmount += salePrice * requestedQty;
      });

      const totalProfit = totalAmount - totalCost;

      const sale = await tx.sale.create({
        data: {
          customerName: customerName || 'Walk-in',
          paymentMethod,
          totalAmount,
          totalCost,
          totalProfit,
          isUdhar,
          saleDate: new Date(),
          items: {
            create: stockItems.map(({ stock, requestedQty, salePrice }) => ({
              stockId: stock.id,
              brand: stock.brand,
              model: stock.model,
              variant: stock.variant,
              quantity: requestedQty,
              purchasePrice: stock.purchasePrice,
              salePrice,
              subtotal: salePrice * requestedQty,
              profit: (salePrice - Number(stock.purchasePrice)) * requestedQty,
            })),
          },
        },
      });

      await Promise.all(
        stockItems.map(({ stock, requestedQty }) =>
          tx.stock.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity - requestedQty },
          })
        )
      );

      if (isUdhar) {
        const paid = paidUpfront || 0;
        const remaining = Math.max(0, totalAmount - paid);
        const status = remaining === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
        const phoneSold = stockItems
          .map(({ stock }) => `${stock.brand} ${stock.model}`)
          .join(', ');

        await tx.udhar.create({
          data: {
            saleId: sale.id,
            customerName: customerName || 'Walk-in',
            customerPhone: customerPhone || '',
            phoneSold,
            totalAmount,
            paidAmount: paid,
            remaining,
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || null,
            status,
            ...(paid > 0 && {
              payments: {
                create: { amountPaid: paid, notes: 'Upfront payment at time of sale' },
              },
            }),
          },
        });
      }

      return sale;
    });

    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/udhar');
    revalidatePath('/dashboard');

    return { success: true, data: { saleId: result.id } };
  } catch (err: any) {
    console.error('createSaleAction error:', err);
    return { success: false, error: err.message || 'Failed to record sale.' };
  }
}

// ── MUTATION: Soft-delete a sale ──────────────────────────────────────────
export async function deleteSaleAction(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.sale.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { success: false, error: 'Sale not found.' };

    await prisma.sale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('deleteSaleAction error:', err);
    return { success: false, error: 'Failed to delete sale.' };
  }
}
