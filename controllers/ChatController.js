import dotenv from "dotenv";
import Message from "../models/Message.js";
import { cryptoDecrypt } from "../utils/HashUtils.js";
import Room from "../models/Room.js";

dotenv.config();

const saveTextMessage = async (message) => {
  try {
    const newMessage = new Message({
      roomId: message.roomId,
      senderId: message.senderId,
      content: message.content,
      type: "text"
    });
    await newMessage.save();
    return newMessage;
  } catch (error) {
    console.error("🔥 Gagal save:", error);
    throw new Error("Gagal simpan message.");
  }
}

const getAllMessages = async (roomId) => {
  try {
    const messages = await Message.find({ roomId: roomId }).sort({ time: 1 });
    for (let message of messages) {
      message.content = cryptoDecrypt(message.content, message.iv);
    }
    return messages;
  } catch (error) {
    console.log("🔥 Gagal get message");
    throw new Error("Gagal get message");
  }
}

const createRoom = async (userIds) => {
  try {
    const newRoom = new Room({
      users: [userIds[0], userIds[1]],
    });
    await newRoom.save();
    return newRoom;
  } catch (error) {
    console.log("🔥 Gagal create room");
    throw new Error("Gagal create room");
  }
}

const getRooms = async (userId) => {
  try {
    const roomList = await Room.find({ users: userId });
    return roomList;
  } catch (error) {
    console.log("🔥 Gagal get room");
    throw new Error("Gagal get room");
  }
}

export { saveTextMessage, getAllMessages, createRoom, getRooms };