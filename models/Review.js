import mongoose from "mongoose";
import { cryptoEncrypt } from "../utils/HashUtils.js";

const reviewSchema = new mongoose.Schema({
  reviewerId: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true
  },
  reviewMessage: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    default: "iv"
  },
  gigId: {
    type: String,
    required: true
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
},
  { versionKey: false }
);

reviewSchema.pre("save", async function (next) {
  const { encrypted, iv } = cryptoEncrypt(this.reviewMessage);
  this.reviewMessage = encrypted;
  this.iv = iv;
  next();
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;