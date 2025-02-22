const multer = require("multer");
const path = require("path");

// Define the maximum file size (in bytes) - for example, 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// Define storage for uploaded files using memoryStorage
const storage = multer.memoryStorage();

// File filter to validate file type
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

// Initialize multer with memoryStorage and file filter options
const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE }, // Limit each file to 1MB
    fileFilter: fileFilter,
});

// Middleware function to handle multiple files upload with buffers
const uploadMultipleBuffers = (req, res, next) => {
    upload.array("files")(req, res, (error) => {
        if (error) {
            if (error instanceof multer.MulterError) {
                // // console.log(error);
                return res.status(400).json({ error: error.message });
            } else {
                // // console.log(error);
                return res.status(400).json({ error: error.message });
            }
        }

        // `req.files[]` now contains buffers for the uploaded files
        req.files = req.files.map(file => ({
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer, // Store the file content as a buffer
        }));

        next();
    });
};

module.exports = {
    uploadMultipleBuffers,
};
