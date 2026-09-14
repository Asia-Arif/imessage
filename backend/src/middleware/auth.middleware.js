import { getAuth } from "@clerk/express";
import { findOrCreateUserFromClerk } from "../lib/syncUserFromClerk.js";

export async function protectRoute(req, res, next) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const user = await findOrCreateUserFromClerk(userId);

        req.user = user;

        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}
