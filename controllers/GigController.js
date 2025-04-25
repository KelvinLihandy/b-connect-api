import Gig from "../models/Gig.js";
import { uploadGigImages } from "./DriveController.js";
import multer from "multer";
// const createGig = async (req, res) => {
//   const { name, type, description, creator, workFlow, packages } = req.body;
//   const gigImage = req.files;

//   try {
//     const imageLinkList = await uploadGigImages(req);
//     const newGig = new Gig({
//       name,
//       type,
//       description,
//       creator,
//       workFlow,
//       packages,
//       images: imageLinkLhst,
//     });
//     await newGig.save();
//     return res.status(200).json({ newGig: newGig });
//   } catch (error) {
//     console.error("🔥 Error saat membuat jasa:", error);
//     res.status(500).json({ error: "Gagal membuat jasa." });
//   }
// }
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { oauth2Client } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const drive = google.drive({ version: 'v3', auth: oauth2Client });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const createGig = [
  upload.array('images', 3),
  async (req, res) => {
    const { name, type, description, creator, workFlow, packages } = req.body;
    const gigImages = req.files;

    if (!gigImages || gigImages.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    try {
      const links = await uploadGigImages(gigImages, name);

      const gigData = {
        name,
        type,
        description,
        creator,
        workFlow,
        packages,
        images: links,
      };

      await Gig.create(gigData);

      return res.status(201).json({ message: "Gig created successfully", gig: gigData });
    } catch (err) {
      console.error("🔥 Error uploading images:", err);
      return res.status(500).json({ error: "Failed to create gig" });
    }
  }
];

const searchGigName = async (req, res) => {
  const { searchQuery } = req.body;

  if (!searchQuery) {
    return res.status(400).json({ error: "Query tidak boleh kosong." });
  }
  try {
    const gigList = await Gig.find({
      name: { $regex: searchQuery, $options: "i" },
      accepted: true
    });
    return res.status(200).json({ addedGigs: gigList });
  } catch (error) {
    console.error("🔥 Error saat mencari jasa:", error);
    res.status(500).json({ error: "Gagal mencari jasa." });
  }
}

export { createGig, searchGigName }
