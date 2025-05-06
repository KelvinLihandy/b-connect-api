import express from "express";
import { saveFileMessage } from "../controllers/ChatController.js";

const router = express.Router();
router.post("/upload-file-message", saveFileMessage);

export default router;