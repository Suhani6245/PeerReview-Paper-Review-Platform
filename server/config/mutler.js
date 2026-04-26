const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "peerreview_uploads",
    resource_type: "auto", // IMPORTANT for PDFs
  },
});

const upload = multer({ storage });

module.exports = upload;