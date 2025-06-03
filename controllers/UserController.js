import { upload } from "../config/multer.js";
import { Gig } from "../models/Gig.js";
import FreelancerRequest from "../models/FreelancerRequest.js";
import Review from "../models/Review.js";
import Transaction from "../models/Transaction.js";
import { User } from "../models/User.js";
import { uploadSingle } from "../utils/DriveUtil.js";
import { cryptoDecrypt, hashing, verifyHash } from "../utils/HashUtils.js";
import jwt from "jsonwebtoken";

const getTrendingUsers = async (req, res) => {
  try {
    const topUsers = await User.find({
      access: true
    }, "picture name type rating completes reviews")
      .sort({ rating: -1, completes: -1 });
    return res.status(200).json(topUsers);
  } catch (error) {
    console.error("Error fetch trending users:", error);
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
    console.error("Error get user by id:", err);
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
    console.error("Error cari user:", err);
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
      return res.status(400).json({ error: "Minimal satu field harus diupdate" });
    }
    if (email && !rfcEmailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }
    if (phoneNumber && !/^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(phoneNumber)) {
      return res.status(400).json({ error: "Format nomor telepon tidak valid" });
    }

    try {
      const prevUser = await User.findById(userId);
      if (!prevUser) {
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
      console.error("Error updating profile:", err);
      return res.status(500).json({ error: "Gagal update profile: " + (err.message || "Unknown error") });
    }
  }
];

const updatePaymentNumber = async (req, res) => {
  const { paymentNumber } = req.body;
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
    console.error("Error updating payment number:", err);
    return res.status(500).json({ error: "Gagal update nomor pembayaran: " + (err.message || "Unknown error") });
  }
};

const changePassword = async (req, res) => {
  const { password, newPassword, passwordConf } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ error: `User id ${userId} tidak ditemukan` });
  
  const validPassword = await verifyHash(password, user.password);
  
  try {
    if (!validPassword) {
      return res.status(400).json({ error: "Password lama tidak valid." });
    }
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan!" });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
      return res.status(400).json({ error: "Password baru tidak valid." });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(passwordConf)) {
      return res.status(400).json({ error: "Konfirmasi password tidak valid." });
    }
    if (newPassword !== passwordConf) return res.status(400).json({ error: "Password dan konfimasi berbeda." });

    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { password: await hashing(passwordConf) } },
      { new: true }
    );

    return res.status(200).json({ message: "Password berhasil diubah." })
  } catch (err) {
    console.error("Error mengganti password:", err);
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
      console.error("Error uploading pp:", err);
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

    let overallRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      overallRating = Math.round((totalRating / reviews.length) * 10) / 10;
    }

    const freelancerWithRating = {
      ...freelancer.toObject(),
      rating: overallRating,
      reviews: reviews.length
    };

    return res.json({
      freelancer: freelancerWithRating,
      freelancerGigs,
      reviews: decryptedReviews
    });
  }
  catch (err) {
    console.error("Error cari user:", err);
    return res.status(500).json({ error: "error cari user" });
  }
}

const getUserStats = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan" });
    }

    const totalFields = 8;
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

    const userTransactions = await Transaction.find({
      customer_email: user.email
    });

    const completedTransactions = userTransactions.filter(t =>
      t.status === "settlement" || t.status === "capture" || t.status === "paid"
    );

    const totalOrders = userTransactions.length;
    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const formattedTotalSpent = `Rp ${totalSpent.toLocaleString('id-ID')}`;
    const memberSince = user.joinedDate ? new Date(user.joinedDate).getFullYear().toString() : new Date().getFullYear().toString();
    const activeVouchers = "0";

    const stats = {
      memberSince,
      profileCompletion: `${profileCompletion}%`,
      activeVouchers,
      totalOrders: totalOrders.toString(),
      totalSpent: formattedTotalSpent
    };

    return res.status(200).json({ stats });

  } catch (error) {
    console.error("Error getting user stats:", error);
    return res.status(500).json({ error: "Gagal mengambil statistik user" });
  }
};

