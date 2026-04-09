import mongoose from "mongoose";
import { hashing } from "../utils/HashUtils.js";

const otpSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
  },
  tokenKey: {
    type: String,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
},
  { versionKey: false }
);

otpSchema.index({ expiresAt: -1 }, { expireAfterSeconds: 0 });
otpSchema.index({ tokenKey: 1, expiresAt: 1 });

const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$/.test(value);

otpSchema.pre("save", async function (next) {
  if (this.isModified("otp") && !isBcryptHash(this.otp)) {
    this.otp = await hashing(this.otp);
  }
  if (this.isModified("token") && !isBcryptHash(this.token)) {
    this.token = await hashing(this.token);
  }
  next();
});

const OTP = mongoose.model("OTP", otpSchema);
export default OTP
