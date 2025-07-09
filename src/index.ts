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

const userSocketMap = new Map<string, string>();

const app = express();
const server = http.createServer(app); 


export const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});


io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

   socket.on("registerUser", (userId: string) => {
    if (userId) {
      userSocketMap.set(userId, socket.id);
      socket.join(`user_${userId}`);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    }
  });


  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});


app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());


app.use("/user", userRouter);
app.use("/roadmap", RoadmapRouter);


app.use(ErrorhandlerMiddleware);


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("Server is running on port:", PORT);
});
