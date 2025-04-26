import express from "express";
import { uploadProfilePicture, getTrendingUsers } from "../controllers/UserController.js";

const router = express.Router();
router.post("/upload-profile-picture", uploadProfilePicture);
router.get("/get-trending-users", getTrendingUsers);

export default router;