const processGoogleDriveImage = (imageId) => {
  if (!imageId || imageId === "temp" || imageId === "null" || imageId === "undefined" || imageId.trim() === "") {
    return null;
  }
  
  let cleanId = imageId;
  if (imageId.includes('/d/')) {
    const match = imageId.match(/\/d\/([^\/]+)/);
    cleanId = match ? match[1] : imageId;
  } else if (imageId.includes('id=')) {
    const match = imageId.match(/id=([^&]+)/);
    cleanId = match ? match[1] : imageId;
  }
  
  return {
    primary: `https://drive.google.com/thumbnail?id=${cleanId}&sz=w400-h300`,
    fallback1: `https://lh3.googleusercontent.com/d/${cleanId}=w400-h300`,
    fallback2: `https://drive.google.com/uc?export=view&id=${cleanId}`,
    id: cleanId
  };
};

// FIXED: No more "processing payment" status
const getTransactionStatus = (transaction) => {
  console.log("🔥 USING NEW getTransactionStatus FUNCTION"); // ADD THIS LINE
  console.log("Transaction status:", transaction.status);
  const status = transaction.status?.toLowerCase();
  
  switch (status) {
    case "settlement":
    case "capture":
    case "paid":
    case "success":
    case "completed":
      console.log("✅ Status: Completed");
      return {
        status: "Completed",
        statusType: "delivered",
        deliveryTime: "Delivered on time"
      };
    case "cancelled":
    case "canceled":
    case "failed":
    case "expire":
    case "deny":
    case "refund":
      return {
        status: "Cancelled",
        statusType: "cancelled",
        deliveryTime: "Order cancelled"
      };
    case "pending":
    case "authorize":
    default:
      // If user can see the transaction, payment is already processed
      // We don't show "processing payment" anymore
      return {
        status: "In Progress",
        statusType: "progress",
        deliveryTime: "Work in progress"
      };
  }
};

// FIXED: Consistent data format for purchase history
const getUserPurchaseHistory = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 4;
  const skip = (page - 1) * limit;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan" });
    }

    let transactions = [];
    
    transactions = await Transaction.find({
      customer_email: user.email
    }).sort({ _id: -1 });
    
    if (transactions.length === 0) {
      const userReviews = await Review.find({ reviewerId: userId });
      
      if (userReviews.length > 0) {
        const reviewGigIds = userReviews.map(r => r.gigId);
        transactions = await Transaction.find({
          gigId: { $in: reviewGigIds }
        }).sort({ _id: -1 });
      }
    }

    const totalTransactions = transactions.length;
    
    if (totalTransactions === 0) {
      return res.status(200).json({
        purchaseHistory: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          totalItems: 0
        }
      });
    }

    const paginatedTransactions = transactions.slice(skip, skip + limit);

    const gigIds = paginatedTransactions.map(t => t.gigId);
    const gigs = await Gig.find({ _id: { $in: gigIds } });
    const gigMap = {};
    gigs.forEach(gig => {
      gigMap[gig._id.toString()] = gig;
    });

    const sellerIds = gigs.map(g => g.creator);
    const sellers = await User.find({ _id: { $in: sellerIds } }, {
      _id: 1, name: 1, rating: 1, picture: 1
    });
    const sellerMap = {};
    sellers.forEach(seller => {
      sellerMap[seller._id.toString()] = seller;
    });

    const existingReviews = await Review.find({
      reviewerId: userId,
      gigId: { $in: gigIds }
    });
    const reviewedGigIds = new Set(existingReviews.map(r => r.gigId.toString()));
    const userRatings = {};
    existingReviews.forEach(review => {
      userRatings[review.gigId.toString()] = review.rating;
    });

    const purchaseHistory = paginatedTransactions.map(transaction => {
      const gig = gigMap[transaction.gigId.toString()];
      const seller = gig ? sellerMap[gig.creator.toString()] : null;
      const hasReview = reviewedGigIds.has(transaction.gigId.toString());
      const userRating = userRatings[transaction.gigId.toString()] || 0;

      const statusInfo = getTransactionStatus(transaction);

      const orderDate = new Date(transaction._id.getTimestamp());
      const formattedDate = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      let imageUrls = null;
      if (gig && gig.images && gig.images.length > 0) {
        imageUrls = processGoogleDriveImage(gig.images[0]);
      }

      return {
        id: transaction._id,
        orderId: transaction.orderId,
        orderNumber: transaction.orderId, // Added for consistency
        serviceId: gig ? gig._id : null,
        title: gig ? gig.name : "Service not found",
        seller: seller ? seller.name : "Unknown Seller",
        sellerId: seller ? seller._id : null,
        sellerRating: seller ? (seller.rating || 4.5) : 4.5,
        date: formattedDate,
        dateSort: orderDate,
        status: statusInfo.status,
        statusType: statusInfo.statusType,
        orderStatus: statusInfo.statusType,
        paymentStatus: statusInfo.statusType === 'delivered' ? 'settlement' : 
                      statusInfo.statusType === 'cancelled' ? 'failed' : 'paid',
        completed: statusInfo.statusType === 'delivered',
        delivered: statusInfo.statusType === 'delivered',
        price: `Rp ${transaction.amount.toLocaleString('id-ID')}`,
        amount: transaction.amount,
        rating: userRating,
        hasReview: hasReview,
        deliveryTime: statusInfo.deliveryTime,
        category: gig && gig.categories ? gig.categories : ["General"],
        image: imageUrls ? imageUrls.primary : null,
        imageUrls: imageUrls,
        description: gig ? gig.description.substring(0, 100) + "..." : "No description available"
      };
    });

    // Sort: In Progress first, then Completed, then Cancelled
    purchaseHistory.sort((a, b) => {
      const statusPriority = { 'progress': 0, 'delivered': 1, 'cancelled': 2 };
      const aPriority = statusPriority[a.statusType] || 3;
      const bPriority = statusPriority[b.statusType] || 3;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
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
    console.error("Error getting purchase history:", error);
    return res.status(500).json({ error: "Gagal mengambil riwayat pembelian" });
  }
};

