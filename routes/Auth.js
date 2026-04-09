import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, getAuth, sendOTP, resendOTP, verifyOtp, changePassword, clearCookie } from "../controllers/AuthController.js";
import OTPMiddleware from "../middleware/OTPMiddleware.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/auth", authMiddleware, getAuth);
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/send-otp", otpLimiter, sendOTP);
router.post("/resend-otp", otpLimiter, resendOTP);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/change-password", otpLimiter, OTPMiddleware, changePassword);
router.post("/clear-cookie", clearCookie);

export default router;
