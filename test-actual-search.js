// Test using the actual search function from ai.tools.ts
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
    log: [],
});

// Copy the search logic from ai.tools.ts
async function searchProducts(args) {
  const { name, category, minPrice, maxPrice, limit = 5 } = args;

  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
      ...(category && {
        categories: {
          some: {
            category: {
              OR: [
                { name: { contains: category, mode: "insensitive" } },
                { slug: { contains: category, mode: "insensitive" } },
              ],
            },
          },
        },
      }),
      ...(name && {
        OR: [
          { name: { contains: name, mode: "insensitive" } },
          { slug: { contains: name, mode: "insensitive" } },
          { sku: { contains: name, mode: "insensitive" } },
          { vendor: { shopName: { contains: name, mode: "insensitive" } } },
        ],
      }),
    },
    include: {
      categories: { include: { category: true } },
      vendor: { select: { shopName: true } },
    },
    take: limit,
    orderBy: { rating: "desc" },
  });

  if (products.length === 0) {
    return JSON.stringify({ message: "দুঃখিত, এ আইডির কোন পণ্য আমাদের বাজারে পাওয়া যায় না। আপনি অন্য কোন পণ্য সম্পর্কে জানতে চাইছেন?", products: [] });
  }

  return JSON.stringify({
    count: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      oldPrice: p.oldPrice,
      discount: p.discount,
      stock: p.stock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      categories: p.categories.map((c) => c.category.name),
      vendor: p.vendor.shopName,
      image: p.image,
      slug: p.slug,
    })),
  });
}

async function test() {
  try {
    console.log('Testing search_products function...');

    // Test 1: Search with empty name (should return products)
    console.log('\n=== Test 1: Empty search ===');
    let result = await searchProducts({ name: '', limit: 5 });
    console.log('Result:', result);

    // Test 2: Search for a specific product name that we know exists
    console.log('\n=== Test 2: Search for "Apple" ===');
    result = await searchProducts({ name: 'Apple', limit: 5 });
    console.log('Result:', result);

    // Test 3: Search for another known product
    console.log('\n=== Test 3: Search for "Laptop" ===');
    result = await searchProducts({ name: 'Laptop', limit: 5 });
    console.log('Result:', result);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();