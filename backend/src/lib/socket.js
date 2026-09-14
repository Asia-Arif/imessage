import express from "express";
import http from "http";
import { Server } from "socket.io";
import { getAllowedOrigins } from "./cors.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: getAllowedOrigins() } });

function getReceiverSocketId(userId) {
    return userSocketMap[String(userId)];
}

// online users map = { userId: socketId }
const userSocketMap = {};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) userSocketMap[String(userId)] = socket.id;

    // io.emit() sends event to everyone - broadcast
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // socket.on is used to listen for events
    socket.on("disconnect", () => {
        if (userId) delete userSocketMap[String(userId)];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { app, server, io, getReceiverSocketId };