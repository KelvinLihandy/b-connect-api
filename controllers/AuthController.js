import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { verifyHash, hashing } from "../utils/HashUtils.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config()

const register = async (req, res) => {
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

    return res.status(201).json({ message: "Registrasi berhasil!" });
  } catch (err) {
    console.error("🔥 Error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

const login = async (req, res) => {
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

    const loggedUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      rating: user.rating,
      completes: user.completes
    }

    // Buat token JWT
    const token = jwt.sign(loggedUser, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 24 * 60 * 60 * 1000 });
    console.log(token); //remove
    return res.status(200).json({ message: "Login berhasil!", token });
  } catch (err) {
    console.error("🔥 Error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

const sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    const allOTPs = await OTP.find({});
    if (!user) {
      return res.status(400).json({ error: "Akun tidak ditemukan." });
    }
    for (const record of allOTPs) {
      const existOTP = await verifyHash(email, record.token);
      if (existOTP) {
        return res.status(400).json({ error: "OTP akun ini belum expired" })
      }
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
    return res.status(200).json({ message: "Email sukses dikirim", redirectUrl: `/sign-in/verify-otp?token=${otp.token}` });
  } catch (err) {
    console.error("🔥 Error pengiriman OTP:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

const verifyOtp = async (req, res) => {
  const { token, otp } = req.body;

  try {
    let otpUser = null;
    const allOTPs = await OTP.find({});
    for (const record of allOTPs) {
      const existToken = token === record.token;
      const existOTP = await verifyHash(otp.toString(), record.otp);
      if (existToken && existOTP) {
        otpUser = record;
        break;
      }
    }
    if (!otpUser) {
      return res.status(400).json({ error: "OTP tidak ditemukan." });
    }
    if (otpUser.expiresAt < new Date()) {
      return res.status(400).json({ error: "Batas waktu OTP sudah lewat." });
    }
    await OTP.deleteOne({ _id: otpUser._id });
    const otpJWT = jwt.sign({ token: otpUser.token }, process.env.JWT_SECRET, { expiresIn: "10m" });
    return res.status(200).json({ message: "OTP berhasil diverifikasi.", otp: otpJWT });
  } catch (err) {
    console.error("🔥 Error verifikasi OTP:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
}

const resendOTP = async (req, res) => {
  const { token, email } = req.body;

  try {
    const allOTPs = await OTP.find({});
    for (const record of allOTPs) {
      const existOTP = token === record.token;
      if (existOTP) {
        return res.status(400).json({ error: "OTP akun ini belum expired" })
      }
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
    return res.status(200).json({ message: "Email sukses dikirim kembali", time: 5 });
  } catch (err) {
    console.error("🔥 Error pengiriman OTP kembali:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
};

const changePassword = async (req, res) => {
  const { email, password, passwordConf } = req.body;
  
  const validToken = req.token;
  console.log(validToken);
  const user = await User.findOne({ email });
  const validEmail = await verifyHash(email, validToken);
  try {
    if (!validEmail) return res.status(400).json({ error: "Email tidak sama dengan request." });
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan!" });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      return res.status(400).json({ error: "Password lama tidak valid." });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(passwordConf)) {
      return res.status(400).json({ error: "Password baru tidak valid." });
    }
    if (password !== passwordConf) return res.status(400).json({ error: "Password dan konfimasi berbeda." });

    await User.findOneAndUpdate(
      { email },
      { $set: { password: await hashing(passwordConf) } },
      { new: true }
    );
    return res.status(200).json({ message: "Password berhasil diubah." })
  } catch (err) {
    console.error("🔥 Error mengganti password:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
}

export { login, register, changePassword, sendOTP, resendOTP, verifyOtp };