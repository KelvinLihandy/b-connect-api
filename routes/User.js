import express from "express";
import { getTrendingUsers, getUser, updateUserProfile, updatePaymentNumber, changePassword } from "../controllers/UserController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
<<<<<<< HEAD
router.post("/upload-profile-picture", uploadProfilePicture);
router.post("/get-trending-users", getTrendingUsers);
router.post("/get-user/:userId", getUser);
=======
router.post("/get-trending-users", getTrendingUsers);
router.post("/get-user/:userId", getUser);
router.patch("/update-user-profile", authMiddleware, updateUserProfile);
router.patch("/update-payment-number", authMiddleware, updatePaymentNumber);
router.patch("/change-password-profile", authMiddleware, changePassword);

>>>>>>> 121ea61fcfbd345c62c6ef9d8c9ef427663da4ab
export default router;