import express from "express";
import { createGig, getGig, getGigDetails } from "../controllers/GigController.js";

const router = express.Router();
router.post("/get-gig", getGig);
router.post("/get-gig/:gigId", getGigDetails);
router.post("/create-gig", createGig);

export default router;