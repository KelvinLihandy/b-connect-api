const mongoose = require("mongoose");

const PackageSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  deliveryTime: {
    type: String,
    required: true
  },
  revision: {
    type: Number,
    default: 1
  },
  features: {
    type: [String],
    required: true
  }
},
  { _id: false },
  { versionKey: false }
);

const gigSchema = new mongoose.Schema({
  accepted: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  packages: [PackageSchema],
  creator: {
    type: String,
    required: true
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  workflow: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
},
  { versionKey: false }
);

otpSchema.pre("save", async function (next) {
  next();
});

const Gig = mongoose.model("Gig", gigSchema);
module.exports = Gig;