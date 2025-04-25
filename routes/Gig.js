import express from "express";
import { createGig, searchGigName } from "../controllers/GigController.js";

const router = express.Router();
router.post("/createGig", createGig);
router.post("/searchGigName", searchGigName);

export default router;