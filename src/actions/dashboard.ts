'use server';

import prisma from '@/lib/prisma';
import { startOfMonth, endOfMonth, subDays, startOfDay, format } from 'date-fns';

export async function getDashboardMetricsAction() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const sevenDaysAgo = subDays(today, 6);

    const [allStock, allAccessories, todaySales, monthSales, recentSalesRaw, outstandingAgg, urgentUdhar, last7DaysSales] = await Promise.all([
      prisma.stock.findMany({
        where: { deletedAt: null },
        select: { purchasePrice: true, quantity: true },
      }),
      prisma.accessory.findMany({
        where: { deletedAt: null },
        select: { purchasePrice: true, quantity: true },
      }),
      prisma.sale.aggregate({
        where: { saleDate: { gte: today, lte: todayEnd }, deletedAt: null },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { saleDate: { gte: monthStart, lte: monthEnd }, deletedAt: null },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),
      prisma.sale.findMany({
        where: { deletedAt: null },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.udhar.aggregate({
        where: { status: { not: 'Paid' }, deletedAt: null },
        _sum: { remaining: true },
        _count: { id: true },
      }),
      prisma.udhar.findMany({
        where: { status: { not: 'Paid' }, deletedAt: null },
        orderBy: [{ dueDate: 'asc' }],
        take: 4,
        select: {
          id: true, customerName: true, customerPhone: true,
          remaining: true, dueDate: true, status: true, totalAmount: true,
        },
      }),
      prisma.sale.findMany({
        where: { saleDate: { gte: startOfDay(sevenDaysAgo) }, deletedAt: null },
        select: { saleDate: true, totalAmount: true, totalProfit: true },
        orderBy: { saleDate: 'asc' },
      }),
    ]);

    const sparklineMap: Record<string, { revenue: number; profit: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      sparklineMap[d] = { revenue: 0, profit: 0 };
    }
    last7DaysSales.forEach((sale) => {
      const dateKey = sale.saleDate.toISOString().slice(0, 10);
      if (sparklineMap[dateKey]) {
        sparklineMap[dateKey].revenue += Number(sale.totalAmount);
        sparklineMap[dateKey].profit += Number(sale.totalProfit);
      }
    });

    const sparklines = {
      revenue: Object.entries(sparklineMap).map(([day, val]) => ({ day, val: val.revenue })),
      profit: Object.entries(sparklineMap).map(([day, val]) => ({ day, val: val.profit })),
    };

    const paymentBreakdownRaw = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: { saleDate: { gte: monthStart, lte: monthEnd }, deletedAt: null },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const topSelling = await prisma.saleItem.groupBy({
      by: ['brand', 'model'],
      where: { sale: { saleDate: { gte: monthStart, lte: monthEnd }, deletedAt: null } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    let stockUnits = 0;
    let stockCostValue = 0;
    allStock.forEach((item) => {
      stockUnits += item.quantity;
      stockCostValue += Number(item.purchasePrice) * item.quantity;
    });

    let accessoryUnits = 0;
    let accessoryCostValue = 0;
    allAccessories.forEach((item) => {
      accessoryUnits += item.quantity;
      accessoryCostValue += Number(item.purchasePrice) * item.quantity;
    });

    const totalInventoryUnits = stockUnits + accessoryUnits;
    const totalCostValue = stockCostValue + accessoryCostValue;

    const formattedRecentSales = recentSalesRaw.map((sale) => ({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      totalProfit: Number(sale.totalProfit),
      totalCost: Number(sale.totalCost),
      saleDate: sale.saleDate.toISOString(),
      createdAt: sale.createdAt.toISOString(),
      items: sale.items.map((i) => ({
        ...i,
        purchasePrice: Number(i.purchasePrice),
        salePrice: Number(i.salePrice),
        subtotal: Number(i.subtotal),
        profit: Number(i.profit),
      })),
    }));

    const now = new Date();
    const formattedUrgentUdhar = urgentUdhar.map((u) => {
      const daysOverdue = u.dueDate
        ? Math.floor((now.getTime() - new Date(u.dueDate).getTime()) / 86400000)
        : null;
      return {
        ...u,
        remaining: Number(u.remaining),
        totalAmount: Number(u.totalAmount),
        dueDate: u.dueDate?.toISOString() || null,
        daysOverdue: daysOverdue !== null && daysOverdue > 0 ? daysOverdue : null,
      };
    });

    return {
      success: true,
      data: {
        totalStockUnits: totalInventoryUnits,
        stockCostValue: totalCostValue,
        todaySalesRevenue: Number(todaySales._sum.totalAmount || 0),
        todayProfit: Number(todaySales._sum.totalProfit || 0),
        todayTransactions: todaySales._count.id,
        monthRevenue: Number(monthSales._sum.totalAmount || 0),
        monthProfit: Number(monthSales._sum.totalProfit || 0),
        monthTransactions: monthSales._count.id,
        outstandingUdhar: Number(outstandingAgg._sum.remaining || 0),
        activeDebtors: outstandingAgg._count.id,
        lowStockCount: 0,
        lowStockItems: [],
        recentSales: formattedRecentSales,
        urgentUdhar: formattedUrgentUdhar,
        sparklines,
        paymentMethods: paymentBreakdownRaw.map((p) => ({
          name: p.paymentMethod,
          value: Number(p._sum.totalAmount || 0),
          count: p._count.id,
        })),
        topSelling: topSelling.map((t) => ({
          label: `${t.brand} ${t.model}`,
          units: Number(t._sum.quantity || 0),
          amount: Number(t._sum.subtotal || 0),
        })),
      },
    };
  } catch (error: any) {
    console.error('getDashboardMetricsAction error:', error);
    return {
      success: false,
      data: {
        totalStockUnits: 0, stockCostValue: 0, stockSellingValue: 0,
        todaySalesRevenue: 0, todayProfit: 0, todayTransactions: 0,
        monthRevenue: 0, monthProfit: 0, monthTransactions: 0,
        outstandingUdhar: 0, activeDebtors: 0,
        lowStockCount: 0, lowStockItems: [], recentSales: [],
        urgentUdhar: [], sparklines: { revenue: [], profit: [] }, paymentMethods: [], topSelling: [],
      },
    };
  }
}
