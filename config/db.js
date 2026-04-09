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

const TOKEN_PATH = process.env.NODE_ENV == "dev" ? 'tokens.json' : '/home/site/tokens.json';

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client,
});

const saveTokens = (tokens) => {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('✅ Tokens saved');
  } catch (err) {
    console.error('❌ Error saving tokens:', err);
  }
};
const deleteTokens = () => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
      console.log('🧹 Tokens deleted');
    }
  } catch (err) {
    console.error('❌ Failed to delete tokens:', err);
  }
};

const getStoredTokens = () => {
  try {
    const tokens = fs.readFileSync(TOKEN_PATH);
    return JSON.parse(tokens);
  } catch {
    return null;
  }
};

const connectDrive = async () => {
  const tokens = getStoredTokens();
  if (tokens) {
    oauth2Client.setCredentials(tokens);
    console.log('✅ Google Drive authenticated with stored token');
  } else {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive'],
    });
    console.log('👉 Visit this URL to authenticate:', authUrl);
  }
};

const handleInvalidGrant = async () => {
  console.warn('⚠️ Invalid grant. Re-auth required.');
  deleteTokens();
  await connectDrive();
};

export {
  oauth2Client,
  drive,
  connectMongo,
  connectDrive,
  saveTokens,
  deleteTokens,
  handleInvalidGrant,
}
