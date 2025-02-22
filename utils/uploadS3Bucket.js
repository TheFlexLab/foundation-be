const path = require("path");
const fs = require("fs");
const { Article } = require("../models/Article");

const AWS = require("aws-sdk");
const {
  AWS_S3_ACCESS_KEY,
  AWS_S3_SECRET_ACCESS_KEY,
  AWS_S3_REGION,
  BACKEND_URL,
} = require("../config/env");
const { ArticleSetting } = require("../models/ArticleSetting");

AWS.config.update({
  accessKeyId: AWS_S3_ACCESS_KEY,
  secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
  region: AWS_S3_REGION,
});

const s3 = new AWS.S3();

const bucketName = "foundation-seo";
const region = AWS_S3_REGION;
const accessKeyId = AWS_S3_ACCESS_KEY;
const secretAccessKey = AWS_S3_SECRET_ACCESS_KEY;

const s3Client = new AWS.S3({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const s3ImageUpload = async ({ fileBuffer, fileName, type }) => {
  // Specify the folder name within the S3 bucket
  let folderName = "dynamicImages";

  // Construct the key with the folder name
  const key = `${folderName}/${fileName}`;

  // Configure parameters for uploading to S3
  const params = {
    Bucket: bucketName,
    Key: key, // File name in S3
    Body: fileBuffer, // File data in S3 Object
    ContentType: "image/png",
  };

  try {
    const data = await s3Client.upload(params).promise(); // Use promise-based API
    if (type === "wrapcast") {
      return {
        imageName: fileName,
        s3Url: `https://${bucketName}.s3.amazonaws.com/${folderName}/${fileName}`,
        type: "wrapcast",
      };
    } else {
      return {
        imageName: fileName,
        s3Url: `https://${bucketName}.s3.amazonaws.com/${folderName}/${fileName}`,
        type: "foundation",
      };
    }
  } catch (error) {
    // // console.error("Error uploading file to S3:", error);
    throw error; // Re-throw the error for handling in the calling function
  }
};

const uploadS3Bucket = async ({
  fileName,
  description,
  route,
  title,
  serviceType,
  uniqueLinkArticle,
  wrapcastImage,
  domainS3Urls,
  farcasterSupport,
}) => {
  const metaTags = {
    // title: "Foundation",
    type: "website",
    url: "https://on.foundation",
    image: "https://foundation-seo.s3.amazonaws.com/seo-logo-v2.png",
    image16x9: "https://foundation-seo.s3.amazonaws.com/article/image16x9.png",
    image4x3: "https://foundation-seo.s3.amazonaws.com/article/image4x3.png",
    image1x1: "https://foundation-seo.s3.amazonaws.com/article/image1x1.png",
  };
  const { type, url, image, image16x9, image4x3, image1x1 } = metaTags;
  let params;
  if (serviceType === "delete") {
    params = {
      Bucket: "foundation-seo",
      Key: `${route}/${fileName}.html`,
      Body: `
          <\!DOCTYPE html>
          <html lang="en">
          <head>
                  <!-- --------------------------------------------------------------------------------------------- -->
          <title>Foundation</title>
          <meta name="title" content="Foundation" />
          <meta name="description" content="A revolutionary new social platform. Own your data. Get rewarded." />

          <!-- Open Graph / Facebook -->
          <meta property="og:type" content="article" />
          <meta property="og:url" content="https://on.foundation" />
          <meta property="og:title" content="Foundation" />
          <meta property="og:description" content="A revolutionary new social platform. Own your data. Get rewarded." />
          <meta property="og:image" content="https://foundation-seo.s3.amazonaws.com/seo-logo-v2.png" />

          <!-- Twitter -->
          <meta name="twitter:card" content="summary_large_image"> 
          <meta property="twitter:url" content="https://on.foundation" />
          <meta name="twitter:title" content="Foundation" />
          <meta name="twitter:description" content="A revolutionary new social platform. Own your data. Get rewarded." />
          <meta name="twitter:image" content="https://foundation-seo.s3.amazonaws.com/seo-logo-v2.png" />

          <!-- Farcaster meta tags -->
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://foundation-seo.s3.amazonaws.com/seo-logo-v2.png" />
          <meta property="fc:frame:button:1" content="Explore Foundation" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="https://on.foundation" />
          </head>
          <body>
              <p>Hello from Lambda@Edge!</p>
          </body>
          </html>
          `,
      ContentType: "text/html",
    };
  } else if (serviceType === "articles") {
    let article;
    if (uniqueLinkArticle === "true") {
      const articleSettings = await ArticleSetting.findOne({
        uniqueLink: fileName,
      });
      article = await Article.findOne({
        _id: articleSettings.articleId,
      });
    } else {
      article = await Article.findOne({
        _id: fileName,
      });
    }
    params = {
      Bucket: "foundation-seo",
      Key: `${route}/${fileName}.html`,
      Body: `
            <\!DOCTYPE html>
            <html lang="en">
            <head>
                    <meta charset="utf-8">
                    <title>${title}</title>
                    <meta name="title" content="${title}" />
                    <meta name="description" content="${description}" />
            
                    <!-- Open Graph / Facebook -->
                    <meta property="og:type" content="article" />
                    <!-- <meta property="og:url" content="${url}" /> -->
                    <meta property="og:title" content="${title}" />
                    <meta property="og:description" content="${description}" />
  
                    <!-- 16:9 Image -->
                    <meta property="og:image" content="${article?.s3Urls[0] ? article?.s3Urls[0] : image
        }" />
                    <meta property="og:site_name" content="ON.FOUNDATION" />
                    <meta property="article:author" content="Breaking News" />

                    <!-- Add publication date for Open Graph -->
                    <meta property="article:published_time" content="${article.createdAt.toISOString()}" />
  
  
                    <!-- Twitter -->
                   <meta name="twitter:card" content="summary_large_image">
                    <meta property="twitter:url" content="${url}" />
                    <meta name="twitter:title" content="${title}" />
                    <meta name="twitter:description" content="${description}" />
  
                    <!-- 16:9 Image -->
                    <meta name="twitter:image" content="${article?.s3Urls[0] ? article?.s3Urls[0] : image
        }" />
                    <meta name="twitter:site" content="@ON.FOUNDATION">
                    <meta name="twitter:creator" content="@Breaking News" />

                    <!-- Add publication date for Twitter -->
                    <meta name="article:published_time" content="${article.createdAt.toISOString()}" />
                   
    
            </head>
            <body>
                <p>Hello from Lambda@Edge!</p>
            </body>
            </html>
            `,
      ContentType: "text/html",
    };
  } else if (serviceType === "homepage") {
    const currentTimestamp = new Date()
      .toISOString()
      .replace(/[-:.]/g, "")
      .slice(0, 14);
    const fileNameWithTimestamp = `${fileName}_${currentTimestamp}`;

    // Step 1: List objects in the specified route
    const listParams = {
      Bucket: "foundation-seo",
      Prefix: `${route}/`, // List files under the route directory
    };

    const listedObjects = await s3.listObjectsV2(listParams).promise();

    // Step 2: Find the file(s) containing `fileName`
    const matchingFiles = listedObjects.Contents.filter((file) =>
      file.Key.includes(`${fileName}_`)
    );

    if (matchingFiles.length > 0) {
      // Step 3: Delete the matching file(s)
      for (const file of matchingFiles) {
        const deleteParams = {
          Bucket: "foundation-seo",
          Key: file.Key,
        };
        await s3.deleteObject(deleteParams).promise();
        // // console.log(`Deleted file: ${file.Key}`);
      }
    }

    params = {
      Bucket: "foundation-seo",
      Key: `${route}/${fileNameWithTimestamp}.html`,
      Body: `
            <\!DOCTYPE html>
            <html lang="en">
            <head>
                    <meta charset="utf-8">
                    <title>${title}</title>
                    <meta name="title" content="${title}" />
                    <meta name="description" content="${description}" />
            
                    <!-- Open Graph / Facebook -->
                    <meta property="og:type" content="article" />
                    <!-- <meta property="og:url" content="https://${fileName}.on.foundation" /> -->
                    <meta property="og:title" content="${title}" />
                    <meta property="og:description" content="${description}" />
  
                    <!-- 16:9 Image -->
                    <meta property="og:image" content="${domainS3Urls[1]}" />
                    <meta property="og:site_name" content="${fileName.toUpperCase()}.ON.FOUNDATION" />

  
                    <!-- Twitter -->
                   <meta name="twitter:card" content="summary_large_image">
                    <meta property="twitter:url" content="https://${fileName}.on.foundation" />
                    <meta name="twitter:title" content="${title}" />
                    <meta name="twitter:description" content="${description}" />
  
                    <!-- 16:9 Image -->
                    <meta name="twitter:image" content="${domainS3Urls[1]}" />
                    <meta name="twitter:site" content="@${fileName.toUpperCase()}.ON.FOUNDATION"> 
            </head>
            <body>
                <p>Hello from Lambda@Edge!</p>
            </body>
            </html>
            `,
      ContentType: "text/html",
    };
  } else {
    let farcasterMetaTags = `
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="https://foundation-seo.s3.amazonaws.com/farcasterSupport.png" />
      <meta property="fc:frame:button:1" content="Explore Foundation" />
      <meta property="fc:frame:button:1:action" content="link" />
      <meta property="fc:frame:button:1:target" content="https://on.foundation" />
      `;
    if (farcasterSupport) {
      farcasterMetaTags = `
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${wrapcastImage}" />
      <meta property="fc:frame:button:1" content="View Results" />
      <meta property="fc:frame:button:2" content="Participate" />
      <meta property="fc:frame:button:3" content="View On Foundation" />
      <meta property="fc:frame:button:3:action" content="link" />
      <meta property="fc:frame:button:3:target" content="https://on.foundation/p/${fileName}" />
      <meta property="fc:frame:post_url" content="${BACKEND_URL}/startQuest/submitThroughFrames?link=${fileName}" /> `;
    }
    params = {
      Bucket: "foundation-seo",
      Key: `${route}/${fileName}.html`,
      Body: `
          <\!DOCTYPE html>
          <html lang="en">
          <head>
                  <meta charset="utf-8">
                  <title>${title}</title>
                  <meta name="title" content='${title}' />
                  <meta name="description" content="${description}" />
          
                  <!-- Open Graph / Facebook -->
                  <meta property="og:type" content="article" />
                  <!-- <meta property="og:url" content="${url}" /> -->
                  <meta property="og:title" content='${title}' />
                  <meta property="og:description" content="${description}" />
                  <meta property="og:image" content="${image}" />

          
                  <!-- Twitter -->
                  <meta name="twitter:card" content="summary_large_image">
                  <meta property="twitter:url" content="${url}" />
                  <meta name="twitter:title" content='${title}' />
                  <meta name="twitter:description" content="${description}" />
                  <meta name="twitter:image" content="${image}" />
      
                    <!-- Farcaster meta tags -->
                  ${farcasterMetaTags}
          </head>
          <body>
              <p>Hello from Lambda@Edge!</p>
          </body>
          </html>
          `,
      ContentType: "text/html",
    };
  }
  try {
    return new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) {
          // // console.error("Error uploading HTML to S3:", err);
          reject(err);
        } else {
          // Return based on web3type
          if (serviceType === "wrapcast") {
            resolve({
              imageName: fileName + ".html",
              s3Url: `https://foundation-seo.s3.amazonaws.com/${route}/${fileName}.html`,
              type: "wrapcast",
            });
          } else {
            resolve(true);
          }
        }
      });
    });
  } catch (error) {
    // // console.error(error);
    throw error;
  }
};

