import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const uploadDir = path.join(os.tmpdir(), "bconnect-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext && ext.length <= 10 ? ext : "";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith("image/")) return cb(null, true);
  if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
  return cb(new Error("Unsupported file type"));
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter,
});

export { upload }