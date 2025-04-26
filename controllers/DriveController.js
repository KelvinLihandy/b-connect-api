import fs from "fs";
import { drive } from "../config/db.js";

const uploadSingleImage = async (file, folderName, parentFolderId) => {
  const folderQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${folderName}' and '${parentFolderId}' in parents`;
  const folderList = await drive.files.list({
    q: folderQuery,
    fields: "files(id, name)",
  });
  let folderId;
  if (folderList.data.files.length > 0) {
    folderId = folderList.data.files[0].id;
  } else {
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [process.env.DRIVE_PROFILEPIC_ID],
    };
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: "id",
    });
    folderId = folder.data.id;
  }
  const fileMetadata = {
    name: file.originalname,
    parents: [folderId],
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.path),
  };

  const driveFile = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, mimeType, parents'
  });

  fs.unlinkSync(file.path);
  return `https://drive.google.com/thumbnail?id=${driveFile.data.id}`; 
}

const uploadMultipleImage = async (files, folderName, parentFolderId) => {
  const uploadedFileLinks = [];

  const folderQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${folderName}' and '${parentFolderId}' in parents`;
  const folderList = await drive.files.list({
    q: folderQuery,
    fields: "files(id, name)",
  });

  let folderId;
  if (folderList.data.files.length > 0) {
    folderId = folderList.data.files[0].id;
  } else {
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: "id",
    });
    folderId = folder.data.id;
  }

  for (const file of files) {
    const fileMetadata = {
      name: file.originalname,
      parents: [folderId],
    };

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    const driveFile = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, name',
    });
    const fileUrl = `https://drive.google.com/thumbnail?id=${driveFile.data.id}`;
    uploadedFileLinks.push(fileUrl);

    fs.unlinkSync(file.path);
  }

  return uploadedFileLinks;
};

export { uploadSingleImage, uploadMultipleImage };