import { prisma } from './prisma';

async function main() {
  const existingSetting = await prisma.setting.findUnique({
    where: { id: 1 },
  });

  if (!existingSetting) {
    await prisma.setting.create({
      data: {
        id: 1,
        shopName: 'My Mobile Shop',
        ownerName: 'Shop Owner',
        phoneNumber: '0300-1234567',
        address: 'Main Mobile Market, Shop #12',
        city: 'Faisalabad',
        receiptFooter: 'Thank you for your purchase! Warranty as per brand policy.',
        currencyLabel: 'Rs',
      },
    });
    console.log('Default shop settings seeded successfully.');
  } else {
    console.log('Shop settings already exist.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
