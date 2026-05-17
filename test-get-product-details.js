// Test the get_product_details function
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

// Copy the get_product_details logic from ai.tools.ts
async function getProductDetails(args) {
  const { productId, slug } = args;

  const product = await prisma.product.findFirst({
    where: {
      ...(productId ? { id: productId } : {}),
      ...(slug ? { slug } : {}),
      isPublished: true,
    },
    include: {
      categories: { include: { category: true } },
      vendor: { select: { shopName: true } },
      reviews: {
        take: 3,
        orderBy: { createdAt: "desc" },
        select: { rating: true, comment: true },
      },
    },
  });

  if (!product) {
    return JSON.stringify({ message: "Product পাওয়া যায়নি।" });
  }

  return JSON.stringify({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    oldPrice: product.oldPrice,
    discount: product.discount
      ? `${product.discount}% ছাড়`
      : "কোনো ছাড় নেই",
    stock: product.stock,
    inStock: product.stock > 0,
    rating: product.rating,
    reviewCount: product.reviewCount,
    categories: product.categories.map((c) => c.category.name),
    vendor: product.vendor.shopName,
    recentReviews: product.reviews,
    image: product.image,
  });
}

async function test() {
  try {
    console.log('Testing get_product_details function...');

    // Test 1: Get product by ID that we know exists
    console.log('\n=== Test 1: Get product by ID 10168 ===');
    let result = await getProductDetails({ productId: 10168 });
    console.log('Result:', result);

    // Test 2: Get product by ID that doesn't exist
    console.log('\n=== Test 2: Get product by ID 99999 (non-existent) ===');
    result = await getProductDetails({ productId: 99999 });
    console.log('Result:', result);

    // Test 3: Get product by slug
    console.log('\n=== Test 3: Get product by slug "apple-laptop-760" ===');
    result = await getProductDetails({ slug: 'apple-laptop-760' });
    console.log('Result:', result);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();