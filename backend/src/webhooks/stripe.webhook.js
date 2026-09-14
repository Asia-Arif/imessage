
import Stripe from "stripe";
import User from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function stripeWebhook(req, res) {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
        return res.status(400).json({
            message: "Stripe signature is missing",
        });
    }

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            const userId = session.metadata?.userId;
            const subscriptionId = session.subscription;

            if (userId) {
                await User.findByIdAndUpdate(userId, {
                    subscriptionStatus: "active",
                    stripeSubscriptionId: subscriptionId,
                });

                console.log("Stripe subscription activated for user:", userId);
            }
        }

        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object;

            await User.findOneAndUpdate(
                { stripeSubscriptionId: subscription.id },
                {
                    subscriptionStatus: "inactive",
                }
            );

            console.log(
                "Stripe subscription cancelled:",
                subscription.id
            );
        }

        return res.status(200).json({
            received: true,
        });
    } catch (error) {
        console.error("Stripe Webhook Error:", error.message);

        return res.status(400).json({
            message: "Stripe webhook verification failed",
        });
    }
}

