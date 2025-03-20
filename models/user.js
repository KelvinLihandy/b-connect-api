const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { hashPassword } = require("../utils/PasswordUtils");

const userSchema = new mongoose.Schema(
    {
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

// Hash password sebelum disimpan
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")){
        return next()
    }
    this.password = await hashPassword(this.password);
    next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
