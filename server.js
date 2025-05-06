import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/Auth.js";
import gigRoute from "./routes/Gig.js";
import userRoute from "./routes/User.js";
import chatRoute from "./routes/Chat.js";
import cors from "cors";
import fs from "fs";
import http from "http";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { connectMongo, connectDrive, oauth2Client } from "./config/db.js";
import { createRoom, getAllMessages, getFileData, getRooms, handleSocket, saveFileMessage, saveTextMessage } from "./controllers/ChatController.js";
import { getUserInRooms } from "./controllers/UserController.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e8
});

// Routes
app.use("/api/auth", authRoute);
app.use("/api/gig", gigRoute);
app.use("/api/user", userRoute);
app.use("/api/chat", chatRoute);

// Default Route
app.get("/", (req, res) => {
  res.send("API is running...");
});


const storeTokens = (tokens) => {
  fs.writeFileSync('tokens.json', JSON.stringify(tokens));
};

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('Google Drive authenticated successfully!');
    storeTokens(tokens);
    res.send('Authentication successful! You can now use the app.');
  } catch (err) {
    console.error('Error during authentication:', err);
    res.status(500).send('Authentication failed');
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

io.on("connection", (socket) => {
  handleSocket(socket, io);
})