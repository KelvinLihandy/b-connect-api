import express from "express";
import { createGig, getGig } from "../controllers/GigController.js";

const router = express.Router();
router.post("/get-gig", getGig);
router.post("/create-gig", createGig);

export default router;