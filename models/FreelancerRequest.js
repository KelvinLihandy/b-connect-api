import mongoose from "mongoose";
import { hashing } from "../utils/HashUtils.js";
import { type } from "os";

export const freelancerRequestSchema = new mongoose.Schema({
  status: {
    type: Number,
    default: 0//not responded
  },
  userId: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  categories: {
    type: [String],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  studentIdPhoto: {
    type: String,
    default: ""
  },
  requestDate: {
    type: Date,
    default: Date.now,
    immutable: true
  },
},
  { versionKey: false }
);

freelancerRequestSchema.pre("save", async function (next) {
  next();
});

const FreelancerRequest = mongoose.model("freelancerRequest", freelancerRequestSchema);
export default FreelancerRequest;