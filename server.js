import express from "express";
import dotenv from "dotenv";
import authRoute from "./routes/Auth.js";
import gigRoute from "./routes/Gig.js";
import userRoute from "./routes/User.js";
import cors from "cors";
import fs from "fs";
import { connectMongo, connectDrive, oauth2Client } from "./config/db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/gig", gigRoute);
app.use("/api/user", userRoute);

// Default Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const storeTokens = (tokens) => {
  fs.writeFileSync('tokens.json', JSON.stringify(tokens));
};

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;  // Extract the authorization code from the query string

  try {
    // Exchange the authorization code for tokens
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
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error starting server:", err);
  }
})();

