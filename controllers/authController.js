const User = require("../models/User");
const OTP = require("../models/OTP");
const { verifyHash, hashing } = require("../utils/HashUtils");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

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

    // Simpan user baru
    const newUser = new User({ name, email, password });
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
    const isMatch = await verifyHash(password, user.password);
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

exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Akun tidak ditemukan." });
    }

    const otpNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const otp = new OTP({ token: email, otp: otpNumber, expiresAt });
    await otp.save();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.APP_USER,
        pass: process.env.APP_PASS,
      },
    });
    const mailOptions = {
      from: process.env.APP_USER,
      to: email,
      subject: "OTP Reset Kata Sandi B-Connect Anda",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2 style="color: #004B90;">Permintaan Reset Kata Sandi B-Connect</h2>
          <p>Gunakan OTP berikut untuk mereset kata sandi Anda:</p>
          <h1 style="color: #0073E6;">${otpNumber}</h1>
          <p>OTP ini berlaku selama 5 menit. Jangan berikan kepada siapa pun.</p>
          <hr style="margin: 20px 0;">
          <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sukses dikirim", redirectUrl: `/sign-in/verify-otp?token=${otp.token}` });
  } catch (err) {
    console.error("🔥 Error pengiriman OTP:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

exports.resendOTP = async (req, res) => {
  const { token, email } = req.body;

  try {
    const user = await OTP.findOne({
      token: { $regex: new RegExp(token, "i") },
    });
    if (!user) {
      return res.status(400).json({ error: "Akun tidak ditemukan." });
    }

    const otpNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const otp = new OTP({ token: token, otp: otpNumber, expiresAt });
    await otp.save();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.APP_USER,
        pass: process.env.APP_PASS,
      },
    });
    const mailOptions = {
      from: process.env.APP_USER,
      to: email,
      subject: "OTP Reset Kata Sandi B-Connect Anda",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2 style="color: #004B90;">Permintaan Reset Kata Sandi B-Connect</h2>
          <p>Gunakan OTP berikut untuk mereset kata sandi Anda:</p>
          <h1 style="color: #0073E6;">${otpNumber}</h1>
          <p>OTP ini berlaku selama 5 menit. Jangan berikan kepada siapa pun.</p>
          <hr style="margin: 20px 0;">
          <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sukses dikirim kembali", time: 5 });
  } catch (err) {
    console.error("🔥 Error pengiriman OTP kembali:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

exports.verifyOtp = async (req, res) => {
  const { token, otp } = req.body;

  try {
    const otpUser = await OTP.findOne({
      token: { $regex: new RegExp(token, "i") },
    });
    if (!otpUser) {
      return res.status(400).json({ error: "OTP tidak ditemukan." });
    }
    if (otpUser.expiresAt < new Date()) {
      return res.status(400).json({ error: "Batas waktu OTP sudah lewat." });
    }
    const isMatch = await verifyHash(otp.toString(), otpUser.otp);
    if (!isMatch) {
      return res.status(400).json({ error: "OTP salah." });
    }
    await OTP.deleteOne({ _id: otpUser._id });
    res.status(200).json({ message: "OTP berhasil diverifikasi." });
  } catch (err) {
    console.error("🔥 Error verifikasi OTP:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
}

exports.changePassword = async (req, res) => {
  const { email, password, passwordConf } = req.body;

  try {
    if (email == null) return res.status(400).json({ error: "Email tidak ada." });
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      return res.status(400).json({ error: "Password lama tidak valid." });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(passwordConf)) {
      return res.status(400).json({ error: "Password baru tidak valid." });
    }
    if (password !== passwordConf) return res.status(400).json({ error: "Password dan konfimasi berbeda." });

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { password: await hashing(passwordConf) } },
      { new: false }
    );

    if (!updatedUser) return res.status(400).json({ error: "User tidak ada" });
    res.status(200).json({ message: "Password berhasil diubah." })
  } catch (err) {
    console.error("🔥 Error mengganti password:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
}