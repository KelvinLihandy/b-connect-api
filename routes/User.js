import express from "express";
import { uploadProfilePicture, getTrendingUsers, getUser } from "../controllers/UserController.js";

const router = express.Router();
router.post("/upload-profile-picture", uploadProfilePicture);
router.post("/get-trending-users", getTrendingUsers);
router.post("/get-user/:userId", getUser);
export default router;