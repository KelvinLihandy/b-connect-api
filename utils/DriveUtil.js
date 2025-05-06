import fs from "fs";
import { drive } from "../config/db.js";

const uploadSingle = async (file, folderName, parentFolderId) => {
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
  return driveFile.data.id; 
}

const uploadMultiple = async (files, folderName, parentFolderId) => {
  const uploadedFileIds = [];

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
    uploadedFileIds.push(driveFile.data.id);

    fs.unlinkSync(file.path);
  }

  return uploadedFileIds;
};

export { uploadSingle, uploadMultiple };