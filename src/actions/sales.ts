'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SaleCreateSchema } from '@/lib/validation';
import type { ActionResult } from '@/actions/stock';

export async function getSalesAction(params: {
  filter?: string;
  from?: string;
  to?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const filter = params.filter;
    const from = params.from;
    const to = params.to;
    const paymentMethod = params.paymentMethod;
    const search = params.search?.trim() || '';
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = { deletedAt: null };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === 'custom') {
      if (from || to) {
        where.saleDate = {};
        if (from) (where.saleDate as any).gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          (where.saleDate as any).lte = toDate;
        }
      }
    } else if (filter) {
      let dateFrom: Date | null = null;
      let dateTo: Date | null = null;

      switch (filter) {
        case 'today':
          dateFrom = new Date(todayStart);
          dateTo = new Date(todayStart);
          break;
        case 'week': {
          const weekStart = new Date(todayStart);
          const day = weekStart.getDay();
          weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
          dateFrom = weekStart;
          dateTo = new Date(todayStart);
          break;
        }
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          dateTo = new Date(todayStart);
          break;
        case 'lastmonth': {
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          dateTo = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        }
      }

      if (dateFrom && dateTo) {
        where.saleDate = {};
        (where.saleDate as any).gte = dateFrom;
        dateTo.setHours(23, 59, 59, 999);
        (where.saleDate as any).lte = dateTo;
      }
    } else {
      // fallback: direct from/to (used by daily-sales page)
      if (from || to) {
        where.saleDate = {};
        if (from) (where.saleDate as any).gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          (where.saleDate as any).lte = toDate;
        }
      }
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { items: { some: { model: { contains: search, mode: 'insensitive' } } } },
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
      pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
      summary: { totalRevenue, totalProfit, totalTransactions, totalUnits },
    };
  } catch (error: any) {
    console.error('getSalesAction error:', error);
    return {
      success: false,
      error: 'Failed to fetch sales history',
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      summary: { totalRevenue: 0, totalProfit: 0, totalTransactions: 0, totalUnits: 0 },
    };
  }
}

export async function getSalesSummaryAction() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, monthSales, totalUnitsToday, totalUnitsMonth] = await Promise.all([
      prisma.sale.aggregate({
        where: { saleDate: { gte: today, lte: todayEnd }, deletedAt: null },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { saleDate: { gte: monthStart }, deletedAt: null },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),
      prisma.saleItem.aggregate({
        where: { sale: { saleDate: { gte: today, lte: todayEnd }, deletedAt: null } },
        _sum: { quantity: true },
      }),
      prisma.saleItem.aggregate({
        where: { sale: { saleDate: { gte: monthStart }, deletedAt: null } },
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
    return {
      success: false,
      data: {
        today: { revenue: 0, profit: 0, transactions: 0, units: 0 },
        month: { revenue: 0, profit: 0, transactions: 0, units: 0 },
      },
    };
  }
}

export async function createSaleAction(payload: unknown): Promise<ActionResult<{ saleId: number }>> {
  const parsed = SaleCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: 'Invalid sale data.',
    };
  }

  const { items, customerName, paymentMethod, isUdhar } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalCost = 0;
      let totalAmount = 0;
      const saleItemData: any[] = [];

      for (const item of items) {
        if (item.itemType === 'mobile') {
          const stock = await tx.stock.findUnique({ where: { id: item.stockId! } });
          if (!stock) throw new Error(`Stock item ID ${item.stockId} not found.`);
          if (stock.deletedAt) throw new Error(`Stock item ${stock.model} has already been sold.`);
          if (stock.quantity < item.quantity)
            throw new Error(`Insufficient stock for ${stock.model}. Available: ${stock.quantity}`);

          totalCost += Number(stock.purchasePrice) * item.quantity;
          totalAmount += item.salePrice * item.quantity;

          saleItemData.push({
            stockId: stock.id,
            accessoryId: null,
            itemType: 'mobile',
            brand: 'Mobile',
            model: stock.model,
            variant: null,
            quantity: item.quantity,
            purchasePrice: stock.purchasePrice,
            salePrice: item.salePrice,
            subtotal: item.salePrice * item.quantity,
            profit: (item.salePrice - Number(stock.purchasePrice)) * item.quantity,
          });

          const newQty = stock.quantity - item.quantity;
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: Math.max(0, newQty) },
          });
        } else {
          const accessory = await tx.accessory.findUnique({ where: { id: item.accessoryId! } });
          if (!accessory) throw new Error(`Accessory ID ${item.accessoryId} not found.`);
          if (accessory.quantity < item.quantity)
            throw new Error(`Insufficient stock for ${accessory.name}. Available: ${accessory.quantity}`);

          totalCost += Number(accessory.purchasePrice) * item.quantity;
          totalAmount += item.salePrice * item.quantity;

          saleItemData.push({
            stockId: null,
            accessoryId: accessory.id,
            itemType: 'accessory',
            brand: 'Accessory',
            model: accessory.name,
            variant: null,
            quantity: item.quantity,
            purchasePrice: accessory.purchasePrice,
            salePrice: item.salePrice,
            subtotal: item.salePrice * item.quantity,
            profit: (item.salePrice - Number(accessory.purchasePrice)) * item.quantity,
          });

          const newQty = accessory.quantity - item.quantity;
          await tx.accessory.update({
            where: { id: accessory.id },
            data: { quantity: Math.max(0, newQty) },
          });
        }
      }

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
          items: { create: saleItemData },
        },
      });

      return sale;
    });

    revalidatePath('/dashboard/daily-sales');
    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/accessories');
    revalidatePath('/dashboard');

    return { success: true, data: { saleId: result.id } };
  } catch (err: any) {
    console.error('createSaleAction error:', err);
    return { success: false, error: err.message || 'Failed to record sale.' };
  }
}

export async function deleteSaleAction(id: number): Promise<ActionResult> {
  try {
    const existing = await prisma.sale.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    if (!existing) return { success: false, error: 'Sale not found.' };

    await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        if (item.stockId) {
          await tx.stock.update({
            where: { id: item.stockId },
            data: { quantity: { increment: item.quantity } },
          });
        }
        if (item.accessoryId) {
          await tx.accessory.update({
            where: { id: item.accessoryId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      await tx.sale.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/daily-sales');
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/accessories');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('deleteSaleAction error:', err);
    return { success: false, error: 'Failed to delete sale.' };
  }
}
