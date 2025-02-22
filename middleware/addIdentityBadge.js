const multer = require('multer');

// Function to create multer upload configuration
const createUploadMiddleware = (fields) => {
    const storage = multer.memoryStorage(); // Using memory storage (you can change to diskStorage if needed)

    const upload = multer({
        storage: storage,
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
        fileFilter: (req, file, cb) => {
            const fileTypes = /jpeg|jpg|png|mp4/;
            const extname = fileTypes.test(file.originalname.toLowerCase());
            const mimeType = fileTypes.test(file.mimetype);
            if (extname && mimeType) {
                return cb(null, true);
            }
            cb(new Error('Only images (jpg, jpeg, png) and videos (mp4) are allowed.'));
        },
    });

    return upload.fields(fields);
};

// Predefined file field configuration for your use case
const identityFilesConfig = [
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'video', maxCount: 1 },
];

// Export the function and predefined config
module.exports = {
    createUploadMiddleware,
    identityFilesConfig,
};
