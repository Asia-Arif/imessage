import Stripe from "stripe";
import User from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(req, res) {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (user.subscriptionStatus === "active") {
            return res.status(400).json({
                message: "Subscription is already active",
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",

            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],

            success_url: `${process.env.FRONTEND_URL}/?payment=success`,
            cancel_url: `${process.env.FRONTEND_URL}/?payment=cancelled`,

            customer_email: user.email,

            metadata: {
                userId: user._id.toString(),
            },
        });

        res.status(200).json({
            url: session.url,
        });
    } catch (error) {
        console.error("Error creating checkout session:", error.message);

        res.status(500).json({
            message: "Failed to create checkout session",
        });
    }
}