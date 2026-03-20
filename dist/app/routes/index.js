"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rateLimiter_1 = require("../middlewares/rateLimiter");
const user_routes_1 = require("../modules/user/user.routes");
const auth_routes_1 = require("../modules/auth/auth.routes");
const post_routes_1 = require("../modules/post/post.routes");
const coupon_routes_1 = require("../modules/coupon/coupon.routes");
const order_routes_1 = require("../modules/order/order.routes");
const address_routes_1 = require("../modules/address/address.routes");
const wishlist_routes_1 = require("../modules/wishlist/wishlist.routes");
const cart_routes_1 = require("../modules/cart/cart.routes");
const review_routes_1 = require("../modules/review/review.routes");
const vendor_routes_1 = require("../modules/vendor/vendor.routes");
const category_routes_1 = require("../modules/category/category.routes");
const product_routes_1 = __importDefault(require("../modules/product/product.routes"));
const router = express_1.default.Router();
router.use(rateLimiter_1.apiLimiter); // Apply to all routes
const moduleRoutes = [
    {
        path: '/user',
        route: user_routes_1.userRoutes
    },
    {
        path: '/auth',
        route: auth_routes_1.AuthRoutes
    },
    {
        path: '/post',
        route: post_routes_1.PostRoutes
    },
    {
        path: '/coupon',
        route: coupon_routes_1.CouponRoutes
    },
    {
        path: '/category',
        route: category_routes_1.categoryRoutes
    },
    {
        path: '/product',
        route: product_routes_1.default
    },
    {
        path: '/order',
        route: order_routes_1.OrderRoutes
    },
    {
        path: '/address',
        route: address_routes_1.AddressRoutes
    },
    {
        path: '/wishlist',
        route: wishlist_routes_1.WishlistRoutes
    },
    {
        path: '/cart',
        route: cart_routes_1.CartRoutes
    },
    {
        path: '/review',
        route: review_routes_1.ReviewRoutes
    },
    {
        path: '/vendor',
        route: vendor_routes_1.VendorRoutes
    }
];
moduleRoutes.forEach(route => router.use(route.path, route.route));
exports.default = router;
