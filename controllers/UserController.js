import { upload } from "../config/multer.js";
import { Gig } from "../models/Gig.js";
import Review from "../models/Review.js";
import Transaction from "../models/Transaction.js"; // Added import
import { User } from "../models/User.js";
import { uploadSingle } from "../utils/DriveUtil.js";
import { cryptoDecrypt, hashing, verifyHash } from "../utils/HashUtils.js";
import jwt from "jsonwebtoken";

// EXISTING FUNCTIONS - UNCHANGED
const getTrendingUsers = async (req, res) => {
  try {
    const topUsers = await User.find({
      access: true
    }, "picture name type rating completes reviews")
      .sort({ completes: -1 })
      .limit(3);
    return res.status(200).json(topUsers);
  } catch (error) {
    console.error("🔥 Gagal fetch:", error);
    return res.status(500).json({ error: "Gagal mengambil data pengguna." });
  }
};

const getUserInRooms = async (senderId, roomList) => {
  try {
    return await Promise.all(
      roomList.map(async (room) => {
        const receiverId = room.users.find(id => id !== senderId);
        const receiver = await User.findById(receiverId);
        return receiver;
      })
    );
  }
  catch (err) {
    console.error("🔥 Gagal get user by id");
    throw new Error("Gagal get user by id");
  }
}

const getUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const singleUser = await User.findById(userId);
    if (!singleUser) return res.status(400).json({ error: "id user tidak ditemukan" });
    return res.status(200).json({ user: singleUser })
  }
  catch (err) {
    console.error("🔥 Error cari user:", err);
    return res.status(500).json({ error: "error cari user" });
  }
}

const updateUserProfile = [
  upload.single('picture'),
  async (req, res) => {
    const { name, email, phoneNumber, descr, deletePicture, remember, porto } = req.body;
    const userId = req.user.id;

    const rfcEmailRegex = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z\-0-9]*[a-zA-Z0-9]:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f])\]))$/;
    if (!name && !email && !phoneNumber && !req.file && !deletePicture) {
      console.log("Validation failed: No fields to update");
      return res.status(400).json({ error: "Minimal satu field harus diupdate" });
    }
    if (email && !rfcEmailRegex.test(email)) {
      console.log("Validation failed: Invalid email format:", email);
      return res.status(400).json({ error: "Format email tidak valid" });
    }
    if (phoneNumber && !/^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(phoneNumber)) {
      console.log("Validation failed: Invalid phone number format:", phoneNumber);
      return res.status(400).json({ error: "Format nomor telepon tidak valid" });
    }
    try {
      const prevUser = await User.findById(userId);
      if (!prevUser) {
        console.log("User not found for update:", userId);
        return res.status(404).json({ error: "User tidak ditemukan" });
      }
      const updateFields = {
        name: name || prevUser.name,
        email: email || prevUser.email,
        phoneNumber: phoneNumber || prevUser.phoneNumber,
        description: descr !== undefined ? descr : prevUser.description,
        picture: prevUser.picture,
        portofolioUrl: porto !== undefined ? porto : prevUser.portofolioUrl,
      };
      if (deletePicture === 'true' || deletePicture === true) {
        console.log("Deleting profile picture, setting to temp");
        updateFields.picture = "temp";
      }
      else if (req.file) {
        let retries = 3;
        let pictureId = null;
        while (retries > 0 && pictureId === null) {
          try {
            pictureId = await uploadSingle(req.file, userId, process.env.DRIVE_PROFILEPIC_ID);
          } catch (uploadError) {
            console.error(`Upload attempt failed (${retries} retries left):`, uploadError);
            retries--;
            if (retries === 0) throw uploadError;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        updateFields.picture = pictureId;
      }
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true }
      );
      if (!updatedUser) {
        console.log("User not found for update:", userId);
        return res.status(404).json({ error: "User tidak ditemukan" });
      }
      const updatedUserPayload = {
        id: updatedUser._id,
        access: updatedUser.access,
        joinedDate: updatedUser.joinedDate,
        location: updatedUser.location,
        picture: updatedUser.picture,
        description: updatedUser.description,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        paymentNumber: updatedUser.paymentNumber,
        rating: updatedUser.rating,
        completes: updatedUser.completes,
        reviews: updatedUser.reviews,
        type: updatedUser.type,
        portofolio: updatedUser.portofolioUrl
      }
      const token = jwt.sign(updatedUserPayload, process.env.JWT_SECRET, { expiresIn: remember ? "30d" : "2h" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : undefined,
        path: "/"
      });
      return res.status(200).json({
        message: "Update profile sukses",
        token,
        updatedUserPayload
      });
    }
    catch (err) {
      console.error("🔥 Error updating profile:", err);
      return res.status(500).json({ error: "Gagal update profile: " + (err.message || "Unknown error") });
    }
  }
];

