import mongoose from "mongoose";
import { userSchema } from "./User.js";
import { PackageSchema } from "./Gig.js";

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: "pending"
  },
  customer_name: {
    type: String,
    required: true
  },
  customer_picture: {
    type: String,
    required: true
  },
  customer_email: {
    type: String,
    required: true
  },
  customer_phone: {
    type: String,
    required: true
  },
  gigId: {
    type: String,
    required: true
  },
  package: {
    type: PackageSchema,
    required: true
  },
  snap_token: {
    type: String,
    required: true
  },
  snap_redirect: {
    type: String,
    required: true
  }
},
  { versionKey: false }
);

transactionSchema.pre("save", async function (next) {
  next();
});

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction