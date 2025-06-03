import mongoose from "mongoose";
import Contract from "../models/Contract.js";
import Transaction from "../models/Transaction.js";
import { Gig } from "../models/Gig.js";
import { User } from "../models/User.js";
import Review from "../models/Review.js";

// Get order details by orderId
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log("Searching for order with ID:", orderId);

    // Find contract using orderId
    const contract = await Contract.findOne({ orderId });

    if (!contract) {
      console.log("Order not found in database for ID:", orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("Order found:", contract);

    // Check if user is authorized to view this order (must be buyer or seller)
    // Skip validation if the route is the public one or the user is not authenticated
    if (req.user && !req.isPublicRoute) {
      // Get related gig to check seller
      const gig = await Gig.findById(contract.gigId);

      // User is authorized if they are either the buyer or the seller
      const isAuthorized =
        req.user.id === contract.userId.toString() || // User is the buyer
        req.user.id === gig.creator.toString();      // User is the seller

      if (!isAuthorized) {
        return res.status(403).json({ error: "You are not authorized to view this order" });
      }
    }

    // Get related transaction 
    const transaction = await Transaction.findOne({ orderId });

    // Get related gig
    const gig = await Gig.findById(contract.gigId);

    // Get seller info
    const seller = await User.findById(gig.creator);

    // Get buyer info
    const buyer = await User.findById(contract.userId);

    const orderDetails = {
      _id: contract._id,
      orderId: contract.orderId,
      gigId: contract.gigId,
      userId: contract.userId,
      package: contract.package,
      progress: contract.progress,
      startTime: contract.startTime,
      progressTime: contract.progressTime,
      deliveredTime: contract.deliveredTime,
      finishedTime: contract.finishedTime,
      gigInfo: {
        title: gig.title,
        image: gig.images && gig.images.length > 0 ? gig.images[0] : null,
        creator: {
          name: seller.name,
          id: seller._id
        }
      }, buyer: {
        _id: buyer._id,
        name: buyer.name,
        email: buyer.email
      },
      transaction: transaction ? {
        status: transaction.status,
        amount: transaction.amount,
        paymentMethod: "Bank Transfer"
      } : null
    };

    return res.status(200).json(orderDetails);

  } catch (error) {
    console.error("🔥 Error getting order details:", error);
    return res.status(500).json({ error: "Failed to get order details" });
  }
};

// Update order progress
const updateOrderProgress = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { progress } = req.body;

    const contract = await Contract.findOne({ orderId });

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    const gig = await Gig.findById(contract.gigId);

    if (!gig) {
      return res.status(404).json({ error: "Gig not found" });
    }

    if (gig.creator.toString() !== req.user.id) {
      return res.status(403).json({
        error: "You are not authorized to update this order's progress. Only the freelancer who created the gig can update the progress."
      });
    }

    const updateFields = { progress };
    if (progress == 1) {
      updateFields.progressTime = new Date();
    }
    else if (progress == 2) {
      updateFields.deliveredTime = new Date();
    }
    else if (progress == 3) {
      updateFields.finishedTime = new Date();
    }

    const updatedContract = await Contract.findOneAndUpdate(
      { orderId },
      { $set: updateFields },
      { new: true } // Return the updated document
    );

    return res.status(200).json({
      message: "Order progress updated successfully",
      contract: updatedContract
    });

  } catch (error) {
    console.error("🔥 Error updating order progress:", error);
    return res.status(500).json({ error: "Failed to update order progress" });
  }
};

const getCurrentOrder = async (req, res) => {
  const { gigId } = req.params;
  const userId = req.user.id;

  try {
    const currentOrder = await Contract.findOne({
      userId: userId,
      progress: { $lt: 3 },
      gigId: gigId
    });
    console.log("Current order found:", currentOrder);
    return res.status(200).json(currentOrder);
  } catch (error) {
    console.error("🔥 Error get current contract order:", error);
    return res.status(500).json({ error: "Failed get current contract order" });
  }
}