/**
 * Upload a single file to S3
 * @param {string} filePath - The path to the local file
 * @param {string} folderName - The folder name in S3
 * @returns {Promise} - A promise that resolves with the S3 file URL
 */
const uploadFileToS3 = (filePath, folderName) => {
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const params = {
    Bucket: bucketName,
    Key: `${folderName}/${fileName}`, // Store file in a folder named after folderName
    Body: fileContent,
    ContentType: "image/jpeg", // Set the correct content type based on your file type
  };

  return s3.upload(params).promise();
};

/**
 * Upload a single file to S3
 * @param {string} filePath - The path to the local file
 * @param {string} folderName - The folder name in S3
 * @returns {Promise} - A promise that resolves with the S3 file URL
 */
const uploadFileToS3FromBuffer = (fileBuffer, fileName, folderName) => {
  const params = {
    Bucket: bucketName,
    Key: `${folderName}/${fileName}`, // Store file in a folder named after folderName
    Body: fileBuffer,
    ContentType: "image/jpeg", // Set the correct content type based on your file type
  };

  return s3.upload(params).promise();
};

/**
 * Upload all files in a directory to S3
 * @param {string} directoryPath - The local directory path containing files to upload
 * @param {string} folderName - The folder name in S3
 * @returns {Promise} - A promise that resolves with an array of S3 file URLs
 */
