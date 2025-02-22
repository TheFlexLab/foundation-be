const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define the maximum file size (in bytes) - for example, 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// Define the path to the uploads folder
const uploadFolder = "assets/uploads/images/";

// Create the uploads folder if it doesn't exist
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true }); // Use recursive: true to create nested directories
}

// Define storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Specify the directory where uploaded files will be stored
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename based on the current timestamp in ISO date string format
    const isoDateString = new Date().toISOString().replace(/[:.-]/g, '');

    // Specify the filename of the uploaded file
    cb(null, `${isoDateString}${path.extname(file.originalname)}`);
  },
});

// File filter to validate file size and type
const fileFilter = (req, file, cb) => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return cb(new Error('File size exceeds the limit of 1MB'), false);
  }

  // Optionally, you can also restrict file types (e.g., only images)
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true); // Accept the file
  } else {
    return cb(new Error('Only images are allowed'), false); // Reject the file
  }
};

// Initialize multer with the storage and file filter options
const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE }, // Limit file size at multer level
  fileFilter: fileFilter // Apply the file filter
});

// Middleware function to handle single file upload with error handling
const uploadSingle = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      // Handle multer errors
      if (error instanceof multer.MulterError) {
        // A multer error occurred when uploading.
        // // console.log(error);
        return res.status(400).json({ error: error.message });
      } else {
        // An unknown error occurred when uploading.
        // // console.log(error);
        return res.status(400).json({ error: error.message });
      }
    }
    next(); // If no error, proceed to the next middleware
  });
};

module.exports = {
  uploadSingle,
};
