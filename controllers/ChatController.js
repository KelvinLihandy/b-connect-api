import dotenv from "dotenv";
import Message from "../models/Message.js";
import { cryptoDecrypt, cryptoEncrypt } from "../utils/HashUtils.js";
import Room from "../models/Room.js";
import { drive } from "../config/db.js";
import { uploadSingle } from "../utils/DriveUtil.js";
import { upload } from "../config/multer.js";
import { getUserInRooms } from "./UserController.js";

dotenv.config();

let ioPass;

const handleSocket = (socket, io) => {
  ioPass = io;
  console.log("enter", socket.id);

  socket.on("create_room", async (userIds) => {
    await createRoom(userIds);
  });

  socket.on("get_rooms", async (userId) => {
    const roomList = await getRooms(userId);
    const userList = await getUserInRooms(userId, roomList);
    socket.emit("receive_rooms", {
      roomList,
      userList
    });
  });

  socket.on("join_room", async (roomId) => {
    socket.join(roomId);
    console.log("user id", socket.id, "join room", roomId);
    const messageList = await getAllMessages(roomId);
    socket.emit("receive_message", messageList);
  });

    socket.on("get_file_data", async (request) => {
      const fileData = await getFileData(request.fileId)
      socket.emit("receive_file_data", fileData);
    })

  socket.on("send_message", async (data) => {
    await saveTextMessage(data);
    const messageList = await getAllMessages(data.roomId);
    console.log(messageList);
    io.to(data.roomId).emit("receive_message", messageList);
  });

  socket.on("disconnect", () => {
    console.log("leave", socket.id);
  });
};

const saveTextMessage = async (message) => {
  try {
    const newMessage = new Message({
      roomId: message.roomId,
      senderId: message.senderId,
      content: message.content,
      type: message.type
    });
    await newMessage.save();
    return newMessage;
  } catch (error) {
    console.error("🔥 Gagal save:", error);
    throw new Error("Gagal simpan message.");
  }
}

const saveFileMessage = [
  upload.single('message_file'),
  async (req, res) => {
    const { roomId, senderId, type } = req.body;
    const messageFile = req.file;

    if (!messageFile) return res.status(400).json({ error: "Error file tidak masuk" });
    try {
      const fileId = await uploadSingle(messageFile, roomId, process.env.DRIVE_ROOM_ID);
      if (!fileId) return res.status(400).json({ error: "Failed to upload the file" });
      const newMessageData = {
        roomId: roomId,
        senderId: senderId,
        content: fileId,
        type: type
      };
      await Message.create(newMessageData);
      const messageList = await getAllMessages(roomId);
      console.log(messageList);
      ioPass.to(roomId).emit("receive_message", messageList);

      return res.status(200).json({ message: `save file message sukses dengan id ${fileId}`, newMessageData })
    } catch (error) {
      console.error("🔥 Gagal save file message:", error);
      return res.status(500).json({ error: "Gagal save file message" });
    }
  }
];

const getAllMessages = async (roomId) => {
  try {
    const messages = await Message.find({ roomId: roomId }).sort({ time: 1 });
    for (let message of messages) {
      message.content = cryptoDecrypt(message.content, message.iv);
    }
    return messages;
  } catch (error) {
    console.log("🔥 Gagal get message", error);
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
    console.log("🔥 Gagal create room", error);
    throw new Error("Gagal create room");
  }
}

const getRooms = async (userId) => {
  try {
    const roomList = await Room.find({ users: userId });
    return roomList;
  } catch (error) {
    console.log("🔥 Gagal get room", error);
    throw new Error("Gagal get room");
  }
}

const formatFileSize = (sizeInBytes) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} bytes`;
  } else if (sizeInBytes < 1048576) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else if (sizeInBytes < 1073741824) {
    return `${(sizeInBytes / 1048576).toFixed(2)} MB`;
  } else {
    return `${(sizeInBytes / 1073741824).toFixed(2)} GB`;
  }
}

const getFileData = async (fileId) => {
  try {
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name, size',
    });
    const fileSize = formatFileSize(fileMetadata.data.size);
    console.log({
      fileName: fileMetadata.data.name,
      fileSize: fileSize
    });
    return {
      fileName: fileMetadata.data.name,
      fileSize: fileSize
    };
  } catch (error) {
    console.error("Error fetching file data:", error);
    throw new Error("Failed to retrieve file data");
  }
};

export { handleSocket, saveTextMessage, saveFileMessage, getAllMessages, createRoom, getRooms, getFileData };