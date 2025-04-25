import mongoose from "mongoose";
import { hashing } from "../utils/HashUtils.js";

const userSchema = new mongoose.Schema({
  access: {
    type: Boolean,
    default: false
  },
  joinedDate: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  picture: {
    type: String,
    default: "temp"
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
    type: String,
    default: ""
  }
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

const User = mongoose.model("User", userSchema);
export default User
