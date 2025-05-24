import mongoose from "mongoose";
import { upload } from "../config/multer.js";
import { Gig } from "../models/Gig.js";
import { uploadMultiple } from "../utils/DriveUtil.js";
import dotenv from "dotenv";
import Transaction from "../models/Transaction.js";
import Contract from "../models/Contract.js";
import { User } from "../models/User.js";

dotenv.config();

const createGig = [
  upload.array('images', 3),
  async (req, res) => {
    const { name, categories, description, creator, workflow, packages } = req.body;
    const gigImages = req.files;

    if (!gigImages || gigImages.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    try {
      const gigData = {
        name,
        categories,
        description,
        packages,
        creator,
        workflow,
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
  if (name !== undefined && name !== null && name !== "" && name.trim()) {
    finalFilter.name = { $regex: name.trim(), $options: "i" };
  }
  if (category !== undefined && category !== null && category !== "") {
    finalFilter.categories = { $in: [category] };
  }
  if (rating !== undefined && rating !== null && rating > 0) {
    finalFilter.rating = { $gte: rating };
  }
  try {
    console.log(minPrice, maxPrice);
    let gigList = await Gig.find(finalFilter);
    if (minPrice !== undefined && maxPrice !== undefined) {
      const numMinPrice = Number(minPrice);
      const numMaxPrice = Number(maxPrice);
      if (!isNaN(numMinPrice) && !isNaN(numMaxPrice)) {
        gigList = gigList.filter(gig => {
          return gig.packages.every(pkg => {
            const packagePrice = Number(pkg.price);
            return !isNaN(packagePrice) &&
              packagePrice >= numMinPrice &&
              packagePrice <= numMaxPrice;
          });
        });
      }
      else return res.status(400).json({ messsage: "filter harga tidak angka semua" });
    }
    return res.status(200).json({ filteredGigs: gigList });
  }
  catch (err) {
    console.error("🔥 Error saat mencari gig:", err);
    return res.status(500).json({ error: "Gagal mencari gig." });
  }
};

const getGigUser = async (req, res) => {
  const userId = userId; // Assuming user ID is available from authentication middleware

  try {
    // Find all gigs created by this user, regardless of acceptance status
    const userGigs = await Gig.find({ creator: userId });

    if (!userGigs || userGigs.length === 0) {
      return res.status(200).json({
        message: "Anda belum memiliki gig",
        gigs: []
      });
    }

    return res.status(200).json({
      message: "Berhasil mendapatkan gig user",
      gigs: userGigs
    });
  } catch (err) {
    console.error("🔥 Error saat mengambil gig user:", err);
    return res.status(500).json({ error: "Gagal mengambil gig user" });
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

const getGigCount = async (req, res) => {
  const { categories } = req.body;

  try {
    const result = await Gig.aggregate([
      { $unwind: "$categories" },
      { $match: { categories: { $in: categories } } },
      {
        $group: {
          _id: "$categories",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1
        }
      }
    ]);
    const countsMap = {};
    result.forEach(item => countsMap[item.category] = item.count);
    const finalCounts = categories.map(cat => ({
      category: cat,
      count: countsMap[cat] || 0
    }));

    return res.status(200).json(finalCounts);
  } catch (err) {
    console.error("🔥 Error saat menghitung top gig:", err);
    return res.status(500).json({ error: "Gagal menghitung top gig." });
  }
};

const disabledGigIds = async (req, res) => {
  const userEmail = req.user.email;
  const userId = req.user.id;

  try {
    const transactions = await Transaction.find({
      customer_email: userEmail,
      status: "pending"
    });
    const contracts = await Contract.find({
      userId: userId,
      progress: { $lt: 3 } //update kalau budi mau lebih banyak progress contract
    });
    const result = {};
    transactions.forEach(tx => {
      result[tx.gigId] = result[tx.gigId] || [];
      result[tx.gigId].push("transaction-pending");
    });
    contracts.forEach(contract => {
      result[contract.gigId] = result[contract.gigId] || [];
      result[contract.gigId].push("contract-in-progress");
    });
    console.log("disabled gigs", result);

    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 Error saat mencari gigId disable:", err);
    return res.status(500).json({ error: "Gagal memproses gigId disable." });
  }
}

export { createGig, getGig, getGigDetails, getGigUser, getGigCount, disabledGigIds }