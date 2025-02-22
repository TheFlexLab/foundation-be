const multer = require("multer");
const path = require("path");

// Initialize multer with memory storage to store files as buffers
const storage = multer.memoryStorage();

// File filter to validate file type (if needed)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only images are allowed"), false); // Reject the file
  }
};

// Initialize multer with memory storage and file filter
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

// Middleware to handle multiple files with specific field names
const uploadMultiBuffersInline = upload.fields([
  { name: "file1x1", maxCount: 1 }, // File for 1x1 aspect ratio
  { name: "file16x9", maxCount: 1 }, // File for 16x9 aspect ratio
  { name: "originalFile", maxCount: 1 }, // File for 16x9 aspect ratio
]);

module.exports = {
  uploadMultiBuffersInline,
};
