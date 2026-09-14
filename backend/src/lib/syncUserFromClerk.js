import { clerkClient } from "@clerk/express";
import User from "../models/user.model.js";

async function getBackendClerkClient() {
    return typeof clerkClient === "function" ? await clerkClient() : clerkClient;
}

function displayNameFromClerkUser(clerkUser, email) {
    return (
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        email?.split("@")[0] ||
        "User"
    );
}

function emailFromClerkUser(clerkUser) {
    return (
        clerkUser.emailAddresses?.find((address) => address.id === clerkUser.primaryEmailAddressId)
            ?.emailAddress ?? clerkUser.emailAddresses?.[0]?.emailAddress
    );
}

export async function findOrCreateUserFromClerk(clerkUserId) {
    const existingUser = await User.findOne({ clerkId: clerkUserId });
    if (existingUser) return existingUser;

    const client = await getBackendClerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    const email = emailFromClerkUser(clerkUser);

    if (!email) {
        throw new Error("Clerk user does not have an email address");
    }

    return User.findOneAndUpdate(
        { clerkId: clerkUserId },
        {
            clerkId: clerkUserId,
            email,
            fullName: displayNameFromClerkUser(clerkUser, email),
            profilePic: clerkUser.imageUrl || "",
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        },
    );
}
