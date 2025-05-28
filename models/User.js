import mongoose from "mongoose";
import { hashing } from "../utils/HashUtils.js";

export const userSchema = new mongoose.Schema({
  access: {
    type: Boolean,
    default: false
  },
  joinedDate: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  location: {
    type: String,
    default: ""
  },
  picture: {
    type: String,
    default: "temp"
  },
  description: {
    type: String,
    default: ""
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format email tidak valid"]
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  phoneNumber: {
    type: String,
    default: ""
  },
  paymentNumber: {
    type: String,
    default: ""
  },
  rating: {
    type: Number,
    default: 0
  },
  completes: {
    type: Number,
    default: 0
  },
  reviews: {
    type: Number,
    default: 0
  },
  type: {
    type: [String],
    default: [""]
  },
  portofolioUrl: {
    type: String,
    default: ""
  },
},
  { versionKey: false }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }
  if (this.isNew) {
    this.access = false;
  }
  this.password = await hashing(this.password);
  next();
});

export const User = mongoose.model("User", userSchema);
