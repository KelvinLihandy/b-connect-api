import express from "express";
import { 
  getTrendingUsers, 
  getUser, 
  updateUserProfile, 
  updatePaymentNumber, 
  changePassword, 
  uploadProfilePicture, 
  getFreelancerData,
  // New imports for user profile endpoints
  getUserStats,
  getUserPurchaseHistory,
  getUserReviews
} from "../controllers/UserController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();

// EXISTING ROUTES - UNCHANGED
router.post("/upload-profile-picture", uploadProfilePicture);
router.post("/get-trending-users", getTrendingUsers);
router.post("/get-user/:userId", getUser);
router.patch("/update-user-profile", authMiddleware, updateUserProfile);
router.patch("/update-payment-number", authMiddleware, updatePaymentNumber);
router.patch("/change-password-profile", authMiddleware, changePassword);
router.post("/get-freelancer-data/:id", getFreelancerData);

// NEW ROUTES FOR USER PROFILE FEATURES
router.get("/:userId/stats", authMiddleware, getUserStats);
router.get("/:userId/purchase-history", authMiddleware, getUserPurchaseHistory);
router.get("/:userId/reviews", authMiddleware, getUserReviews);

export default router;