const uploadDirectoryToS3 = async (directoryPath, folderName) => {
  const files = fs.readdirSync(directoryPath);

  const uploadPromises = files.map((file) => {
    const filePath = path.join(directoryPath, file);
    if (MODE === "PROD") {
      return uploadFileToS3(filePath, folderName);
    }
    else {
      return null;
    }
  });

  // Wait for all uploads to complete
  const uploadResults = await Promise.all(uploadPromises);

  // Return an array of the S3 URLs of uploaded files
  return uploadResults.map((result) => result.Location);
};

/**
 * Delete a specific subfolder in S3
 * @param {string} folderName - The specific folder name to delete under the article directory
 * @returns {Promise} - A promise that resolves when the folder is deleted
 */
const deleteDirectoryFromS3 = async (folderName) => {
  const listParams = {
    Bucket: bucketName,
    Prefix: `${folderName}/`, // Prefix to list objects under the specified folder
  };

  try {
    const listedObjects = await s3.listObjectsV2(listParams).promise();

    if (listedObjects.Contents.length === 0) {
      // // console.log(`No objects found in folder: ${folderName}`);
      return; // Nothing to delete
    }

    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: listedObjects.Contents.map((obj) => ({ Key: obj.Key })),
      },
    };

    await s3.deleteObjects(deleteParams).promise();
    // // console.log(`Deleted folder: ${folderName}`);
  } catch (error) {
    // // console.error(`Error deleting folder ${folderName}:`, error);
  }
};

