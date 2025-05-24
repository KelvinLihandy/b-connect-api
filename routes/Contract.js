import express from "express";
import authMiddleware from "../middleware/AuthMiddleware.js";
import { createContract, createTransaction, transactionNotification } from "../controllers/ContractController.js";

const router = express.Router();
router.post("/create-transaction", authMiddleware, createTransaction);
router.post("/catch-notif", transactionNotification)

export default router;