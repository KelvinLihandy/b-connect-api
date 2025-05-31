import express from "express";
import authMiddleware from "../middleware/AuthMiddleware.js";
import { getAllOrders, getOrderDetails, updateOrderProgress } from "../controllers/OrderController.js";

const router = express.Router();

// Get order details - public endpoint for testing (must be defined BEFORE the /:orderId route)
router.get("/orders", authMiddleware, getAllOrders);
router.get("/public/:orderId", (req, res, next) => {
  req.isPublicRoute = true;
  next();
}, getOrderDetails);

// Get order details - with authentication
router.get("/:orderId", authMiddleware, getOrderDetails);

// Update order progress - only the freelancer who created the gig can update
router.put("/:orderId/progress", authMiddleware, updateOrderProgress);

export default router;
