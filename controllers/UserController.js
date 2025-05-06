import { upload } from "../config/multer.js";
import User from "../models/User.js";
import { uploadSingle } from "../utils/DriveUtil.js";

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


export { uploadProfilePicture, getTrendingUsers, getUserInRooms }