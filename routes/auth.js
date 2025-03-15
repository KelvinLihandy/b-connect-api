const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Sesuaikan dengan model yang Anda gunakan
const { hashPassword, verifyPassword } = require("../utils/passwordUtils");

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validasi input
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Semua field harus diisi!" });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email sudah digunakan!" });
    }

    // Hash password dan simpan user
    const hashedPassword = await hashPassword(password);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Registrasi berhasil!" });
  } catch (error) {
    console.error("🔥 Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

// Login User
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password harus diisi!" });
    }

    // Cek apakah user ada
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email tidak ditemukan!" });
    }

    // Verifikasi password
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Password salah!" });
    }

    // Buat token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Kirim token sebagai cookie
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.status(200).json({ message: "Login berhasil!", token });
  } catch (error) {
    console.error("🔥 Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan server" });
  }
});

module.exports = router;
