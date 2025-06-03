import express from "express";
import authMiddleware from "../middleware/AuthMiddleware.js";
import {
  createContract,
  //  createTransaction, 
  //  transactionNotification 
} from "../controllers/ContractController.js";

const router = express.Router();
// router.post("/create-transaction", authMiddleware, createTransaction);//unused
// router.post("/catch-notif", transactionNotification);//unused
router.post("/create-contract", authMiddleware, createContract);

export default router;