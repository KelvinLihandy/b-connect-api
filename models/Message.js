import mongoose from "mongoose";
import { cryptoEncrypt } from "../utils/HashUtils.js";

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    default: "iv"
  },
  type: {
    type: String,
    enum: ["text", "file", "image"],
    required: true
  },
  time: {
    type: Date,
    default: Date.now,
    immutable: true
  }
},
  { versionKey: false }
);

messageSchema.pre("save", async function (next) {
  const { encrypted, iv } = cryptoEncrypt(this.content);
  this.content = encrypted;
  this.iv = iv;
  // console.log(encrypted, iv);
  next();
});

const Message = mongoose.model("Message", messageSchema);
export default Message