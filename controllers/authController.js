const User = require("../models/User");
const { hashPassword, verifyPassword } = require("../utils/PasswordUtils");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validasi input
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Semua field harus diisi!" });
    }

    // Validasi panjang password
    if (password.length < 8) {
      return res.status(400).json({ error: "Password minimal 8 karakter!" });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email sudah digunakan!" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Simpan user baru
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Registrasi berhasil!" });
  } catch (err) {
    console.error("🔥 Error:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password harus diisi!" });
    }

    // Cek user di database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan!" });
    }

    // Verifikasi password
    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Password salah!" });
    }

    // Buat token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "strict" });
    res.status(200).json({ message: "Login berhasil!", token });
  } catch (err) {
    console.error("🔥 Error:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};
  