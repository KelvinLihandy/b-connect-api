const mongoose = require("mongoose");
const { hashing } = require("../utils/HashUtils");

const userSchema = new mongoose.Schema({
  access: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: [true, "Nama wajib diisi"],
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, "Email wajib diisi"],
    unique: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format email tidak valid"]
  },
  password: {
    type: String,
    required: [true, "Password wajib diisi"],
    minlength: [8, "Password minimal 8 karakter"]
  },
  rating: {
    type: Number,
    default: 0
  },
  completes: {
    type: Number,
    default: 0
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
module.exports = User;
