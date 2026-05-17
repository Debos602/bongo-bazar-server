// Test using the same prisma setup as in the project
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv/config');

// Create PostgreSQL connection pool with optimized settings
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of connections in the pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Return error after 10 seconds if unable to connect
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'event',
            level: 'error',
        },
    ],
});

async function test() {
  try {
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