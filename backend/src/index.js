import express from "express";
import cors from "cors";

import "dotenv/config";

import fs from "fs";
import path from "path";

import { clerkMiddleware } from "@clerk/express";

import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";

import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";
import { getAllowedOrigins } from "./lib/cors.js";

import paymentRoutes from "./routes/payment.route.js";
import stripeWebhook from "./webhooks/stripe.webhook.js";

const PORT = process.env.PORT;

const publicDir = path.join(process.cwd(), "public");

// it's important that you don't parse the webhook event data, it should be in the raw format
app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhook);
app.use(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhook
);
app.use(express.json());
app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);

// if the public directory exists, serve the static files
// this is for the production build
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));

    app.get("/{*any}", (req, res, next) => {
        res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
    });
}

server.listen(PORT, () => {
    connectDB();
    console.log("Server is up and running on PORT:", PORT);

    if (process.env.NODE_ENV === "production") job.start();
});