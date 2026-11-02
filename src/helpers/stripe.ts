import Stripe from "stripe";
import config from "../config";

export const stripe = new Stripe(config.stripeSecretKey || "sk_not_configured");