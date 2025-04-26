import { upload } from "../config/multer.js";
import Gig from "../models/Gig.js";
import { uploadMultipleImage } from "./DriveController.js";
import dotenv from "dotenv";

dotenv.config();

const createGig = [
  upload.array('images', 3),
  async (req, res) => {
    const { name, type, description, creator, workFlow, packages } = req.body;
    const gigImages = req.files;

    if (!gigImages || gigImages.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    try {
      const gigData = {
        name,
        type,
        description,
        creator,
        workFlow,
        packages,
        images: ["temp"],
      };
      const newGig = await Gig.create(gigData);
      const links = await uploadMultipleImage(gigImages, newGig._id, process.env.DRIVE_GIGIMAGE_ID);
      const imagedGig = await Gig.findOneAndUpdate(
        newGig._id,
        { $set: { images: links } },
        { new: true }
      );
      if (!imagedGig) return res.status(400).json({ error: "Gig id tidak ditemukan" });
      return res.status(201).json({ message: "Gig berhasil dibuat", gig: imagedGig });
    } catch (err) {
      console.error("🔥 Error membuat gig:", err);
      return res.status(500).json({ error: "Gagal membuat gig" });
    }
  }
];

const getGig = async (req, res) => {
  const { name, category, minPrice, maxPrice, rating } = req.body;

  const finalFilter = { accepted: true, };
  if (name !== undefined && name !== null && name !== "") {
    filter.name = { $regex: name, $options: "i" }; // case-insensitive search
  }
  if (category && category.length > 0) {
    filter.category = { $in: category };
  }
  if (minPrice !== undefined && maxPrice !== undefined) {
    filter["packages.price"] = { $gte: minPrice, $lte: maxPrice };
  }
  if (rating !== undefined && rating !== null) {
    filter.rating = { $gte: rating };
  }
  try {
    const gigList = await Gig.find(filter);
    return res.status(200).json({ filteredGigs: gigList });
  }
  catch (err) {
    console.error("🔥 Error saat mencari gig:", error);
    res.status(500).json({ error: "Gagal mencari gig." });
  }
}

export { createGig, getGig }