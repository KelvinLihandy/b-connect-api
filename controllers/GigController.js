import mongoose from "mongoose";
import { upload } from "../config/multer.js";
import Gig from "../models/Gig.js";
import { uploadMultiple } from "../utils/DriveUtil.js";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const handleSocketGig = (socket, io) => {
  socket.on("update_favorited", (gig, user) => {
    updateFavorited(socket, gig, user);
  })
}

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
      const imageIds = await uploadMultiple(gigImages, newGig.id, process.env.DRIVE_GIGIMAGE_ID);
      const imagedGig = await Gig.findOneAndUpdate(
        { _id: newGig._id },
        { $set: { images: imageIds } },
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
    finalFilter.name = { $regex: name, $options: "i" };
  }
  if (category && category.length > 0) {
    finalFilter.category = { $in: category };
  }
  if (minPrice !== undefined && maxPrice !== undefined) {
    finalFilter["packages.price"] = { $gte: minPrice, $lte: maxPrice };
  }
  if (rating !== undefined && rating !== null) {
    finalFilter.rating = { $gte: rating };
  }
  try {
    const gigList = await Gig.find(finalFilter);
    console.log(finalFilter);
    return res.status(200).json({ filteredGigs: gigList });
  }
  catch (err) {
    console.error("🔥 Error saat mencari gig:", err);
    return res.status(500).json({ error: "Gagal mencari gig." });
  }
};

const getGigDetails = async (req, res) => {
  const { gigId } = req.params;

  try {
    console.log(gigId)
    const gig = await Gig.findOne({ _id: gigId });
    if (!gig) return res.status(400).json({ error: `Tidak ada gig dengan id ${gigId}` });
    return res.status(200).json({ detail: gig })
  } catch (err) {
    console.error("🔥 Error saat mencari detail gig:", err);
    return res.status(500).json({ error: "Gagal mencari detail gig." });
  }
}

//this is fucker
// const updateFavorited = async (req, res) => {
//   const { gigId } = req.params;
//   const user = req.user;

//   try {
//     console.log("gig id", gigId)
//     const gig = await Gig.findOne({ _id: gigId });
//     if (!gig) {
//       console.log("gig", gig);
//       return res.status(404).json({ error: "Gig not found." });
//     }
//     const userId = user.id;
//     const isFavorited = gig.favoritedBy.includes(userId);
//     let updatedGig;
//     if (isFavorited) {
//       updatedGig = await Gig.findByIdAndUpdate(
//         gigId,
//         { $pull: { favoritedBy: userId } },
//         { new: true }
//       );
//     } else {
//       updatedGig = await Gig.findByIdAndUpdate(
//         gigId,
//         { $addToSet: { favoritedBy: userId } },
//         { new: true }
//       );
//     }

//     return res.status(200).json({
//       message: isFavorited ? "Update hapus favorite." : "Update tambah favorite.",
//       updatedGig: gigId
//     });
//   } catch (err) {
//     console.error("🔥 Error saat update favorite:", err);
//     return res.status(500).json({ error: "Gagal update favorite." });
//   }
// }
const updateFavorited = async (socket, gigId, userId) => {
  try {
    const user = await User.findById(userId);
    if (!userRecord) throw new Error("User tidak ditemukan");
    const gig = await Gig.findOne({ _id: gigId });
    if (!gig) throw new Error("Gig tidak ditemukan");
    const isFavorited = gig.favoritedBy.includes(user);
    let updatedGig;
    if (isFavorited) {
      updatedGig = await Gig.findByIdAndUpdate(
        gigId,
        { $pull: { favoritedBy: userId } },
        { new: true }
      );
    } else {
      updatedGig = await Gig.findByIdAndUpdate(
        gigId,
        { $addToSet: { favoritedBy: userId } },
        { new: true }
      );
    }
    socket.emit("favorite_updated", gigId);
  } catch (err) {
    throw new Error("gagal update favorit", err);
  }
}

export { createGig, getGig, getGigDetails, updateFavorited, handleSocketGig }