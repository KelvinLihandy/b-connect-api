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
let socketMap;

const handleSocketNotification = (socket, io, userSocketMap) => {
  ioPass = io;
  socketMap = userSocketMap;

  socket.on("retrieve_notifications", (receiverid) => {
    getAllNotificationsWithData(receiverid, socket)
  });

  socket.on("view_notification", (notification) => {
    redirectNotification(notification, socket);
  });

  socket.on("read_all_notification", (userId) => {
    readAllNotification(userId, socket);
  })
};

const getAllNotificationsWithData = async (receiverId, socket) => {
  try {
    const notifications = await Notification.find({ receiverId }).sort({ receivedTime: 1 });
    const notificationsData = await Promise.all(
      notifications.map(async (notification) => {
        let sender = null;
        let roomId = null;
        let message = null;
        if (notification.messageType === "chat" && notification.messageId) {
          message = await Message.findById(notification.messageId);
          message.content = cryptoDecrypt(message.content, message.iv);
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
          messageId: undefined,
          message,
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

const redirectNotification = async (notification, socket) => {
  if (notification.roomId) {
    await Notification.updateOne(
      { _id: notification._id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    const url = `/chat/${notification.message.roomId}`;
    socket.emit("redirect_notification", url);
  }
}

const sendNotification = async (data) => {
  if (data.roomId) {
    const room = await Room.findById(data.roomId);
    const receiverId = room.users.find(id => id !== data.senderId);
    const notification = {
      receiverId,
      messageId: data._id,
      messageType: "chat",
    }
    const newNotification = await Notification.create(notification);
    newNotification.save();
    const socketId = socketMap ? socketMap[receiverId] : null;
    if (socketId) {
      await getAllNotificationsWithData(receiverId, socketId);
      ioPass.to(socketId).emit('receive_notifications', newNotification);//pass array
      console.log(`Notifikasi terkirim ke id ${receiverId}`);
    }
    else console.log(`User ${receiverId} tidak online`);
  }
}

const readAllNotification = async (userId, socket) => {
  const notifications = await Notification.find({ receiverId: userId });
  await Promise.all(
    notifications.map((n) =>
      Notification.findByIdAndUpdate(
        n._id,
        { read: true, readAt: new Date() },
        { new: true })
    )
  );
  await getAllNotificationsWithData(userId, socket);
}

export { handleSocketNotification, sendNotification };