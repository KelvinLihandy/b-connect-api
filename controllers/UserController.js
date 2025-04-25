import User from "../models/User.js";

const getTrendingUsers = async (req, res) => {
  try {
    const topUsers = await User.find({}, "picture name type rating completes reviews")
      .sort({ completes: -1 })
      .limit(3);

    return res.status(200).json({ topUsers: topUsers });
  } catch (error) {
    console.error("🔥 Gagal fetch:", error);
    return res.status(500).json({ error: "Gagal mengambil data pengguna." });
  }
};

export { getTrendingUsers }
