import express from "express";
import { getTrendingUsers, getUser, updateUserProfile, updatePaymentNumber, changePassword, uploadProfilePicture } from "../controllers/UserController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
router.post("/upload-profile-picture", uploadProfilePicture);
router.post("/get-trending-users", getTrendingUsers);
router.post("/get-user/:userId", getUser);
router.patch("/update-user-profile", authMiddleware, updateUserProfile);
router.patch("/update-payment-number", authMiddleware, updatePaymentNumber);
router.patch("/change-password-profile", authMiddleware, changePassword);

export default router;