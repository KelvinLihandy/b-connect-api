import express from "express";
import { createGig, getGig, getGigDetails, getGigCount } from "../controllers/GigController.js";

const router = express.Router();
router.post("/get-gig", getGig);
router.post("/get-gig-count", getGigCount);
router.post("/get-gig/:gigId", getGigDetails);
router.post("/create-gig", createGig);

export default router;