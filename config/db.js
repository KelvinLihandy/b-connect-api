import mongoose from "mongoose";
import { google } from 'googleapis';
import fs from 'fs';

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client,
});

const getStoredTokens = () => {
  try {
    const tokens = fs.readFileSync('tokens.json');
    return JSON.parse(tokens);
  } catch (err) {
    return null;
  }
};

const connectDrive = async () => {
  try {
    const tokens = await getStoredTokens();
    if (tokens) {
      oauth2Client.setCredentials(tokens);
      console.log('✅ Google Drive authenticated');
    } else {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/drive'],
      });
      console.log('Visit this URL to authenticate:', authUrl);
    }
  } catch (err) {
    console.error('Authentication failed:', err);
  }
}

export { connectMongo, connectDrive, oauth2Client, drive }
