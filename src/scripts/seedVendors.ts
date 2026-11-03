/* Adds demo vendors and products. Safe to run again: existing records are left alone.
   Usage: set SEED_VENDOR_PASSWORD in .env, then run  npm run seed:vendors  */
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Role, VendorStatus } from '@prisma/client';
import prisma from '../shared/prisma';

type DemoProduct = { name: string; price: number; oldPrice?: number; stock: number; category: string; description: string; };
type DemoVendor = {
    email: string; name: string; phone: string; shopName: string; slug: string; description: string; address: string;
    status: VendorStatus; rejectionReason?: string; products: DemoProduct[];
};

const CATEGORIES = [
    { name: 'Handicrafts', slug: 'handicrafts' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Tea and Spices', slug: 'tea-and-spices' },
    { name: 'Honey and Foods', slug: 'honey-and-foods' },
    { name: 'Home and Kitchen', slug: 'home-and-kitchen' },
];

const VENDORS: DemoVendor[] = [
    {
        email: 'jamdani.ghar@bongobazar.test', name: 'Nasima Akter', phone: '01700000001', shopName: 'Jamdani Ghar', slug: 'jamdani-ghar',
        description: 'Handwoven jamdani sarees and panjabis.', address: 'Rupganj, Narayanganj', status: VendorStatus.APPROVED,
        products: [
            { name: 'Dhakai Jamdani Saree', price: 4800, oldPrice: 6500, stock: 12, category: 'clothing', description: 'Handwoven cotton jamdani saree with a floral border.' },
            { name: 'Silk Panjabi', price: 2200, stock: 20, category: 'clothing', description: 'Silk blend panjabi for festive wear.' },
            { name: 'Cotton Three-Piece', price: 1850, oldPrice: 2300, stock: 25, category: 'clothing', description: 'Printed cotton three-piece for everyday wear.' },
        ],
    },
    {
        email: 'sylhet.cha@bongobazar.test', name: 'Rafiq Uddin', phone: '01700000002', shopName: 'Sylhet Cha Bagan', slug: 'sylhet-cha-bagan',
        description: 'Tea and spices from Sylhet.', address: 'Sreemangal, Moulvibazar', status: VendorStatus.APPROVED,
        products: [
            { name: 'Premium Black Tea 500g', price: 650, oldPrice: 800, stock: 40, category: 'tea-and-spices', description: 'Loose leaf black tea.' },
            { name: 'Green Tea 250g', price: 480, stock: 30, category: 'tea-and-spices', description: 'Whole leaf green tea.' },
            { name: 'Garam Masala 200g', price: 320, stock: 35, category: 'tea-and-spices', description: 'Ground spice blend.' },
        ],
    },
    {
        email: 'kantha.bari@bongobazar.test', name: 'Shirin Sultana', phone: '01700000003', shopName: 'Kantha Bari', slug: 'kantha-bari',
        description: 'Hand-stitched nakshi kantha and home textiles.', address: 'Jamalpur Sadar', status: VendorStatus.APPROVED,
        products: [
            { name: 'Hand-stitched Nakshi Kantha', price: 3200, oldPrice: 4000, stock: 8, category: 'handicrafts', description: 'Hand-stitched cotton quilt.' },
            { name: 'Jute Shopping Bag', price: 350, stock: 60, category: 'handicrafts', description: 'Reusable jute bag with handles.' },
        ],
    },
    {
        email: 'sundarban.modhu@bongobazar.test', name: 'Kamal Hossain', phone: '01700000004', shopName: 'Sundarban Modhu', slug: 'sundarban-modhu',
        description: 'Honey and pantry foods.', address: 'Shyamnagar, Satkhira', status: VendorStatus.APPROVED,
        products: [
            { name: 'Khalisha Honey 500g', price: 750, stock: 25, category: 'honey-and-foods', description: 'Khalisha flower honey.' },
            { name: 'Mustard Oil 1L', price: 390, stock: 45, category: 'honey-and-foods', description: 'Cold-pressed mustard oil.' },
        ],
    },
    {
        email: 'matir.kaj@bongobazar.test', name: 'Sumon Pal', phone: '01700000005', shopName: 'Matir Kaj', slug: 'matir-kaj',
        description: 'Terracotta and clay homeware.', address: 'Dhamrai, Dhaka', status: VendorStatus.APPROVED,
        products: [
            { name: 'Terracotta Tea Set', price: 1400, oldPrice: 1900, stock: 15, category: 'home-and-kitchen', description: 'Six-cup clay tea set.' },
            { name: 'Clay Cooking Pot', price: 700, stock: 18, category: 'home-and-kitchen', description: 'Glazed clay pot for slow cooking.' },
        ],
    },
    // Applications for the admin to review
    {
        email: 'rangpur.shatranji@bongobazar.test', name: 'Mitu Rahman', phone: '01700000006', shopName: 'Rangpur Shatranji', slug: 'rangpur-shatranji',
        description: 'I want to sell handwoven shatranji rugs made by our workshop.', address: 'Nisbetganj, Rangpur', status: VendorStatus.PENDING, products: [],
    },
    {
        email: 'bogura.doi@bongobazar.test', name: 'Arif Hasan', phone: '01700000007', shopName: 'Bogura Doi Ghar', slug: 'bogura-doi-ghar',
        description: 'Sweets and yogurt from Bogura, packed for delivery.', address: 'Sherpur, Bogura', status: VendorStatus.PENDING, products: [],
    },
    {
        email: 'quick.gadget@bongobazar.test', name: 'Tanvir Ahmed', phone: '01700000008', shopName: 'Quick Gadget', slug: 'quick-gadget',
        description: 'Phone accessories.', address: 'Mirpur, Dhaka', status: VendorStatus.REJECTED,
        rejectionReason: 'Please add your trade licence details and apply again.', products: [],
    },
];

const main = async () => {
    const password = process.env.SEED_VENDOR_PASSWORD;
    if (!password || password.length < 8) {
        throw new Error('Set SEED_VENDOR_PASSWORD (at least 8 characters) in .env. Demo vendors log in with it.');
    }
    const hashed = await bcrypt.hash(password, Number(process.env.SALT_ROUND) || 10);

    for (const category of CATEGORIES) {
        await prisma.category.upsert({ where: { slug: category.slug }, update: {}, create: category });
    }
    const categories = await prisma.category.findMany({ where: { slug: { in: CATEGORIES.map((c) => c.slug) } } });

    let newVendors = 0;
    let newProducts = 0;

    for (const { products, email, name, phone, status, ...shop } of VENDORS) {
        const approved = status === VendorStatus.APPROVED;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: { email, name, phone, password: hashed, isVerified: true, role: approved ? Role.VENDOR : Role.USER },
            });
        }

        let vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
        if (!vendor) {
            vendor = await prisma.vendor.create({
                data: { ...shop, phone, status, userId: user.id, approvedAt: approved ? new Date() : null },
            });
            newVendors++;
        }

        for (const { category, ...product } of products) {
            const slug = `${shop.slug}-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
            if (await prisma.product.findUnique({ where: { slug } })) continue;
            const categoryId = categories.find((c) => c.slug === category)?.id;
            await prisma.product.create({
                data: {
                    ...product,
                    slug,
                    image: '/logo.png',
                    images: [],
                    tags: [],
                    vendorId: vendor.id,
                    ...(categoryId ? { categories: { create: [{ categoryId }] } } : {}),
                },
            });
            newProducts++;
        }
    }

    console.log(`Done. Added ${newVendors} vendors and ${newProducts} products; anything already there was left alone.`);
};

main()
    .catch((err) => {
        console.error(err.message ?? err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
