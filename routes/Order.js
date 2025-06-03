import express from "express";
import authMiddleware from "../middleware/AuthMiddleware.js";
import { getAllOrders, getOrderDetails, updateOrderProgress, submitReview, getCurrentOrder, getUnfinishedContracts } from "../controllers/OrderController.js";

const router = express.Router();

router.get("/orders", authMiddleware, getAllOrders);
router.get("/current/:gigId", authMiddleware, getCurrentOrder);
router.get("/unfinished-contracts", authMiddleware, getUnfinishedContracts);
router.get("/public/:orderId", (req, res, next) => {
  req.isPublicRoute = true;
  next();
}, getOrderDetails);

router.get("/:orderId", authMiddleware, getOrderDetails);

router.put("/:orderId/progress", authMiddleware, updateOrderProgress);

router.post("/:orderId/review", authMiddleware, submitReview);

export default router;