const updatePaymentNumber = async (req, res) => {
  const { paymentNumber } = req.body;
  console.log("Payment number:", paymentNumber);
  const userId = req.user.id;

  if (paymentNumber === undefined || paymentNumber === null) {
    return res.status(400).json({ error: "Nomor pembayaran harus diisi" });
  }
  if (paymentNumber !== "" && !/^\d{8,16}$/.test(paymentNumber)) {
    return res.status(400).json({ error: "Format nomor pembayaran tidak valid" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found for payment update:", userId);
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { paymentNumber: paymentNumber } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    return res.status(200).json({
      message: "Update nomor pembayaran sukses",
      user: updatedUser
    });
  }
  catch (err) {
    console.error("🔥 Error updating payment number:", err);
    return res.status(500).json({ error: "Gagal update nomor pembayaran: " + (err.message || "Unknown error") });
  }
};

const changePassword = async (req, res) => {
  const { password, newPassword, passwordConf } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) return res, status(400).json({ error: `User id ${userId} tidak ditemukan` });
  const validPassword = await verifyHash(password, user.password);
  try {
    if (!validPassword) {
      return res.status(400).json({ error: "Password lama tidak valid." });
    }
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan!" });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
      return res.status(400).json({ error: "Password lama tidak valid." });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(passwordConf)) {
      return res.status(400).json({ error: "Password baru tidak valid." });
    }
    if (newPassword !== passwordConf) return res.status(400).json({ error: "Password dan konfimasi berbeda." });

    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { password: await hashing(passwordConf) } },
      { new: true }
    );

    return res.status(200).json({ message: "Password berhasil diubah." })
  } catch (err) {
    console.error("🔥 Error mengganti password:", err);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
}

const uploadProfilePicture = [
  upload.single('image'),
  async (req, res) => {
    const { userId } = req.body;
    const profileImage = req.file;

    if (!profileImage) return res.status(400).json({ error: "Error file pp tidak masuk" });
    try {
      const pictureId = await uploadSingle(profileImage, userId, process.env.DRIVE_PROFILEPIC_ID);
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { picture: pictureId } },
        { new: true }
      );
      if (!updatedUser) return res.status(400).json({ error: "User id tidak ditemukan" });

      return res.status(200).json({ message: `Update pp sukses ke id ${userId}` })
    }
    catch (err) {
      console.error("🔥 Error uploading pp:", err);
      return res.status(500).json({ error: "Gagal upload pp" });
    }
  }
];

const getFreelancerData = async (req, res) => {
  const { id } = req.params;

  try {
    const freelancer = await User.findOne({
      _id: id,
      access: true
    });
    if (!freelancer) return res.status(400).json({ error: "id freelancer tidak ditemukan" });
    const freelancerGigs = await Gig.find({ creator: id });
    const reviews = await Review.find({
      gigId: { $in: freelancerGigs.map(g => g._id) }
    });
    const reviewerIds = [...new Set(reviews.map(r => r.reviewerId))];
    const reviewers = await User.find({ _id: { $in: reviewerIds } }, { _id: 1, name: 1, picture: 1 });
    const reviewerMap = {};
    const pictureMap = {};
    reviewers.forEach(user => {
      reviewerMap[user._id.toString()] = user.name;
      pictureMap[user._id.toString()] = user.picture;
    });
    const gigIds = [...new Set(reviews.map(r => r.gigId.toString()))];
    const gigs = await Gig.find({ _id: { $in: gigIds } });
    const gigMap = {};
    gigs.forEach(gig => {
      gigMap[gig._id.toString()] = gig;
    });
    const decryptedReviews = reviews.map(review => ({
      ...review.toObject(),
      reviewMessage: cryptoDecrypt(review.reviewMessage, review.iv),
      reviewerName: reviewerMap[review.reviewerId.toString()] || "Unknown",
      reviewerPicture: pictureMap[review.reviewerId.toString()] || "temp",
      reviewedGig: gigMap[review.gigId.toString()] || null,
      reviewerId: undefined,
      gigId: undefined
    }));

    
    return res.json({
      freelancer,
      freelancerGigs,
      reviews: decryptedReviews
    });
  }
  catch (err) {
    console.error("🔥 Error cari user:", err);
    return res.status(500).json({ error: "error cari user" });
  }
}

