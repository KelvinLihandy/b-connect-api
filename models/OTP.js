const mongoose = require("mongoose");
const { hashing } = require("../utils/HashUtils");
const otpSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
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

otpSchema.pre("save", async function (next) {
  this.otp = await hashing(this.otp);
  this.token = await hashing(this.token);
  next();
});

const OTP = mongoose.model("OTP", otpSchema);
module.exports = OTP;
