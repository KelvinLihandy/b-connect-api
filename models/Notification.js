import mongoose from "mongoose";
import { cryptoDecrypt, cryptoEncrypt, hashing } from "../utils/HashUtils.js";

const notificationSchema = new mongoose.Schema({
  receiverId: {
    type: String,
    required: true
  },
  messageId: {
    type: String,
  },
  messageType: {
    type: String,
    enum: ["chat"],
    required: true
  },
  content: {
    type: String,
  },
  readAt: {
    type: Date,
    default: null
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  receivedTime: {
    type: Date,
    default: Date.now
  }
},
  { versionKey: false }
);

notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

notificationSchema.pre("save", async function (next) {
  if(this.content){
    const { encrypted, iv } = cryptoEncrypt(this.content);
    this.content = encrypted;
    this.iv = iv;
  }
  next();
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification
