const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-west-2' });
const rekognition = new AWS.Rekognition();
const ffmpeg = require('fluent-ffmpeg');
const fs = require("fs");
const path = require("path");

const detectFrontImageLabels = async (imageBuffer) => {
    const params = {
        Image: {
            Bytes: imageBuffer,
        },
    };

    // Regular expression to match document-related terms, case-insensitive
    const documentRegex = /(id\s?card|license|passport|i\.d\.?\s?card|identity\s?card)/i;

    try {
        const result = await rekognition.detectLabels(params).promise();

        // Extract labels from the response
        const labels = result.Labels.map(label => label.Name);

        // Use regex to check if any label matches the document-related pattern
        const isDocument = labels.some(label => documentRegex.test(label));

        return isDocument; // Returns true if document-like label is found, false otherwise
    } catch (error) {
        // // console.error('Error detecting labels for front image:', error);
        return false;
    }
};

// New function to validate the back image
const detectBackImageLabels = async (imageBuffer) => {
    const params = {
        Image: {
            Bytes: imageBuffer,
        },
    };

    // Regular expressions to match terms related to the back side of official documents (like barcodes, machine-readable zones, etc.)
    const backImageRegex = /(barcode|qr\s?code|machine\s?readable|back\s?side|id\s?card|passport\s?card|magnetic\s?stripe|text\s?zone|data\s?block)/i;

    try {
        const result = await rekognition.detectLabels(params).promise();

        // Extract labels from the response
        const labels = result.Labels.map(label => label.Name);

        // Use regex to check if any label matches the back image-related pattern
        const isBackDocument = labels.some(label => backImageRegex.test(label));

        return isBackDocument; // Returns true if back-related label is found, false otherwise
    } catch (error) {
        // // console.error('Error detecting labels for back image:', error);
        return false;
    }
};

// Validate both front and back images
const validateDocumentImages = async (frontImageBuffer, backImageBuffer) => {
    try {
        const isFrontImageValid = await detectFrontImageLabels(frontImageBuffer.buffer);
        // // console.log(isFrontImageValid);
        const isBackImageValid = await detectBackImageLabels(backImageBuffer.buffer);
        // // console.log(isBackImageValid);

        if (isFrontImageValid && isBackImageValid) {
            // // console.log('Both front and back images are valid official documents.');
            return true;
        } else {
            // // console.log('Either front or back image is invalid or not recognized as an official document.');
            return false;
        }
    } catch (error) {
        // // console.error('Error validating document images:', error);
        return false;
    }
};

// Helper function to extract text from frontImage using Rekognition
const extractTextFromImage = async (imageBuffer) => {
    try {
        const params = {
            Image: {
                Bytes: imageBuffer,
            },
        };

        // Call Rekognition's detectText method to extract text from the image
        const detectTextResponse = await rekognition.detectText(params).promise();

        // Extract all detected text from the response
        const detectedText = detectTextResponse.TextDetections.map((textDetection) => textDetection.DetectedText).join(' ');

        // You can now process or return the extracted text
        return detectedText;
    } catch (error) {
        // // console.error('Error extracting text from image:', error);
        return null; // If text extraction fails, return null
    }
};

// Function to convert video buffer to an image (frame)
const convertVideoToImage = (videoBuffer) => {
    return new Promise((resolve, reject) => {
        // Create a temporary file path for the video and image
        const tempVideoPath = path.join(__dirname, 'temp_video.mp4');
        const tempImagePath = path.join(__dirname, 'output.png');  // The output image path

        // Write the video buffer to a temporary file
        fs.writeFile(tempVideoPath, videoBuffer, (err) => {
            if (err) {
                reject('Error writing video buffer to file: ' + err);
                return;
            }

            // Use ffmpeg to extract a frame from the video file
            ffmpeg(tempVideoPath)
                .outputOptions('-vframes 1') // Extract just one frame
                .outputFormat('image2')      // Output as image
                .output(tempImagePath)      // Output path for the image
                .on('end', () => {
                    // // console.log('Frame extraction complete.');
                    // Read the generated image as a buffer and resolve it
                    fs.readFile(tempImagePath, (err, data) => {
                        if (err) {
                            reject('Error reading extracted image file: ' + err);
                        } else {
                            // Cleanup the temporary video and image files
                            fs.unlinkSync(tempVideoPath);
                            fs.unlinkSync(tempImagePath);
                            resolve(data);  // Return the image buffer
                        }
                    });
                })
                .on('error', (err) => {
                    reject('Error extracting frame from video: ' + err);
                    // Cleanup on error
                    fs.unlinkSync(tempVideoPath);
                })
                .run();
        });
    });
};

// Function to compare the faces in the front image and the video (frame)
const compareFacesInImages = async (frontImage, video) => {
    try {
        if (!frontImage || !frontImage.buffer || !video || !video.buffer) {
            throw new Error('Invalid input: Missing image buffers.');
        }

        // Ensure buffers are within the size limits
        if (frontImage.buffer.length > 5242880 || video.buffer.length > 5242880) {
            throw new Error('Image buffers exceed the 5MB size limit.');
        }

        // Convert video to a single frame image
        const videoFile = await convertVideoToImage(video.buffer);

        // Now you have the frontImage buffer and videoFile (the extracted image buffer) for comparison
        const params = {
            SourceImage: {
                Bytes: frontImage.buffer,
            },
            TargetImage: {
                Bytes: videoFile, // This is the image extracted from the video
            },
            SimilarityThreshold: 80, // Set to 80% or any required threshold
        };

        const compareResponse = await rekognition.compareFaces(params).promise();

        const faceMatches = compareResponse.FaceMatches || [];
        let matchPercentage = 0;
        if (faceMatches.length > 0) {
            matchPercentage = Math.max(...faceMatches.map(match => match.Similarity));
        }
        const isMatch = matchPercentage >= 80;

        let extractedText = await extractTextFromImage(frontImage.buffer);
        if (isMatch) {
            return { match: isMatch, matchPercentage: matchPercentage.toFixed(2), text: extractedText };
        } else {
            return { match: isMatch, matchPercentage: matchPercentage.toFixed(2), text: extractedText };
        }
    } catch (error) {
        // // console.error('Error comparing faces or extracting text:', error);
        return { match: false, text: null };
    }
};

module.exports = { compareFacesInImages, validateDocumentImages };
