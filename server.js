import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/Auth.js";
import gigRoute from "./routes/Gig.js";
import userRoute from "./routes/User.js";
import chatRoute from "./routes/Chat.js";
import contractRoute from "./routes/Contract.js"
import orderRoute from "./routes/Order.js"
import cors from "cors";
import fs from "fs";
import http from "http";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import {
  oauth2Client,
  drive,
  connectMongo,
  connectDrive,
  saveTokens,
  deleteTokens,
  handleInvalidGrant,
} from "./config/db.js";
import { handleSocketChat } from "./controllers/ChatController.js";
import { handleSocketNotification } from "./controllers/NotificationController.js";
import { useAzureSocketIO } from "@azure/web-pubsub-socket.io";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://b-connect-nu.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  // origin: '*',
  credentials: true
};
// const corsOptions = {
//   origin: true,
//   credentials: true
// };

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e8
});

// useAzureSocketIO(io, {
//     hub: "Hub",
//     connectionString: process.env.SOCKET_CONSTR
// });

// Routes
app.use("/api/auth", authRoute);
app.use("/api/gig", gigRoute);
app.use("/api/user", userRoute);
app.use("/api/chat", chatRoute);
app.use("/api/contract", contractRoute);
app.use("/api/order", orderRoute);

// Default Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    saveTokens(tokens);
    res.send('✅ Authentication successful');
  } catch (err) {
    console.error('❌ Callback error:', err);
    res.status(500).send('Auth failed');
  }
});

(async () => {
  try {
    await connectMongo();
    await connectDrive();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error starting server:", err);
  }
})();

const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("enter", socket.id);
  socket.on("login", (userId) => {
    userSocketMap[userId] = socket.id;
    console.log("map", userSocketMap);
  })
  handleSocketChat(socket, io);
  handleSocketNotification(socket, io, userSocketMap);
  console.log(userSocketMap);
  socket.on("disconnect", () => {
    console.log("leave", socket.id);
    for (let userId in userSocketMap) {
      if (userSocketMap[userId] === socket.id) {
        console.log(`User with ID: ${userId} disconnected`);
        delete userSocketMap[userId];
        break;
      }
    }
  });
})
