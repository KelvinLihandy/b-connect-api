import express from "express";
import { register, login, getAuth, sendOTP, resendOTP, verifyOtp, changePassword, clearCookie } from "../controllers/AuthController.js";
import OTPMiddleware from "../middleware/OTPMiddleware.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
router.post("/auth", authMiddleware, getAuth);
router.post("/register", register);
router.post("/login", login);
router.post("/send-otp", sendOTP);
router.post("/resend-otp", resendOTP);
router.post("/verify-otp", verifyOtp);
router.post("/change-password", OTPMiddleware, changePassword);
router.post("/clear-cookie", clearCookie);

export default router;
