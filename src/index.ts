import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import ConnectDatabase from "./lib/connectDb";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import userRouter from "./route/user.route";
import RoadmapRouter from "./route/roadmap.route";
import { ErrorhandlerMiddleware } from "./util/Errorhandler.util";

dotenv.config();
ConnectDatabase();

const app = express();
const server = http.createServer(app); // <- This replaces app.listen()

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Example event
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Express middlewares
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/user", userRouter);
app.use("/roadmap", RoadmapRouter);

// Error handler
app.use(ErrorhandlerMiddleware);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("Server is running on port:", PORT);
});
