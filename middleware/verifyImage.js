const multer = require('multer');

// Function to create multer upload configuration
const verifyImage = (fields) => {
    const storage = multer.memoryStorage(); // Using memory storage (you can change to diskStorage if needed)

    const upload = multer({
        storage: storage,
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
        fileFilter: (req, file, cb) => {
            const fileTypes = /jpeg|jpg|webp|png/;
            const extname = fileTypes.test(file.originalname.toLowerCase());
            const mimeType = fileTypes.test(file.mimetype);
            if (extname && mimeType) {
                return cb(null, true);
            }
            cb(new Error('Only images (jpg, jpeg, png, webp) are allowed.'));
        },
    });

    // Allow only a single file upload for the 'file' field
    return upload.fields(fields);
};

// Predefined file field configuration for your use case (allowing one image file)
const identityFilesConfig = [
    { name: 'file', maxCount: 1 }  // Adjust field name as per your needs
];

// Export the function and predefined config
module.exports = {
    verifyImage,
    identityFilesConfig,
};
