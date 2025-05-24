import express from "express";
import { createGig, getGig, getGigDetails, getGigCount, disabledGigIds } from "../controllers/GigController.js";
import authMiddleware from "../middleware/AuthMiddleware.js";

const router = express.Router();
router.post("/get-gig", getGig);
router.post("/get-gig-count", getGigCount);
router.post("/get-gig/:gigId", getGigDetails);
router.post("/create-gig", createGig);
router.post("/get-disabled-gig-ids", authMiddleware, disabledGigIds);

export default router;