import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import {
    hasImageKitConfig,
    uploadChatMedia,
} from "../lib/imagekit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export async function getUsersForSidebar(req, res) {
    try {
        const loggedInUserId = req.user._id;

        const filteredUsers = await User.find({
            _id: { $ne: loggedInUserId },
        }).select("-clerkId");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error(
            "Error in getUsersForSidebar:",
            error.message
        );

        res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function getConversationsForSidebar(req, res) {
    try {
        const loggedInUserId = req.user._id;

        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        {
                            senderId: loggedInUserId,
                        },
                        {
                            receiverId: loggedInUserId,
                        },
                    ],
                },
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            {
                                $eq: [
                                    "$senderId",
                                    loggedInUserId,
                                ],
                            },
                            "$receiverId",
                            "$senderId",
                        ],
                    },
                    lastMessageAt: {
                        $max: "$createdAt",
                    },
                },
            },
            {
                $sort: {
                    lastMessageAt: -1,
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $first: "$user",
                    },
                },
            },
            {
                $project: {
                    clerkId: 0,
                },
            },
        ]);

        res.status(200).json(conversations);
    } catch (error) {
        console.error(
            "Error in getConversationsForSidebar:",
            error.message
        );

        res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function getMessages(req, res) {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                {
                    senderId: myId,
                    receiverId: userToChatId,
                },
                {
                    senderId: userToChatId,
                    receiverId: myId,
                },
            ],
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error(
            "Error in getMessages:",
            error.message
        );

        res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function sendMessage(req, res) {
    try {
        const { text } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        const user = await User.findById(senderId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        /*
         * SUBSCRIBED USER
         *
         * Active subscribers can chat with unlimited people.
         */
        if (user.subscriptionStatus !== "active") {
            /*
             * FREE CHAT LIMIT = 2 UNIQUE PEOPLE
             *
             * A conversation partner is anyone this user
             * has sent to OR received from.
             *
             * Partners are ordered by first message time.
             * The earliest 2 are unlocked (unlimited send).
             * Anyone else can still be seen, but sending
             * or replying requires a subscription.
             *
             * Incoming messages occupy a slot. They do
             * not grant a free reply to a 3rd person.
             */

            const conversationPartners =
                await Message.aggregate([
                    {
                        $match: {
                            $or: [
                                {
                                    senderId,
                                },
                                {
                                    receiverId:
                                        senderId,
                                },
                            ],
                        },
                    },
                    {
                        $project: {
                            createdAt: 1,
                            partnerId: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$senderId",
                                            senderId,
                                        ],
                                    },
                                    "$receiverId",
                                    "$senderId",
                                ],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$partnerId",
                            firstMessageAt: {
                                $min: "$createdAt",
                            },
                        },
                    },
                    {
                        $sort: {
                            firstMessageAt: 1,
                        },
                    },
                ]);

            const unlockedPartnerIds = new Set(
                conversationPartners
                    .slice(0, 2)
                    .map((partner) =>
                        String(partner._id)
                    )
            );

            const receiverIsUnlocked =
                unlockedPartnerIds.has(
                    String(receiverId)
                );

            if (
                unlockedPartnerIds.size >= 2 &&
                !receiverIsUnlocked
            ) {
                return res.status(402).json({
                    message:
                        "You have reached the free chat limit. Please subscribe to chat with more people.",
                    subscriptionRequired: true,
                });
            }
        }

        let imageUrl;
        let videoUrl;

        if (req.file) {
            if (!hasImageKitConfig()) {
                return res.status(500).json({
                    message:
                        "Media upload is not configured",
                });
            }

            const url =
                await uploadChatMedia(req.file);

            if (
                req.file.mimetype.startsWith(
                    "video/"
                )
            ) {
                videoUrl = url;
            } else {
                imageUrl = url;
            }
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            video: videoUrl,
        });

        await newMessage.save();

        const receiverSocketId =
            getReceiverSocketId(receiverId);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit(
                "newMessage",
                newMessage
            );
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.error(
            "Error in sendMessage:",
            error.message
        );

        res.status(500).json({
            message: "Internal server error",
        });
    }
}