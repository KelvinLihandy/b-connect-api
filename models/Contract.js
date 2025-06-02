import mongoose from "mongoose";
import { PackageSchema } from "./Gig.js";

const contractSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },
  gigId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  package: {
    type : PackageSchema,
    required: true
  },
  progress: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  progressTime: {
    type: Date,
    default: null
  },
  deliveredTime: {
    type: Date,
    default: null
  },
  finishedTime: {
    type: Date,
    default: null
  }
},
  { versionKey: false }
);

contractSchema.pre("save", async function (next) {
  next();
});

const Contract = mongoose.model("Contract", contractSchema);
export default Contract