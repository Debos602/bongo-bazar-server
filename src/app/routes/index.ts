import express from 'express';
import { apiLimiter } from '../middlewares/rateLimiter';
import { userRoutes } from '../modules/user/user.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { PostRoutes } from '../modules/post/post.routes';
import { CouponRoutes } from '../modules/coupon/coupon.routes';
import { OrderRoutes } from '../modules/order/order.routes';
import { AddressRoutes } from '../modules/address/address.routes';
import { WishlistRoutes } from '../modules/wishlist/wishlist.routes';
import { CartRoutes } from '../modules/cart/cart.routes';
import { ReviewRoutes } from '../modules/review/review.routes';
import { VendorRoutes } from '../modules/vendor/vendor.routes';
import { categoryRoutes } from '../modules/category/category.routes';
import productRoutes from '../modules/product/product.routes';


const router = express.Router();



router.use(apiLimiter); // Apply to all routes

const moduleRoutes = [
    {
        path: '/user',
        route: userRoutes
    },

    {
        path: '/auth',
        route: AuthRoutes
    },
    {
        path: '/post',
        route: PostRoutes
    },
    {
        path: '/coupon',
        route: CouponRoutes
    },
    {
        path: '/category',
        route: categoryRoutes
    },
    {
        path: '/product',
        route: productRoutes
    },
    {
        path: '/order',
        route: OrderRoutes
    },
    {
        path: '/address',
        route: AddressRoutes
    },
    {
        path: '/wishlist',
        route: WishlistRoutes
    },
    {
        path: '/cart',
        route: CartRoutes
    },
    {
        path: '/review',
        route: ReviewRoutes
    },
    {
        path: '/vendor',
        route: VendorRoutes
    }
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;