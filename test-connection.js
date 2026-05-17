const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('Connected to database');

    // Check if there are any products
    const count = await prisma.product.count();
    console.log('Total products:', count);

    // Check published products
    const publishedCount = await prisma.product.count({
      where: { isPublished: true }
    });
    console.log('Published products:', publishedCount);

    // Get first few products
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      take: 3,
      select: { id: true, name: true, stock: true, price: true }
    });

    console.log('Sample products:');
    products.forEach(p => {
      console.log('- ID: ' + p.id + ', Name: ' + p.name + ', Stock: ' + p.stock + ', Price: ৳' + p.price);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();