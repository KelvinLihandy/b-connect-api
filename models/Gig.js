import mongoose from "mongoose";

const PackageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Basic", "Standard"],
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
  deliveryDay: {
    type: Number,
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

const workflowSchema = new mongoose.Schema({
  flow: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
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
  category: {
    type: String,
    enum: ["Graphics Design", "UI/UX Design", "Video Editing", "Content Writing", "Translation", "Photography", "Web Development"],
    required: true
  },
  image: {
    type: [String],
    required: false,
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length >= 1 && val.length <= 5;
      },
      message: 'Gambar ada 1 - 5'
    }
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
    type: [workflowSchema],
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
  },//ini bisa pake cek panjang review yang id produk sama dan tipe review gig atau produkk lah intinya
  sold: {
    type: Number,
    default: 0
  },
  favoritedBy: {
    type: [String],
  }
},
  { versionKey: false }
);

gigSchema.pre("save", async function (next) {
  next();
});

const Gig = mongoose.model("Gig", gigSchema);
export default Gig