'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function seedSampleDataAction() {
  try {
    const stockItems = await Promise.all([
      prisma.stock.create({ data: { model: 'Samsung Galaxy S24 Ultra', purchasePrice: 310000, quantity: 4 } }),
      prisma.stock.create({ data: { model: 'Apple iPhone 15 Pro Max', purchasePrice: 380000, quantity: 2 } }),
      prisma.stock.create({ data: { model: 'Xiaomi Redmi Note 13 Pro+', purchasePrice: 82000, quantity: 8 } }),
      prisma.stock.create({ data: { model: 'Infinix Zero 30 5G', purchasePrice: 61000, quantity: 1 } }),
      prisma.stock.create({ data: { model: 'Google Pixel 8 Pro', purchasePrice: 175000, quantity: 3 } }),
    ]);

    await prisma.accessory.createMany({
      data: [
        { name: 'Cables', purchasePrice: 150, quantity: 20 },
        { name: 'Glass', purchasePrice: 80, quantity: 15 },
        { name: 'Powerbank', purchasePrice: 800, quantity: 8 },
        { name: 'Airpods', purchasePrice: 1200, quantity: 5 },
        { name: 'Adapter', purchasePrice: 300, quantity: 12 },
      ],
    });

    await prisma.sale.create({
      data: {
        customerName: 'Muhammad Usman',
        paymentMethod: 'Cash',
        totalAmount: 94999,
        totalCost: 82000,
        totalProfit: 12999,
        saleDate: new Date(),
        items: {
          create: [
            {
              stockId: stockItems[2].id,
              itemType: 'mobile',
              brand: 'Mobile',
              model: stockItems[2].model,
              quantity: 1,
              purchasePrice: 82000,
              salePrice: 94999,
              subtotal: 94999,
              profit: 12999,
            },
          ],
        },
      },
    });

    await prisma.udhar.create({
      data: {
        customerName: 'Tariq Mehmood',
        customerPhone: '0301-7654321',
        phoneSold: 'Samsung Galaxy A55 5G',
        totalAmount: 125000,
        paidAmount: 50000,
        remaining: 75000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Partial',
        payments: {
          create: [{ amountPaid: 50000, notes: 'Upfront cash payment' }],
        },
      },
    });

    await prisma.expense.createMany({
      data: [
        { description: 'Shop Rent for Current Month', amount: 45000, category: 'Rent', expenseDate: new Date() },
        { description: 'Electricity Bill', amount: 18500, category: 'Electricity', expenseDate: new Date() },
        { description: 'Tea & Refreshments', amount: 3200, category: 'Other', expenseDate: new Date() },
      ],
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/udhar');
    revalidatePath('/dashboard/expenses');
    revalidatePath('/dashboard/reports');

    return { success: true, message: 'Sample data seeded successfully!' };
  } catch (error: any) {
    console.error('seedSampleDataAction error:', error);
    return { success: false, error: 'Failed to seed sample data' };
  }
}
