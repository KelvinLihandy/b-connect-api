import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from "multer";
import { oauth2Client } from "../config/db.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const drive = google.drive({ version: 'v3', auth: oauth2Client });
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const uploadProfilePicture = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(500).send('Error uploading file');
    }

    const { folderName } = req.body;
    const profileImage = req.file;
    console.log(folderName);

    if (!profileImage) {
      return res.status(400).send('No file uploaded');
    }

    try {
      const folderQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${folderName}' and '${process.env.DRIVE_PROFILEPIC_ID}' in parents`;
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
        name: profileImage.originalname,
        parents: [folderId],
      };

      const media = {
        mimeType: profileImage.mimetype,
        body: fs.createReadStream(profileImage.path),
      };

      const driveFile = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, parents'
      });

      fs.unlinkSync(profileImage.path);

      res.status(200).send(`Profile picture uploaded successfully to Google Drive. File ID: ${driveFile.data.id}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).send('Error uploading file');
    }
  });
};

// const uploadGigImages = async (req, res) => {
//   upload.array('images', 3)(req, res, async (err) => {
//     if (err) {
//       res.status(500).send('Error uploading file');
//     }

//     const { folderName } = req.body;
//     const gigImages = req.files;
//     console.log(folderName);

//     if (!gigImages || gigImages.length === 0) {
//       res.status(400).send('No files uploaded');
//     }

//     try {
//       const folderQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${folderName}' and '${process.env.DRIVE_GIGIMAGE_ID}' in parents`;
//       const folderList = await drive.files.list({
//         q: folderQuery,
//         fields: "files(id, name)",
//       });

//       let folderId;
//       if (folderList.data.files.length > 0) {
//         folderId = folderList.data.files[0].id;
//       } else {
//         const folderMetadata = {
//           name: folderName,
//           mimeType: "application/vnd.google-apps.folder",
//           parents: [process.env.DRIVE_GIGIMAGE_ID],
//         };
//         const folder = await drive.files.create({
//           resource: folderMetadata,
//           fields: "id",
//         });
//         folderId = folder.data.id;
//       }

//       const fileMetadata = {
//         name: profileImage.originalname,
//         parents: [folderId],
//       };

//       const media = {
//         mimeType: profileImage.mimetype,
//         body: fs.createReadStream(profileImage.path),
//       };

//       const driveFile = await drive.files.create({
//         resource: fileMetadata,
//         media: media,
//         fields: 'id, name, mimeType, parents'
//       });

//       fs.unlinkSync(profileImage.path);


//       const uploadedFileLinks = [];
//       for (const gigImage of gigImages) {
//         const fileMetadata = {
//           name: gigImage.originalname,
//           parents: [folderId],
//         };

//         const media = {
//           mimeType: gigImage.mimetype,
//           body: fs.createReadStream(gigImage.path),
//         };

//         const driveFile = await drive.files.create({
//           resource: fileMetadata,
//           media: media,
//           fields: 'id, name, mimeType, parents',
//         });

//         const fileUrl = `https://drive.google.com/file/d/${driveFile.data.id}/view?usp=sharing`;
//         uploadedFileLinks.push(fileUrl);
//       };
//       res.status(200).send(`Profile picture uploaded successfully to Google Drive. File ID: ${driveFile.data.id}`);
//       return uploadedFileLinks;
//     } catch (error) {
//       console.error('Error uploading file:', error);
//       res.status(500).send('Error uploading file');
//     }
//   });
// };
const uploadGigImages = async (files, folderName) => {
  const uploadedFileLinks = [];

  const folderQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${folderName}' and '${process.env.DRIVE_GIGIMAGE_ID}' in parents`;
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
      parents: [process.env.DRIVE_GIGIMAGE_ID],
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

    const fileUrl = `https://drive.google.com/file/d/${driveFile.data.id}/view?usp=sharing`;
    uploadedFileLinks.push(fileUrl);

    fs.unlinkSync(file.path);
  }

  return uploadedFileLinks;
};

export { uploadProfilePicture, uploadGigImages };