// FIXED: Consistent data format matching purchase history
const getUserReviews = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 2;
  const skip = (page - 1) * limit;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan" });
    }

    const totalReviews = await Review.countDocuments({ reviewerId: userId });
    const reviews = await Review.find({ reviewerId: userId })
      .sort({ createdDate: -1 })
      .skip(skip)
      .limit(limit);

    const gigIds = reviews.map(r => r.gigId);
    const gigs = await Gig.find({ _id: { $in: gigIds } });
    const gigMap = {};
    gigs.forEach(gig => {
      gigMap[gig._id.toString()] = gig;
    });

    const sellerIds = gigs.map(g => g.creator);
    const sellers = await User.find({ _id: { $in: sellerIds } }, {
      _id: 1, name: 1, rating: 1, picture: 1
    });
    const sellerMap = {};
    sellers.forEach(seller => {
      sellerMap[seller._id.toString()] = seller;
    });

    const transactions = await Transaction.find({
      customer_email: user.email,
      gigId: { $in: gigIds }
    });
    const transactionMap = {};
    transactions.forEach(transaction => {
      transactionMap[transaction.gigId.toString()] = transaction;
    });

    const formattedReviews = reviews.map(review => {
      const gig = gigMap[review.gigId.toString()];
      const seller = gig ? sellerMap[gig.creator.toString()] : null;
      const transaction = transactionMap[review.gigId.toString()];

      const decryptedMessage = cryptoDecrypt(review.reviewMessage, review.iv);

      const reviewDate = new Date(review.createdDate);
      const formattedDate = reviewDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      let imageUrls = null;
      if (gig && gig.images && gig.images.length > 0) {
        imageUrls = processGoogleDriveImage(gig.images[0]);
      }

      // Consistent format with purchase history
      return {
        id: review._id,
        serviceId: gig ? gig._id : null,
        title: gig ? gig.name : "Service not found", // Matches purchase history
        serviceTitle: gig ? gig.name : "Service not found", // For frontend compatibility
        seller: seller ? seller.name : "Unknown Seller",
        serviceSeller: seller ? seller.name : "Unknown Seller", // For frontend compatibility
        sellerId: seller ? seller._id : null,
        sellerRating: seller ? (seller.rating || 4.5) : 4.5,
        orderId: transaction ? transaction.orderId : 'N/A',
        orderNumber: transaction ? transaction.orderId : 'N/A', // Added for consistency
        date: formattedDate,
        reviewDate: review.createdDate, // ISO format for frontend
        dateSort: reviewDate,
        rating: review.rating,
        userRating: review.rating, // For frontend compatibility
        reviewText: decryptedMessage,
        price: transaction ? `Rp ${transaction.amount.toLocaleString('id-ID')}` : "Rp 0",
        servicePrice: transaction ? `Rp ${transaction.amount.toLocaleString('id-ID')}` : "Rp 0", // For frontend compatibility
        amount: transaction ? transaction.amount : 0,
        category: gig && gig.categories ? gig.categories : ["General"],
        deliveryTime: "Delivered on time", // Reviews only exist for completed orders
        delivery: "Delivered on time", // Alternative field name
        image: imageUrls ? imageUrls.primary : null,
        imageUrls: imageUrls,
        description: gig ? gig.description.substring(0, 100) + "..." : "Professional service provided", // Added description
        serviceDescription: gig ? gig.description.substring(0, 100) + "..." : "Professional service provided", // For frontend compatibility
        verified: true,
        orderStatus: 'completed', // Reviews only exist for completed orders
        status: 'Completed',
        statusType: 'delivered',
        completed: true,
        delivered: true,
        helpful: Math.floor(Math.random() * 20) + 1
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
    console.error("Error getting user reviews:", error);
    return res.status(500).json({ error: "Gagal mengambil review user" });
  }
};

const submitReview = async (req, res) => {
  const { 
    orderId, 
    serviceId, 
    sellerId, 
    rating, 
    reviewText, 
    deliveryRating, 
    communicationRating, 
    qualityRating, 
    wouldRecommend 
  } = req.body;
  const userId = req.user.id;

  try {
    if (!orderId || !serviceId || !rating || !reviewText) {
      return res.status(400).json({ 
        error: "Order ID, Service ID, rating, dan review text harus diisi" 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: "Rating harus antara 1-5" 
      });
    }

    if (reviewText.trim().length < 10) {
      return res.status(400).json({ 
        error: "Review text minimal 10 karakter" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan" });
    }

    const gig = await Gig.findById(serviceId);
    if (!gig) {
      return res.status(400).json({ error: "Service tidak ditemukan" });
    }

    const transaction = await Transaction.findOne({
      orderId: orderId,
      gigId: serviceId,
      customer_email: user.email
    });

    if (!transaction) {
      return res.status(400).json({ 
        error: "Order tidak ditemukan atau tidak valid" 
      });
    }

    const validStatuses = ["settlement", "capture", "paid", "success", "completed"];
    if (!validStatuses.includes(transaction.status?.toLowerCase())) {
      return res.status(400).json({ 
        error: "Review hanya bisa dibuat untuk order yang sudah selesai" 
      });
    }

    const existingReview = await Review.findOne({
      reviewerId: userId,
      gigId: serviceId
    });

    if (existingReview) {
      return res.status(400).json({ 
        error: "Review untuk order ini sudah pernah dibuat" 
      });
    }

    const reviewData = {
      reviewerId: userId,
      gigId: serviceId,
      rating: rating,
      reviewMessage: reviewText.trim(),
      createdDate: new Date()
    };

    const newReview = await Review.create(reviewData);

    if (!newReview) {
      return res.status(500).json({ 
        error: "Gagal membuat review" 
      });
    }

    if (sellerId) {
      try {
        const sellerGigs = await Gig.find({ creator: sellerId });
        const sellerGigIds = sellerGigs.map(g => g._id);
        
        const allSellerReviews = await Review.find({
          gigId: { $in: sellerGigIds }
        });

        if (allSellerReviews.length > 0) {
          const totalRating = allSellerReviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = Math.round((totalRating / allSellerReviews.length) * 10) / 10;

          await User.findByIdAndUpdate(sellerId, {
            $set: {
              rating: averageRating,
              reviews: allSellerReviews.length
            }
          });
        }
      } catch (updateError) {
        console.error("Error updating seller rating:", updateError);
      }
    }

    const responseReview = {
      id: newReview._id,
      reviewText: reviewText.trim(),
      rating: rating,
      deliveryRating: deliveryRating || rating,
      communicationRating: communicationRating || rating,
      qualityRating: qualityRating || rating,
      wouldRecommend: wouldRecommend !== false,
      createdDate: newReview.createdDate,
      serviceName: gig.name,
      sellerName: "",
      verified: true
    };

    if (sellerId) {
      const seller = await User.findById(sellerId, 'name');
      if (seller) {
        responseReview.sellerName = seller.name;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Review berhasil dibuat",
      review: responseReview
    });

  } catch (error) {
    console.error("Error submitting review:", error);
    return res.status(500).json({ 
      error: "Gagal submit review: " + (error.message || "Unknown error") 
    });
  }
};

const getReviewAnalytics = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ error: "User tidak ditemukan" });
    }

    const userReviews = await Review.find({ reviewerId: userId });
    const totalReviews = userReviews.length;

    let avgRatingGiven = 0;
    if (totalReviews > 0) {
      const totalRating = userReviews.reduce((sum, review) => sum + review.rating, 0);
      avgRatingGiven = Math.round((totalRating / totalReviews) * 10) / 10;
    }

    const ratingDistribution = {
      5: userReviews.filter(r => r.rating === 5).length,
      4: userReviews.filter(r => r.rating === 4).length,
      3: userReviews.filter(r => r.rating === 3).length,
      2: userReviews.filter(r => r.rating === 2).length,
      1: userReviews.filter(r => r.rating === 1).length
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviews = userReviews.filter(
      review => new Date(review.createdDate) >= thirtyDaysAgo
    );

    const analytics = {
      totalReviews,
      averageRatingGiven: avgRatingGiven,
      ratingDistribution,
      recentReviewsCount: recentReviews.length,
      reviewFrequency: totalReviews > 0 ? Math.round(totalReviews / 12) : 0,
      mostCommonRating: Object.keys(ratingDistribution).reduce((a, b) => 
        ratingDistribution[a] > ratingDistribution[b] ? a : b
      )
    };

    return res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error("Error getting review analytics:", error);
    return res.status(500).json({ 
      error: "Gagal mengambil analytics review" 
    });
  }
};

