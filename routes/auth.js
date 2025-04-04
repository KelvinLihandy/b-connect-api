const express = require("express");
const AuthController = require("../controllers/AuthController");
const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/send-otp", AuthController.sendOTP);
router.post("/resend-otp", AuthController.resendOTP);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/change-password", AuthController.changePassword);
module.exports = router;
