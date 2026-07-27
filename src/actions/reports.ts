'use server';

import prisma from '@/lib/prisma';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, eachDayOfInterval, addDays } from 'date-fns';

type Period = 'today' | 'week' | 'month' | 'lastmonth' | 'year' | 'custom';

function getDateRange(period: Period, from?: string, to?: string) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'lastmonth': {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case 'year':
      return { start: startOfYear(now), end: endOfDay(now) };
    case 'custom':
      return {
        start: from ? startOfDay(new Date(from)) : startOfMonth(now),
        end: to ? endOfDay(new Date(to)) : endOfDay(now),
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

// ── Main comprehensive report ──────────────────────────────────────────────────
export async function getReportsAction(
  period: Period = 'month',
  from?: string,
  to?: string
) {
  try {
    const { start, end } = getDateRange(period, from, to);

    const [salesAgg, expensesAgg, udharCollectedAgg, salesItems, categoryExpenses, paymentMethods, sales] =
      await Promise.all([
        // KPI aggregates
        prisma.sale.aggregate({
          where: { saleDate: { gte: start, lte: end }, deletedAt: null },
          _sum: { totalAmount: true, totalProfit: true, totalCost: true },
          _count: { id: true },
        }),
        prisma.expense.aggregate({
          where: { expenseDate: { gte: start, lte: end }, deletedAt: null },
          _sum: { amount: true },
        }),
        prisma.udharPayment.aggregate({
          where: { paymentDate: { gte: start, lte: end }, deletedAt: null, udhar: { deletedAt: null } },
          _sum: { amountPaid: true },
        }),
        // Top selling models
        prisma.saleItem.groupBy({
          by: ['brand', 'model'],
          where: { sale: { saleDate: { gte: start, lte: end }, deletedAt: null } },
          _sum: { quantity: true, subtotal: true, profit: true, purchasePrice: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        }),
        // Expense breakdown by category
        prisma.expense.groupBy({
          by: ['category'],
          where: { expenseDate: { gte: start, lte: end }, deletedAt: null },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
        // Payment method breakdown
        prisma.sale.groupBy({
          by: ['paymentMethod'],
          where: { saleDate: { gte: start, lte: end }, deletedAt: null },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        // All sales in period for daily breakdown
        prisma.sale.findMany({
          where: { saleDate: { gte: start, lte: end }, deletedAt: null },
          select: { saleDate: true, totalAmount: true, totalProfit: true, totalCost: true },
          orderBy: { saleDate: 'asc' },
        }),
      ]);

    const revenue = Number(salesAgg._sum.totalAmount || 0);
    const grossProfit = Number(salesAgg._sum.totalProfit || 0);
    const costOfGoods = Number(salesAgg._sum.totalCost || 0);
    const totalExpenses = Number(expensesAgg._sum.amount || 0);
    const netProfit = grossProfit - totalExpenses;
    const unitsSold = await prisma.saleItem.aggregate({
      where: { sale: { saleDate: { gte: start, lte: end }, deletedAt: null } },
      _sum: { quantity: true },
    });

    // Daily breakdown — group sales by date
    const dailyMap: Record<string, { revenue: number; profit: number; cost: number; transactions: number }> = {};
    for (const sale of sales) {
      const dateKey = sale.saleDate.toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, profit: 0, cost: 0, transactions: 0 };
      dailyMap[dateKey].revenue += Number(sale.totalAmount);
      dailyMap[dateKey].profit += Number(sale.totalProfit);
      dailyMap[dateKey].cost += Number(sale.totalCost);
      dailyMap[dateKey].transactions += 1;
    }

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Chart data: revenue + profit trend (for AreaChart)
    const trendData = dailyBreakdown.map((d) => ({
      date: format(new Date(d.date), 'dd MMM'),
      revenue: Math.round(d.revenue),
      profit: Math.round(d.profit),
    }));

    return {
      success: true,
      data: {
        summary: {
          revenue,
          costOfGoods,
          grossProfit,
          totalExpenses,
          netProfit,
          transactionsCount: salesAgg._count.id,
          unitsSold: Number(unitsSold._sum.quantity || 0),
          avgSaleValue: salesAgg._count.id > 0 ? revenue / salesAgg._count.id : 0,
          udharCollected: Number(udharCollectedAgg._sum.amountPaid || 0),
        },
        topSelling: salesItems.map((item) => ({
          brand: item.brand,
          model: item.model,
          label: `${item.brand} ${item.model}`,
          unitsSold: Number(item._sum.quantity || 0),
          revenue: Number(item._sum.subtotal || 0),
          profit: Number(item._sum.profit || 0),
          cost: Number(item._sum.subtotal || 0) - Number(item._sum.profit || 0),
        })),
        expenseBreakdown: categoryExpenses.map((cat) => ({
          category: cat.category,
          amount: Number(cat._sum.amount || 0),
          value: Number(cat._sum.amount || 0), // for recharts
        })),
        paymentMethods: paymentMethods.map((p) => ({
          method: p.paymentMethod,
          count: p._count.id,
          total: Number(p._sum.totalAmount || 0),
          value: Number(p._sum.totalAmount || 0), // for recharts
        })),
        dailyBreakdown,
        trendData,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
      },
    };
  } catch (error: any) {
    console.error('getReportsAction error:', error);
    return {
      success: false,
      error: 'Failed to generate report',
      data: {
        summary: {
          revenue: 0, costOfGoods: 0, grossProfit: 0, totalExpenses: 0, netProfit: 0,
          transactionsCount: 0, unitsSold: 0, avgSaleValue: 0, udharCollected: 0,
        },
        topSelling: [],
        expenseBreakdown: [],
        paymentMethods: [],
        dailyBreakdown: [],
        trendData: [],
        dateRange: { start: '', end: '' },
      },
    };
  }
}
