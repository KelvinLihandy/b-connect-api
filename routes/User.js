import express from "express";
import { 
  getTrendingUsers, 
  getUser, 
  updateUserProfile, 
  updatePaymentNumber, 
  changePassword, 
  uploadProfilePicture, 
  getFreelancerData,
  getUserStats,
  getUserPurchaseHistory,
  getUserReviews,
  createFreelancerRequest,
  checkRequestStatus
} from "../controllers/UserController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.post("/upload-profile-picture", uploadProfilePicture);
router.post("/get-trending-users", getTrendingUsers);
router.post("/get-user/:userId", getUser);
router.patch("/update-user-profile", authMiddleware, updateUserProfile);
router.patch("/update-payment-number", authMiddleware, updatePaymentNumber);
router.patch("/change-password-profile", authMiddleware, changePassword);
router.post("/get-freelancer-data/:id", getFreelancerData);
router.post("/user-stats/:userId", authMiddleware, getUserStats);
router.post("/purchase-history/:userId", authMiddleware, getUserPurchaseHistory);
router.post("/user-reviews/:userId", authMiddleware, getUserReviews);
router.post("/check-request-status", authMiddleware, checkRequestStatus);
router.post("/request-freelancer", authMiddleware, createFreelancerRequest);

export default router;