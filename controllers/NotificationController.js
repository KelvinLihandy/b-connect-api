import dotenv from "dotenv";
import Notification from "../models/Notification.js";
import { cryptoDecrypt, cryptoEncrypt } from "../utils/HashUtils.js";
import Room from "../models/Room.js";
import { drive } from "../config/db.js";
import { uploadSingle } from "../utils/DriveUtil.js";
import { upload } from "../config/multer.js";
import { getUserInRooms } from "./UserController.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

dotenv.config();

let ioPass;
//socket buat bulet merah, service worker buat push
const handleSocketNotification = (socket, io) => {
  ioPass = io;

  socket.on("refresh_notification", () => {
    getAllNotificationsWithData()
  });

  socket.on("view_notification", (notification) => {
    redirectNotification(notification);
  })

  socket.on("send_notification", async () => {
    //pake service worker
  });
};

const getAllNotificationsWithData = async (receiverId) => {
  try {
    const notifications = await Notification.find({ receiverId });
    const notificationsData= await Promise.all(
      notifications.map(async (notification) => {
        let sender = null;
        let roomId = null;
        if (notification.messageType === "chat" && notification.messageId) {
          const message = await Message.findById(notification.messageId)
          roomId = message.roomId;
          sender = await User.findById(message.senderId).select("_id picture name");
        } else {
          sender = {
            _id: "system",
            picture: "",
            name: "System"
          };
        }
        return {
          ...notification.toObject(),
          sender,
          roomId,
        };
      })
    );
    socket.emit("receive_notifications", notificationsData);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    socket.emit("receive_notifications", []);
  }
}

const redirectNotification = async (notification) => {//pass yang dari getnotifwithdata
  if (notification.roomId) {
    await Notification.updateOne(
      { _id: notification.id },
      { read: true, readAt: new Date() }
    );
    
  }
}

export { handleSocketNotification };