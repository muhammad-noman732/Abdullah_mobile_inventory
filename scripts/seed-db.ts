import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(' Seeding mobile inventory database with rich test data...');

  // 1. Clean existing data (only soft-deleted or full clean)
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.udharPayment.deleteMany();
  await prisma.udhar.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.stock.deleteMany();

  console.log('🧹 Existing data cleaned.');

  // 2. Create Stock Items
  const stockData = [
    {
      brand: 'Apple',
      model: 'iPhone 15 Pro',
      variant: '256GB - Natural Titanium',
      condition: 'Brand New',
      purchasePrice: 280000,
      sellingPrice: 315000,
      quantity: 5,
      lowStockAlert: 2,
      imei: '354891109283741',
      notes: 'PTA Approved Box Packed',
      dateAdded: new Date('2026-07-01'),
    },
    {
      brand: 'Apple',
      model: 'iPhone 14',
      variant: '128GB - Blue',
      condition: 'Open Box',
      purchasePrice: 170000,
      sellingPrice: 192000,
      quantity: 3,
      lowStockAlert: 1,
      imei: '359128104827104',
      notes: 'Waterproof tested 100% Battery Health',
      dateAdded: new Date('2026-07-05'),
    },
    {
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      variant: '512GB - Titanium Gray',
      condition: 'Brand New',
      purchasePrice: 340000,
      sellingPrice: 385000,
      quantity: 4,
      lowStockAlert: 2,
      imei: '351982049182301',
      notes: 'Official Warranty 1 Year',
      dateAdded: new Date('2026-07-10'),
    },
    {
      brand: 'Samsung',
      model: 'Galaxy A55 5G',
      variant: '128GB - Awesome Iceblue',
      condition: 'Brand New',
      purchasePrice: 110000,
      sellingPrice: 125000,
      quantity: 8,
      lowStockAlert: 3,
      imei: '358172049817203',
      notes: 'Best Seller Budget Phone',
      dateAdded: new Date('2026-07-12'),
    },
    {
      brand: 'Xiaomi',
      model: 'Redmi Note 13 Pro',
      variant: '256GB - Midnight Black',
      condition: 'Used',
      purchasePrice: 58000,
      sellingPrice: 68000,
      quantity: 6,
      lowStockAlert: 2,
      imei: '861928049182701',
      notes: '9/10 Condition with Original Charger',
      dateAdded: new Date('2026-07-14'),
    },
    {
      brand: 'OnePlus',
      model: 'OnePlus 12',
      variant: '512GB - Silky Black',
      condition: 'Brand New',
      purchasePrice: 215000,
      sellingPrice: 240000,
      quantity: 2,
      lowStockAlert: 1,
      imei: '869102839182741',
      notes: 'CN Rom Global OxygenOS',
      dateAdded: new Date('2026-07-15'),
    },
    {
      brand: 'Vivo',
      model: 'Vivo V30 5G',
      variant: '256GB - Peacock Green',
      condition: 'Open Box',
      purchasePrice: 115000,
      sellingPrice: 132000,
      quantity: 1, // LOW STOCK ALERT TRIGGER
      lowStockAlert: 2,
      imei: '864910283918274',
      notes: 'Aura Light Camera Special Edition',
      dateAdded: new Date('2026-07-18'),
    },
  ];

  const createdStock: any[] = [];
  for (const s of stockData) {
    const item = await prisma.stock.create({ data: s });
    createdStock.push(item);
  }
  console.log(`✅ Created ${createdStock.length} stock models.`);

  // 3. Create Sales & SaleItems over last 7 days
  const now = new Date();
  const salesToCreate = [
    {
      customerName: 'Muhammad Ali',
      customerPhone: '0300-1234567',
      paymentMethod: 'Cash',
      daysAgo: 0, // Today
      items: [
        { stockIndex: 0, qty: 1 }, // iPhone 15 Pro
      ],
    },
    {
      customerName: 'Usman Khan',
      customerPhone: '0321-5554321',
      paymentMethod: 'JazzCash',
      daysAgo: 1, // Yesterday
      items: [
        { stockIndex: 3, qty: 1 }, // Galaxy A55
      ],
    },
    {
      customerName: 'Tariq Mahmood',
      customerPhone: '0333-7778899',
      paymentMethod: 'Easypaisa',
      daysAgo: 2,
      items: [
        { stockIndex: 4, qty: 1 }, // Redmi Note 13 Pro
      ],
    },
    {
      customerName: 'Hamza Sheikh',
      customerPhone: '0345-1122334',
      paymentMethod: 'Card',
      daysAgo: 3,
      items: [
        { stockIndex: 5, qty: 1 }, // OnePlus 12
      ],
    },
    {
      customerName: 'Zahid Ahmed',
      customerPhone: '0302-8899000',
      paymentMethod: 'Udhar',
      daysAgo: 4,
      items: [
        { stockIndex: 1, qty: 1 }, // iPhone 14
      ],
    },
    {
      customerName: 'Bilal Raza',
      customerPhone: '0313-4455667',
      paymentMethod: 'Cash',
      daysAgo: 5,
      items: [
        { stockIndex: 2, qty: 1 }, // Galaxy S24 Ultra
      ],
    },
  ];

  for (const saleSpec of salesToCreate) {
    const saleDate = new Date(now);
    saleDate.setDate(saleDate.getDate() - saleSpec.daysAgo);

    let totalAmount = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const itemsData = saleSpec.items.map((spec) => {
      const stock = createdStock[spec.stockIndex];
      const purchasePrice = Number(stock.purchasePrice);
      const salePrice = Number(stock.sellingPrice);
      const subtotal = salePrice * spec.qty;
      const profit = (salePrice - purchasePrice) * spec.qty;

      totalAmount += subtotal;
      totalCost += purchasePrice * spec.qty;
      totalProfit += profit;

      return {
        stockId: stock.id,
        brand: stock.brand,
        model: stock.model,
        variant: stock.variant,
        quantity: spec.qty,
        purchasePrice,
        salePrice,
        subtotal,
        profit,
      };
    });

    await prisma.sale.create({
      data: {
        customerName: saleSpec.customerName,
        paymentMethod: saleSpec.paymentMethod,
        totalAmount,
        totalCost,
        totalProfit,
        isUdhar: saleSpec.paymentMethod === 'Udhar',
        saleDate,
        createdAt: saleDate,
        items: {
          create: itemsData,
        },
      },
    });
  }
  console.log(`✅ Created ${salesToCreate.length} historical sales & sale items.`);

  // 4. Create Udhar Credit Ledger Records + Payments
  const udharData = [
    {
      customerName: 'Noman Malik',
      customerPhone: '0300-9876543',
      phoneSold: 'iPhone 15 Pro 256GB',
      totalAmount: 315000,
      paidAmount: 215000,
      remaining: 100000,
      status: 'Partial',
      dueDate: new Date(now.getTime() + 5 * 86400000), // Due in 5 days
      notes: 'Customer promised payment on Friday after salary',
      payments: [
        { amountPaid: 150000, paymentMethod: 'Cash', notes: 'Initial Upfront Deposit', daysAgo: 10 },
        { amountPaid: 65000, paymentMethod: 'Bank Transfer', notes: 'First Installment', daysAgo: 3 },
      ],
    },
    {
      customerName: 'Kashif Saeed',
      customerPhone: '0321-4433221',
      phoneSold: 'Samsung Galaxy S24 Ultra',
      totalAmount: 385000,
      paidAmount: 200000,
      remaining: 185000,
      status: 'Unpaid',
      dueDate: new Date(now.getTime() - 3 * 86400000), // OVERDUE by 3 days!
      notes: 'Overdue entry - customer requested 3 days extension',
      payments: [
        { amountPaid: 200000, paymentMethod: 'JazzCash', notes: 'Advance Payment', daysAgo: 15 },
      ],
    },
    {
      customerName: 'Farhan Shah',
      customerPhone: '0333-6677889',
      phoneSold: 'Xiaomi Redmi Note 13 Pro',
      totalAmount: 68000,
      paidAmount: 68000,
      remaining: 0,
      status: 'Paid',
      dueDate: new Date(now.getTime() - 2 * 86400000),
      notes: 'Fully settled on 21st July',
      payments: [
        { amountPaid: 38000, paymentMethod: 'Cash', notes: 'Down payment', daysAgo: 20 },
        { amountPaid: 30000, paymentMethod: 'Easypaisa', notes: 'Final payment clearing balance', daysAgo: 2 },
      ],
    },
  ];

  for (const u of udharData) {
    const { payments, ...udharFields } = u;
    const udharRecord = await prisma.udhar.create({ data: udharFields });

    for (const p of payments) {
      const pDate = new Date(now);
      pDate.setDate(pDate.getDate() - p.daysAgo);

      await prisma.udharPayment.create({
        data: {
          udharId: udharRecord.id,
          amountPaid: p.amountPaid,
          notes: p.notes,
          paymentDate: pDate,
        },
      });
    }
  }
  console.log(`✅ Created ${udharData.length} Udhar credit records with payment logs.`);

  // 5. Create Operational Expenses
  const expenseData = [
    {
      description: 'Shop Rent - July 2026',
      amount: 45000,
      category: 'Rent',
      expenseDate: new Date('2026-07-01'),
      notes: 'Paid via Bank Transfer to landlord',
    },
    {
      description: 'Electricity Bill July',
      amount: 18500,
      category: 'Electricity',
      expenseDate: new Date('2026-07-10'),
      notes: 'K-Electric Bill paid via JazzCash',
    },
    {
      description: 'Salesman Monthly Salary',
      amount: 35000,
      category: 'Salary',
      expenseDate: new Date('2026-07-05'),
      notes: 'Monthly salary for Hassan',
    },
    {
      description: 'Stock Freight Cargo Transportation',
      amount: 4500,
      category: 'Transport',
      expenseDate: new Date('2026-07-12'),
      notes: 'Cargo charges from Lahore market',
    },
    {
      description: 'Social Media Sponsored Ads',
      amount: 12000,
      category: 'Marketing',
      expenseDate: new Date('2026-07-15'),
      notes: 'Facebook & Instagram shop promo ads',
    },
    {
      description: 'Shop AC Service & Gas Filling',
      amount: 6500,
      category: 'Repair & Maintenance',
      expenseDate: new Date('2026-07-18'),
      notes: 'Technician service charge',
    },
  ];

  for (const e of expenseData) {
    await prisma.expense.create({ data: e });
  }
  console.log(`✅ Created ${expenseData.length} expense entries.`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
