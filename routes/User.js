import express from "express";
import { getTrendingUsers, getUser, updateUserProfile, updatePaymentNumber, changePassword } from "../controllers/UserController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
router.get("/get-trending-users", getTrendingUsers);
router.get("/get-user/:userId", getUser);
router.patch("/update-user-profile", authMiddleware, updateUserProfile);
router.patch("/update-payment-number", authMiddleware, updatePaymentNumber);
router.patch("/change-password-profile", authMiddleware, changePassword);

export default router;