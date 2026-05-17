import prisma from "../../../shared/prisma";

// ─── Tool Definitions (OpenRouter tool_use format) ───────────────────────────

export const aiTools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search products by name, category, price range. Use this when user asks about products, prices, availability.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Product name or keyword to search",
          },
          category: {
            type: "string",
            description: "Category slug or name to filter by",
          },
          minPrice: {
            type: "number",
            description: "Minimum price filter",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price filter",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 5)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_stock",
      description:
        "Check stock quantity of a specific product by its ID or name.",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "number",
            description: "Product ID to check stock for",
          },
          productName: {
            type: "string",
            description: "Product name if ID is unknown",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Get full details of a product: price, description, rating, images, discount.",
      parameters: {
        type: "object",
        properties: {
          productId: {
            type: "number",
            description: "Product ID",
          },
          slug: {
            type: "string",
            description: "Product slug",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse_categories",
      description:
        "Get all available product categories. Use when user asks what categories or types of products are available.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Check the status and details of an order by order ID.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "number",
            description: "Order ID to look up",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_featured_products",
      description:
        "Get featured or popular products. Use when user asks for recommendations or best sellers.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of products to return (default 5)",
          },
        },
        required: [],
      },
    },
  },
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  args: Record<string, any>
): Promise<string> {
  try {
    switch (toolName) {
      case "search_products": {
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
        console.log("[AI Tool] search_products called with:", { name, category, minPrice, maxPrice, limit });
        console.log(`[AI Tool] search_products found ${products.length} products`);

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

      case "check_stock": {
        const { productId, productName } = args;

        const product = await prisma.product.findFirst({
          where: {
            ...(productId ? { id: productId } : {}),
            ...(productName
              ? {
                  OR: [
                    { name: { contains: productName, mode: "insensitive" } },
                    { slug: { contains: productName, mode: "insensitive" } },
                    { sku: { contains: productName, mode: "insensitive" } },
                  ],
                }
              : {}),
            isPublished: true,
          },
          select: { id: true, name: true, stock: true, price: true },
        });
        console.log("[AI Tool] check_stock called with:", { productId, productName });

        if (!product) {
          console.log("[AI Tool] check_stock: product not found");
          return JSON.stringify({ message: "Product খুঁজে পাওয়া যায়নি।" });
        }

        return JSON.stringify({
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          inStock: product.stock > 0,
          message:
            product.stock === 0
              ? "Stock শেষ হয়ে গেছে।"
              : `${product.stock} টি stock আছে।`,
        });
      }

      case "get_product_details": {
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

      case "browse_categories": {
        const categories = await prisma.category.findMany({
          include: {
            _count: { select: { products: true } },
          },
          orderBy: { name: "asc" },
        });

        return JSON.stringify({
          count: categories.length,
          categories: categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            productCount: (c as any)._count.products,
          })),
        });
      }

      case "get_order_status": {
        const { orderId } = args;

        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                product: { select: { name: true, image: true } },
              },
            },
            address: {
              select: { city: true, area: true, fullName: true },
            },
            payment: {
              select: { status: true, method: true, amount: true },
            },
          },
        });

        if (!order) {
          return JSON.stringify({ message: `Order #${orderId} পাওয়া যায়নি।` });
        }

        return JSON.stringify({
          orderId: order.id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          deliveryAddress: order.address,
          payment: order.payment,
          items: order.items.map((item) => ({
            product: item.product.name,
            quantity: item.quantity,
            price: item.price,
          })),
        });
      }

      case "get_featured_products": {
        const { limit = 5 } = args;

        // প্রথমে featured খোঁজো
        let products = await prisma.product.findMany({
          where: { isFeatured: true, isPublished: true },
          include: {
            categories: { include: { category: true } },
            vendor: { select: { shopName: true } },
          },
          take: limit,
          orderBy: { rating: "desc" },
        });

        // featured না থাকলে সব published product থেকে latest দেখাও
        if (products.length === 0) {
          products = await prisma.product.findMany({
            where: { isPublished: true },
            include: {
              categories: { include: { category: true } },
              vendor: { select: { shopName: true } },
            },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
        }

        return JSON.stringify({
          count: products.length,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            discount: p.discount,
            stock: p.stock,
            rating: p.rating,
            categories: p.categories.map((c) => c.category.name),
            vendor: p.vendor.shopName,
            image: p.image,
            slug: p.slug,
          })),
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error: any) {
    return JSON.stringify({ error: error.message });
  }
}