const getAllOrders = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (user.access == false) {
      return res.status(403).json({ error: "Akses ditolak! tidak punya akses sebagai freelancer" });
    }
    const freelancerGigs = await Gig.find({ creator: userId });
    const gigIds = freelancerGigs.map(gig => gig._id);
    const orders = await Contract
      .find({ gigId: { $in: gigIds } })
      .sort({ progress: 1, startTime: -1 });
    const gigmap = {};
    freelancerGigs.forEach(gig => {
      gigmap[gig._id.toString()] = gig;
    });
    const userMap = {};
    const users = await User.find({ _id: { $in: orders.map(order => order.userId) } });
    users.forEach(user => {
      userMap[user._id.toString()] = {
        name: user.name,
        picture: user.picture || "temp"
      };
    });
    const referencedOrders = orders.map(order => ({
      ...order.toObject(),
      gigId: undefined,
      userId: undefined,
      gig: gigmap[order.gigId.toString()] || null,
      buyer: userMap[order.userId.toString()] || { name: "Unknown", picture: "temp" },
    }));
    return res.status(200).json({ orderList: referencedOrders });
  } catch (error) {
    console.error("🔥 Error fetch semua order contract:", error);
    return res.status(500).json({ error: "Failed to get all orders" });
  }
};

const submitReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, feedback } = req.body;

    const contract = await Contract.findOne({ orderId });
    if (!contract) {
      return res.status(404).json({ error: "Order not found" });
    }

    const gig = await Gig.findById(contract.gigId);
    if (!gig) {
      return res.status(404).json({ error: "Gig not found" });
    }

    if (contract.userId.toString() !== req.user.id) {
      return res.status(403).json({
        error: "You are not authorized to review this order. Only the buyer can submit a review."
      });
    }

    if (contract.progress !== 2) {
      return res.status(400).json({
        error: "Order must be delivered before submitting a review."
      });
    }

    const review = new Review({
      reviewerId: req.user.id,
      rating: rating,
      reviewMessage: feedback || "No feedback provided",
      gigId: contract.gigId.toString()
    });

    await review.save();

    const updatedContract = await Contract.findOneAndUpdate(
      { orderId },
      {
        $set: {
          progress: 3,
          finishedTime: new Date()
        }
      },
      { new: true }
    );
    const allReviews = await Review.find({ gigId: contract.gigId.toString() });
    const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;

    await Gig.findByIdAndUpdate(
      contract.gigId,
      {
        $set: {
          rating: Math.round(averageRating * 10) / 10,
          sold: gig.sold + 1
        },
        $inc: { reviewCount: 1 }
      }
    ); const freelancerGigs = await Gig.find({ creator: gig.creator });
    const allFreelancerReviews = await Review.find({
      gigId: { $in: freelancerGigs.map(g => g._id) }
    });

    const updateFields = {
      $inc: { completes: 1 }
    };

    if (allFreelancerReviews.length > 0) {
      const freelancerTotalRating = allFreelancerReviews.reduce((sum, review) => sum + review.rating, 0);
      const freelancerAverageRating = Math.round((freelancerTotalRating / allFreelancerReviews.length) * 10) / 10;

      updateFields.$set = {
        rating: freelancerAverageRating,
        reviews: allFreelancerReviews.length
      };
    }

    await User.findByIdAndUpdate(gig.creator, updateFields);

    return res.status(200).json({
      message: "Review submitted successfully and order finished",
      contract: updatedContract,
      review: {
        _id: review._id,
        rating: review.rating,
        reviewMessage: feedback || "No feedback provided",
        createdDate: review.createdDate
      }
    });

  } catch (error) {
    console.error("🔥 Error submitting review:", error);
    return res.status(500).json({ error: "Failed to submit review" });
  }
};

const getUnfinishedContracts = async (req, res) => {
  const userId = req.user.id;

  try {
    const unfinishedContracts = await Contract.find({
      userId: userId,
      progress: { $lt: 3 }
    });

    return res.status(200).json(unfinishedContracts)
  } catch (err) {
    console.error("🔥 Error saat mencari gigId disable:", err);
    return res.status(500).json({ error: "Gagal memproses gigId disable." });
  }
}

export { getOrderDetails, updateOrderProgress, getAllOrders, getCurrentOrder, submitReview, getUnfinishedContracts };
