import Review from "../models/Review.js";

const ReviewRateLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check reviews submitted in the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const recentReviews = await Review.find({
      reviewerId: userId,
      createdDate: { $gte: oneHourAgo }
    });

    // Limit: Maximum 5 reviews per hour per user
    if (recentReviews.length >= 5) {
      return res.status(429).json({
        error: "Terlalu banyak review dalam 1 jam terakhir. Silakan coba lagi nanti.",
        retryAfter: 3600
      });
    }

    // Check reviews submitted in the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const dailyReviews = await Review.find({
      reviewerId: userId,
      createdDate: { $gte: twentyFourHoursAgo }
    });

    // Limit: Maximum 20 reviews per day per user
    if (dailyReviews.length >= 20) {
      return res.status(429).json({
        error: "Batas maksimal review harian tercapai. Silakan coba lagi besok.",
        retryAfter: 86400
      });
    }

    // Check for duplicate review attempts (same service within 10 minutes)
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
    
    const { serviceId } = req.body;
    if (serviceId) {
      const duplicateReview = await Review.findOne({
        reviewerId: userId,
        gigId: serviceId,
        createdDate: { $gte: tenMinutesAgo }
      });

      if (duplicateReview) {
        return res.status(429).json({
          error: "Review untuk service ini baru saja dibuat. Tunggu 10 menit sebelum membuat review lagi.",
          retryAfter: 600
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error in review rate limit middleware:", error);
    return res.status(500).json({
      error: "Error checking rate limit"
    });
  }
};

export default ReviewRateLimit;