// Function to extract the key from an S3 URL
function getKeyFromS3Url(s3Url) {
  const url = new URL(s3Url);
  return url.pathname.substring(1); // Remove the leading '/'
}

const deleteFileFromS3 = async (s3Url) => {
  const key = getKeyFromS3Url(s3Url); // Extract key from URL
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  try {
    await s3.deleteObject(params).promise();
  } catch (error) {
    // // console.error(`Error deleting folder ${folderName}:`, error);
  }
};

const deleteHtmlFiles = async () => {
  try {
    // List objects in the `static_pages` directory
    const { Contents } = await s3
      .listObjectsV2({
        Bucket: bucketName,
        Prefix: 'static_pages/',
      })
      .promise();

    if (!Contents || Contents.length === 0) {
      // // console.log('No files found in the specified directory.');
      return;
    }

    // Filter for .html files
    const htmlFiles = Contents.filter((item) => item.Key.endsWith('.html'));

    if (htmlFiles.length === 0) {
      // // console.log('No .html files found.');
      return;
    }

    // Prepare the list of files to delete
    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: htmlFiles.map((file) => ({ Key: file.Key })),
      },
    };

    // Delete the .html files
    const deleteResult = await s3.deleteObjects(deleteParams).promise();
    // // console.log('Deleted files:', deleteResult.Deleted);
    return deleteResult ? true : false;
  } catch (error) {
    // // console.error('Error deleting .html files:', error);
  }
};

module.exports = {
  uploadS3Bucket,
  s3ImageUpload,
  uploadFileToS3,
  uploadDirectoryToS3,
  deleteDirectoryFromS3,
  uploadFileToS3FromBuffer,
  deleteFileFromS3,
  deleteHtmlFiles,
};
