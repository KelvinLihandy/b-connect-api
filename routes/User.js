import express from "express";
import { uploadProfilePicture } from "../controllers/DriveController.js";
import { getTrendingUsers } from "../controllers/UserController.js";

const router = express.Router();
router.post("/uploadProfilePicture", uploadProfilePicture);
router.get("/trendingUsers", getTrendingUsers);

export default router;