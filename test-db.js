const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Test connection
    await prisma.$connect();
    console.log('Database connection successful');

    // Count total products
    const totalProducts = await prisma.product.count();
    console.log('Total products in database:', totalProducts);

    // Count published products
    const publishedProducts = await prisma.product.count({
      where: {
        isPublished: true
      }
    });
    console.log('Published products:', publishedProducts);

    // Get a few sample products
    const sampleProducts = await prisma.product.findMany({
      where: {
        isPublished: true
      },
      take: 3,
      include: {
        categories: { include: { category: true } },
        vendor: { select: { shopName: true } }
      }
    });

    console.log('\\nSample published products:');
    sampleProducts.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name} (ID: ${p.id})`);
      console.log(`   Stock: ${p.stock}, Price: ৳${p.price}`);
      console.log(`   Categories: ${p.categories.map(c => c.category.name).join(', ')}`);
      console.log(`   Vendor: ${p.vendor.shopName}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();