// NEW FUNCTIONS FOR USER PROFILE
// Get user statistics for profile
const getUserStats = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Calculate profile completion percentage
    const totalFields = 8; // Based on important fields
    let completedFields = 0;
    
    if (user.name && user.name.trim() !== "") completedFields++;
    if (user.email && user.email.trim() !== "") completedFields++;
    if (user.phoneNumber && user.phoneNumber.trim() !== "") completedFields++;
    if (user.description && user.description.trim() !== "") completedFields++;
    if (user.location && user.location.trim() !== "") completedFields++;
    if (user.picture && user.picture !== "temp") completedFields++;
    if (user.paymentNumber && user.paymentNumber.trim() !== "") completedFields++;
    if (user.type && user.type.length > 0 && user.type[0] !== "") completedFields++;

    const profileCompletion = Math.round((completedFields / totalFields) * 100);

    // Get total orders and spent amount from transactions
    const userTransactions = await Transaction.find({ 
      customer_email: user.email 
    });

    const completedTransactions = userTransactions.filter(t => 
      t.status === "settlement" || t.status === "capture"
    );

    const totalOrders = userTransactions.length;
    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Format total spent to Rupiah
    const formattedTotalSpent = `Rp ${totalSpent.toLocaleString('id-ID')}`;

    // Get member since year
    const memberSince = new Date(user.joinedDate).getFullYear().toString();

    // Active vouchers (placeholder - implement voucher system later)
    const activeVouchers = "0"; // TODO: Implement voucher system

    const stats = {
      memberSince,
      profileCompletion: `${profileCompletion}%`,
      activeVouchers,
      totalOrders: totalOrders.toString(),
      totalSpent: formattedTotalSpent
    };

    return res.status(200).json({ stats });

  } catch (error) {
    console.error("🔥 Error getting user stats:", error);
    return res.status(500).json({ error: "Gagal mengambil statistik user" });
  }
};

// Get user purchase history with pagination
const getUserPurchaseHistory = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 4;
  const skip = (page - 1) * limit;

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Get transactions for this user
    const totalTransactions = await Transaction.countDocuments({ 
      customer_email: user.email 
    });

    const transactions = await Transaction.find({ 
      customer_email: user.email 
    })
    .sort({ _id: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limit);

    // Get gig details for each transaction
    const gigIds = transactions.map(t => t.gigId);
    const gigs = await Gig.find({ _id: { $in: gigIds } });
    const gigMap = {};
    gigs.forEach(gig => {
      gigMap[gig._id.toString()] = gig;
    });

    // Get seller details
    const sellerIds = gigs.map(g => g.creator);
    const sellers = await User.find({ _id: { $in: sellerIds } }, {
      _id: 1, name: 1, rating: 1, picture: 1
    });
    const sellerMap = {};
    sellers.forEach(seller => {
      sellerMap[seller._id.toString()] = seller;
    });

    // Format purchase history data
    const purchaseHistory = transactions.map(transaction => {
      const gig = gigMap[transaction.gigId.toString()];
      const seller = gig ? sellerMap[gig.creator.toString()] : null;
      
      // Determine status
      let status, statusType, deliveryTime;
      if (transaction.status === "pending") {
        status = "In Progress";
        statusType = "progress";
        deliveryTime = "Processing payment";
      } else if (transaction.status === "settlement" || transaction.status === "capture") {
        status = "Completed";
        statusType = "delivered";
        deliveryTime = "Delivered on time";
      } else {
        status = "Cancelled";
        statusType = "cancelled";
        deliveryTime = "Order cancelled";
      }

      // Format date
      const orderDate = new Date(transaction._id.getTimestamp());
      const formattedDate = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return {
        id: transaction._id,
        title: gig ? gig.name : "Service not found",
        seller: seller ? seller.name : "Unknown Seller",
        sellerRating: seller ? seller.rating || 4.5 : 4.5,
        date: formattedDate,
        dateSort: orderDate,
        status,
        statusType,
        price: `Rp ${transaction.amount.toLocaleString('id-ID')}`,
        rating: 0, // TODO: Get user's rating for this order
        deliveryTime,
        category: gig && gig.categories ? gig.categories[0] : "General",
        image: gig && gig.images && gig.images.length > 0 ? gig.images[0] : null,
        orderNumber: transaction.orderId,
        description: gig ? gig.description.substring(0, 100) + "..." : "No description available"
      };
    });

    // Sort: In Progress first, then by date (newest first)
    purchaseHistory.sort((a, b) => {
      if (a.statusType !== b.statusType) {
        if (a.statusType === "progress") return -1;
        if (b.statusType === "progress") return 1;
      }
      return b.dateSort - a.dateSort;
    });

    const totalPages = Math.ceil(totalTransactions / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      purchaseHistory,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        totalItems: totalTransactions
      }
    });

  } catch (error) {
    console.error("🔥 Error getting purchase history:", error);
    return res.status(500).json({ error: "Gagal mengambil riwayat pembelian" });
  }
};

