import { upload } from "../config/multer.js";
import User from "../models/User.js";
import { uploadSingle } from "../utils/DriveUtil.js";
import { hashing, verifyHash } from "../utils/HashUtils.js";

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
    const singleUser = await User.findOne({ _id: userId });
    if (!singleUser) return res.status(400).json({ error: "id user tidak ditemukan" });
    return res.status(200).json({ user: singleUser })
  }
  catch (err) {
    console.error("🔥 Error cari user:", err);
    return res.status(500).json({ error: "error cari user" });
  }
}

const updateUserProfile = [upload.single('picture'), async (req, res) => {
    const { name, email, phoneNumber, deletePicture } = req.body;
    const userId = req.user.id; // Get userId from middleware
    
    // Validasi minimal ada satu field yang diupdate
    if (!name && !email && !phoneNumber && !req.file && !deletePicture) {
      console.log("Validation failed: No fields to update");
      return res.status(400).json({ error: "Minimal satu field harus diupdate" });
    }
    
    // Validasi format email
    if (email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      console.log("Validation failed: Invalid email format:", email);
      return res.status(400).json({ error: "Format email tidak valid" });
    }
    
    // Validasi format nomor telepon (format Indonesia)
    if (phoneNumber && !/^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(phoneNumber)) {
      console.log("Validation failed: Invalid phone number format:", phoneNumber);
      return res.status(400).json({ error: "Format nomor telepon tidak valid" });
    }

    try {
      // Get user data first
      const prevUser = await User.findById(userId);
      if (!prevUser) {
        console.log("User not found for update:", userId);
        return res.status(404).json({ error: "User tidak ditemukan" });
      }
      
      // Prepare update fields
      const updateFields = {
        name: name || prevUser.name,
        email: email || prevUser.email,
        phoneNumber: phoneNumber || prevUser.phoneNumber,
        picture: prevUser.picture
      };

      // Check if delete picture was requested
      if (deletePicture === 'true' || deletePicture === true) {
        console.log("Deleting profile picture, setting to temp");
        updateFields.picture = "temp";
      } 
      // Otherwise handle normal picture upload if file exists
      else if (req.file) {
        let retries = 3;
        let pictureId = null;
        // Upload new picture with retry logic
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
      
      // Fix the findByIdAndUpdate call
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true }
      );
      
      if (!updatedUser) {
        console.log("User not found for update:", userId);
        return res.status(404).json({ error: "User tidak ditemukan" });
      }

      return res.status(200).json({ 
        message: `Update profile sukses`,
        user: updatedUser 
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
  const userId = req.user.id; // Get userId from middleware
  
  // Validasi format nomor pembayaran
  if (paymentNumber === undefined || paymentNumber === null) {
  return res.status(400).json({ error: "Nomor pembayaran harus diisi" });
}

// Allow empty string for disconnecting account
if (paymentNumber !== "" && !/^\d{8,16}$/.test(paymentNumber)) {
  return res.status(400).json({ error: "Format nomor pembayaran tidak valid" });
}
  
  try {
    // Get user data first
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found for payment update:", userId);
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    
    // Update payment number
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

  const user = await User.findById( userId );
  console.log("User:", user);
  console.log("Password:", password);
  console.log("New Password:", newPassword);
  console.log("Password Confirmation:", passwordConf);
  const validPassword = await verifyHash( password, user.password );
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

export { getTrendingUsers, getUserInRooms, getUser, updateUserProfile, updatePaymentNumber, changePassword }