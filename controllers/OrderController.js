import mongoose from "mongoose";
import Contract from "../models/Contract.js";
import Transaction from "../models/Transaction.js";
import { Gig } from "../models/Gig.js";
import { User } from "../models/User.js";

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
      gigInfo: {
        title: gig.title,
        image: gig.images && gig.images.length > 0 ? gig.images[0] : null,
        creator: {
          name: seller.name,
          id: seller._id
        }
      },
      buyer: {
        name: buyer.name,
        email: buyer.email
      },
      transaction: transaction ? {
        status: transaction.status,
        amount: transaction.amount,
        paymentMethod: "GoPay" // Default payment method
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
    
    // Find the contract
    const contract = await Contract.findOne({ orderId });
    
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }
    
    // Get the gig to check if current user is the seller
    const gig = await Gig.findById(contract.gigId);
    
    if (!gig) {
      return res.status(404).json({ error: "Gig not found" });
    }
    
    // Verify that the current user is the seller (freelancer) of this gig
    if (gig.creator.toString() !== req.user.id) {
      return res.status(403).json({ 
        error: "You are not authorized to update this order's progress. Only the freelancer who created the gig can update the progress."
      });
    }
    
    // Once authorized, update the contract
    const updatedContract = await Contract.findOneAndUpdate(
      { orderId },
      { $set: { progress } },
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

export { getOrderDetails, updateOrderProgress };