// Get user reviews with pagination
const getUserReviews = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 2;
  const skip = (page - 1) * limit;

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Get total reviews count
    const totalReviews = await Review.countDocuments({ reviewerId: userId });

    // Get reviews by this user
    const reviews = await Review.find({ reviewerId: userId })
      .sort({ createdDate: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    // Get gig details for each review
    const gigIds = reviews.map(r => r.gigId);
    const gigs = await Gig.find({ _id: { $in: gigIds } });
    const gigMap = {};
    gigs.forEach(gig => {
      gigMap[gig._id.toString()] = gig;
    });

    // Get seller details
    const sellerIds = gigs.map(g => g.creator);
    const sellers = await User.find({ _id: { $in: sellerIds } }, {
      _id: 1, name: 1, rating: 1, picture: 1
    });
    const sellerMap = {};
    sellers.forEach(seller => {
      sellerMap[seller._id.toString()] = seller;
    });

    // Get transaction details to get price
    const transactions = await Transaction.find({ 
      customer_email: user.email,
      gigId: { $in: gigIds }
    });
    const transactionMap = {};
    transactions.forEach(transaction => {
      transactionMap[transaction.gigId.toString()] = transaction;
    });

    // Format reviews data
    const formattedReviews = reviews.map(review => {
      const gig = gigMap[review.gigId.toString()];
      const seller = gig ? sellerMap[gig.creator.toString()] : null;
      const transaction = transactionMap[review.gigId.toString()];
      
      // Decrypt review message
      const decryptedMessage = cryptoDecrypt(review.reviewMessage, review.iv);
      
      // Format date
      const reviewDate = new Date(review.createdDate);
      const formattedDate = reviewDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return {
        id: review._id,
        title: gig ? gig.name : "Service not found",
        seller: seller ? seller.name : "Unknown Seller",
        sellerRating: seller ? seller.rating || 4.5 : 4.5,
        orderId: transaction ? `${transaction.orderId} • ${formattedDate}` : `Order • ${formattedDate}`,
        dateSort: reviewDate,
        rating: review.rating,
        reviewText: decryptedMessage,
        price: transaction ? `Rp ${transaction.amount.toLocaleString('id-ID')}` : "Rp 0",
        category: gig && gig.categories ? gig.categories[0] : "General",
        deliveryTime: "Delivered on time", // TODO: Calculate actual delivery time
        image: gig && gig.images && gig.images.length > 0 ? gig.images[0] : null,
        helpful: Math.floor(Math.random() * 20) + 1, // Random helpful count
        verified: true
      };
    });

    const totalPages = Math.ceil(totalReviews / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      reviews: formattedReviews,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        totalItems: totalReviews
      }
    });

  } catch (error) {
    console.error("🔥 Error getting user reviews:", error);
    return res.status(500).json({ error: "Gagal mengambil review user" });
  }
};

// Export all functions - EXISTING + NEW
export { 
  getTrendingUsers, 
  getUserInRooms, 
  getUser, 
  updateUserProfile, 
  updatePaymentNumber, 
  changePassword, 
  uploadProfilePicture, 
  getFreelancerData,
  // New functions for user profile
  getUserStats,
  getUserPurchaseHistory,
  getUserReviews
};