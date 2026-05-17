const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isPublished: true
      },
      include: {
        categories: { include: { category: true } },
        vendor: { select: { shopName: true } },
      },
      take: 10
    });

    console.log('Total published products:', products.length);
    console.log('First few products:');
    products.slice(0, 5).forEach((p, index) => {
      console.log((index + 1) + '. ' + p.name + ' (ID: ' + p.id + ') - Stock: ' + p.stock + ' - Price: ৳' + p.price);
      console.log('   Categories: ' + p.categories.map(c => c.category.name).join(', '));
      console.log('   Vendor: ' + p.vendor.shopName);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();