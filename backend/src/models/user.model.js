import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
        },

        fullName: {
            type: String,
            required: true,
        },

        profilePic: {
            type: String,
            default: "",
        },

        freeChatsUsed: {
            type: Number,
            default: 0,
        },

        subscriptionStatus: {
            type: String,
            enum: ["trial", "active", "inactive"],
            default: "trial",
        },

        stripeSubscriptionId: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;