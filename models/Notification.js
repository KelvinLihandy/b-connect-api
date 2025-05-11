import mongoose from "mongoose";
import { cryptoDecrypt, cryptoEncrypt, hashing } from "../utils/HashUtils.js";

const notificationSchema = new mongoose.Schema({
  receiverId: {
    type: String,
    required: true
  },
  messageId: { //untuk chat
    type: String,
  },
  messageType: {
    type: String,
    enum: ["chat", "contract", "promo"],
    required: true
  },
  content: { //bukan chat
    type: String,
  },
  receivedTime: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  readAt: {
    type: Date,
    default: null
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
},
  { versionKey: false }
);

notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

notificationSchema.pre("save", async function (next) {
  const { encrypted, iv } = cryptoEncrypt(this.content);
  this.content = encrypted;
  this.iv = iv;
  next();
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification
