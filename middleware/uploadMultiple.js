const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define the maximum file size (in bytes) - for example, 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// Define the path to the uploads folder
const uploadFolder = "assets/uploads/images/";

// Create the uploads folder if it doesn't exist
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder);
    },
    filename: function (req, file, cb) {
        const isoDateString = new Date().toISOString().replace(/[:.-]/g, '');
        cb(null, `${isoDateString}-${file.originalname}`);
    },
});

// File filter to validate file size and type
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Only images are allowed'), false); // Reject the file
    }
};

// Initialize multer with the storage and file filter options
const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE }, // Limit each file to 1MB
    fileFilter: fileFilter,
});

// Middleware function to handle multiple files upload with error handling
const uploadMultiple = (req, res, next) => {
    upload.array("files")(req, res, (error) => { // No file count limit
        if (error) {
            if (error instanceof multer.MulterError) {
                // // console.log(error);
                return res.status(400).json({ error: error.message });
            } else {
                // // console.log(error);
                return res.status(400).json({ error: error.message });
            }
        }
        next();
    });
};

module.exports = {
    uploadMultiple,
};
