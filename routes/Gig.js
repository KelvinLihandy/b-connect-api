import express from "express";
import { createGig, getGig, getGigDetails, updateFavorited } from "../controllers/GigController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
router.post("/get-gig", getGig);
router.get("/get-gig/:gigId", getGigDetails);
router.post("/create-gig", createGig);
router.post("/update-favorited/:gigId", authMiddleware ,updateFavorited);

export default router;