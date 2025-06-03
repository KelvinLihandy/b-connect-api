import express from "express";
import { createGig, getGig, getGigDetails, getGigCount, getGigCreator } from "../controllers/GigController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
router.post("/get-gig", getGig);
router.post("/get-gig-count", getGigCount);
router.post("/get-gig/:gigId", getGigDetails);
router.post("/create-gig", authMiddleware, createGig);
router.get("/get-gig-creator/:gigId", getGigCreator);
export default router;