import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/Auth.js";
import gigRoute from "./routes/Gig.js";
import userRoute from "./routes/User.js";
import chatRoute from "./routes/Chat.js";
import contractRoute from "./routes/Contract.js"
import orderRoute from "./routes/Order.js"
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Server } from "socket.io";
import {
  oauth2Client,
  connectMongo,
  connectDrive,
  saveTokens,
} from "./config/db.js";
import { handleSocketChat, setIoInstance } from "./controllers/ChatController.js";
import { handleSocketNotification } from "./controllers/NotificationController.js";
dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "prod" ||
  Boolean(process.env.WEBSITE_INSTANCE_ID);

const allowedOrigins = [
  'https://b-connect-nu.vercel.app',
];

const extraAllowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (extraAllowedOrigins.includes(origin)) return true;
  if (/^https:\/\/b-connect-nu(-[a-z0-9-]+)?\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
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
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  allowEIO3: true,
  maxHttpBufferSize: 1e8
});

io.engine.on("connection_error", (err) => {
  console.error("Socket.IO connection_error", {
    code: err.code,
    message: err.message,
    context: err.context,
  });
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
    if (process.env.MONGO_URI) {
      await connectMongo();
    } else if (isProduction) {
      throw new Error("MONGO_URI is not set");
    } else {
      console.warn("⚠️ MONGO_URI not set - starting server without Mongo connection");
    }

    if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.REDIRECT_URI) {
      await connectDrive();
    } else if (isProduction) {
      console.warn("⚠️ Google Drive env vars not set (CLIENT_ID/CLIENT_SECRET/REDIRECT_URI)");
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error starting server:", err);
  }
})();

const userSocketMap = {};
setIoInstance(io);

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
