import express from "express";
import { register, login, sendOTP, resendOTP, verifyOtp, changePassword } from "../controllers/AuthController.js";
import OTPMiddleware from "../middleware/OTPMiddleware.js";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/send-otp", sendOTP);
router.post("/resend-otp", resendOTP);
router.post("/verify-otp", verifyOtp);
router.post("/change-password", OTPMiddleware, changePassword);

export default router;
