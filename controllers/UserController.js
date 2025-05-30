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
      t.status === "settlement" || t.status === "capture"
    );

    const totalOrders = userTransactions.length;
    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const formattedTotalSpent = `Rp ${totalSpent.toLocaleString('id-ID')}`;
    const memberSince = new Date(user.joinedDate).getFullYear().toString();
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
    console.error("🔥 Error getting user stats:", error);
    return res.status(500).json({ error: "Gagal mengambil statistik user" });
  }
};

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

    const totalTransactions = await Transaction.countDocuments({
      customer_email: user.email
    });

    const transactions = await Transaction.find({
      customer_email: user.email
    })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    const gigIds = transactions.map(t => t.gigId);
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

    const purchaseHistory = transactions.map(transaction => {
      const gig = gigMap[transaction.gigId.toString()];
      const seller = gig ? sellerMap[gig.creator.toString()] : null;

      let status, statusType, deliveryTime;
      if (transaction.status === "pending" || transaction.status === "paid") {
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
        sellerRating: seller && typeof seller.rating === "number" ? seller.rating : 0,
        date: formattedDate,
        dateSort: orderDate,
        status,
        statusType,
        price: `Rp ${transaction.amount.toLocaleString('id-ID')}`,
        rating: gig && typeof gig.rating === "number" ? gig.rating : 0,
        deliveryTime,
        category: gig && gig.categories ? gig.categories : ["General"],
        image: gig && gig.images && gig.images.length > 0 ? gig.images[0] : null,
        orderNumber: transaction.orderId,
        description: gig ? gig.description.substring(0, 100) + "..." : "No description available"
      };
    });

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
        deliveryTime: "Delivered on time",
        image: gig && gig.images && gig.images.length > 0 ? gig.images[0] : null,
        helpful: Math.floor(Math.random() * 20) + 1,
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
              description: requestData.description,
              type: requestData.categories
            }
          },
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
        return res.status(200).json({ message: "Request freelancer approved", status: 1 });
      }
      else if (requestData.status == 2) {
        return res.status(200).json({ message: "Request freelancer rejected", status: 2 });
      }
      else return res.status(400).json({ error: "status out bound" });
    }
  } catch (error) {
    console.error("🔥 Error request freelancer:", error);
    return res.status(500).json({ error: "Gagal request freelancer" });
  }
}

const createFreelancerRequest = [
  upload.single('studentPicture'),
  async (req, res) => {
    const { categories, description } = req.body;
    const studentPicture = req.file;
    const userId = req.user.id;

    if (!studentPicture) {
      return res.status(400).json({ error: 'No images uploaded' });
    }
    try {
      const requestData = {
        userId: userId,
        categories: JSON.parse(categories),
        description,
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
      console.error("🔥 Error request freelancer:", error);
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
  checkRequestStatus,
  createFreelancerRequest
};