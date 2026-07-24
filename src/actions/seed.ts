'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function seedSampleDataAction() {
  try {
    // 1. Create sample stock
    const stockItems = await Promise.all([
      prisma.stock.create({
        data: {
          brand: 'Samsung',
          model: 'Galaxy S24 Ultra',
          variant: 'Titanium Black 512GB',
          condition: 'New',
          purchasePrice: 310000,
          sellingPrice: 345000,
          quantity: 4,
          lowStockAlert: 2,
          imei: '358941100234101',
          notes: 'Official PTA Approved, 1 Year Warranty',
        },
      }),
      prisma.stock.create({
        data: {
          brand: 'Apple',
          model: 'iPhone 15 Pro Max',
          variant: 'Natural Titanium 256GB',
          condition: 'New',
          purchasePrice: 380000,
          sellingPrice: 415000,
          quantity: 2,
          lowStockAlert: 2,
          imei: '357291100554102',
          notes: 'JV Non-PTA, Box Pack',
        },
      }),
      prisma.stock.create({
        data: {
          brand: 'Xiaomi',
          model: 'Redmi Note 13 Pro+',
          variant: 'Midnight Black 256GB',
          condition: 'New',
          purchasePrice: 82000,
          sellingPrice: 94999,
          quantity: 8,
          lowStockAlert: 3,
          imei: '86421100334103',
          notes: 'Official Warranty',
        },
      }),
      prisma.stock.create({
        data: {
          brand: 'Infinix',
          model: 'Zero 30 5G',
          variant: 'Rome Green 256GB',
          condition: 'New',
          purchasePrice: 61000,
          sellingPrice: 69999,
          quantity: 1, // Low Stock!
          lowStockAlert: 2,
          imei: '86911100444104',
          notes: 'Display Unit',
        },
      }),
      prisma.stock.create({
        data: {
          brand: 'Google',
          model: 'Pixel 8 Pro',
          variant: 'Bay Blue 128GB',
          condition: 'Open Box',
          purchasePrice: 175000,
          sellingPrice: 198000,
          quantity: 3,
          lowStockAlert: 2,
          imei: '351991100664105',
          notes: 'Factory Unlocked, 10/10 condition',
        },
      }),
    ]);

    // 2. Create sample sales
    await prisma.sale.create({
      data: {
        customerName: 'Muhammad Usman',
        paymentMethod: 'Cash',
        totalAmount: 94999,
        totalCost: 82000,
        totalProfit: 12999,
        isUdhar: false,
        saleDate: new Date(),
        items: {
          create: [
            {
              stockId: stockItems[2].id,
              brand: stockItems[2].brand,
              model: stockItems[2].model,
              variant: stockItems[2].variant,
              quantity: 1,
              purchasePrice: stockItems[2].purchasePrice,
              salePrice: 94999,
              subtotal: 94999,
              profit: 12999,
            },
          ],
        },
      },
    });

    // 3. Create sample Udhar credit entry
    await prisma.udhar.create({
      data: {
        customerName: 'Tariq Mehmood',
        customerPhone: '0301-7654321',
        phoneSold: 'Samsung Galaxy A55 5G',
        totalAmount: 125000,
        paidAmount: 50000,
        remaining: 75000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        status: 'Partial',
        notes: 'Promised to pay remaining balance next Friday',
        payments: {
          create: [
            { amountPaid: 50000, notes: 'Upfront cash payment' },
          ],
        },
      },
    });

    // 4. Create sample expenses
    await prisma.expense.createMany({
      data: [
        {
          description: 'Shop Rent for Current Month',
          amount: 45000,
          category: 'Rent',
          expenseDate: new Date(),
          notes: 'Paid to Plaza Owner',
        },
        {
          description: 'Electricity Bill',
          amount: 18500,
          category: 'Electricity',
          expenseDate: new Date(),
          notes: 'FAPCO Commercial Meter',
        },
        {
          description: 'Tea & Refreshments for Customers',
          amount: 3200,
          category: 'Other',
          expenseDate: new Date(),
        },
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