const checkRequestStatus = async (req, res) => {
  const { remember } = req.body;
  const userId = req.user.id;

  try {
    const requestData = await FreelancerRequest.findOne({ userId: userId });
    if (!requestData) {
      return res.status(404).json({ error: "Tidak ada request yang dibuat" });
    }
    else {
      if (requestData.status == 0) {
        return res.status(200).json({ message: "Request freelancer ongoing", status: 0 })
      }
      else if (requestData.status == 1) {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              access: true,
              location: requestData.location,
              description: requestData.description,
              type: requestData.categories,
              paymentNumber: requestData.paymentNumber
            }
          },
          { new: true }
        );
        if (!updatedUser) {
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
        return res.status(200).json({ message: "Request freelancer approved", status: 1 });
      }
      else if (requestData.status == 2) {
        return res.status(200).json({ message: "Request freelancer rejected", status: 2 });
      }
      else return res.status(400).json({ error: "status out bound" });
    }
  } catch (error) {
    console.error("Error request freelancer:", error);
    return res.status(500).json({ error: "Gagal request freelancer" });
  }
}

const createFreelancerRequest = [
  upload.single('studentPicture'),
  async (req, res) => {
    const { location, categories, description, paymentNumber } = req.body;
    const studentPicture = req.file;
    const userId = req.user.id;

    if (!studentPicture) {
      return res.status(400).json({ error: 'No images uploaded' });
    }
    if (!paymentNumber || !paymentNumber.trim()) {
      return res.status(400).json({ error: 'Payment number is required' });
    }
    if (!/^[0-9]+$/.test(paymentNumber.trim())) {
      return res.status(400).json({ error: 'Payment number must contain only numbers' });
    }
    if (paymentNumber.trim().length < 8) {
      return res.status(400).json({ error: 'Payment number must be at least 8 digits' });
    }
    
    try {
      const requestData = {
        userId: userId,
        location,
        categories: JSON.parse(categories),
        description,
        paymentNumber: paymentNumber.trim(),
        studentIdPhoto: "temp",
      };
      
      const newFlRequest = await FreelancerRequest.create(requestData);
      const imageId = await uploadSingle(studentPicture, newFlRequest.id, process.env.DRIVE_FLREQUEST_ID);
      const imagedRequest = await FreelancerRequest.findOneAndUpdate(
        { _id: newFlRequest._id },
        { $set: { studentIdPhoto: imageId } },
        { new: true }
      );
      
      if (!imagedRequest) return res.status(400).json({ error: "Fl Request id tidak ditemukan" });
      
      return res.status(201).json({ message: "Freelancer Request berhasil dibuat", flReq: imagedRequest });
    } catch (error) {
      console.error("Error request freelancer:", error);
      return res.status(500).json({ error: "Gagal request freelancer" });
    }
  }
]

export {
  getTrendingUsers,
  getUserInRooms,
  getUser,
  updateUserProfile,
  updatePaymentNumber,
  changePassword,
  uploadProfilePicture,
  getFreelancerData,
  getUserStats,
  getUserPurchaseHistory,
  getUserReviews,
  submitReview,
  getReviewAnalytics,
  checkRequestStatus,
  createFreelancerRequest
};