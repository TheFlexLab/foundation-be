const { Article } = require("../models/Article");
const mongoose = require("mongoose");
const {
  uploadS3Bucket,
  uploadDirectoryToS3,
  deleteDirectoryFromS3,
} = require("../utils/uploadS3Bucket");
const sharp = require("sharp");
sharp.cache({ files: 0 }); // Disable file caching
const path = require("path");
const fs = require("fs");
const shortLink = require("shortlink");
const WeeklySent = require("../models/WeeklySent");
const { ArticleSetting } = require("../models/ArticleSetting");
const UserModel = require("../models/UserModel");
const { notificationGuest1 } = require("../notifications/guest");
const { notificationVisitor1 } = require("../notifications/visitor");
const { MODE } = require("../config/env");

const getArticles = async (req, res) => {
  let {
    _page = 1,
    _limit = 5,
    sort = "Newest First",
    terms = "",
    email = "false",
    pageType = "false",
    uuid,
  } = req.query;
  if (
    req.query.domain !== "null" &&
    req.query.domain !== "undefined" &&
    req.query.domain !== null &&
    req.query.domain !== undefined &&
    req.query.domain
  ) {
    let user = await UserModel.findOne({
      badges: {
        $elemMatch: {
          "domain.name": req.query.domain,
          domain: { $exists: true, $ne: null }, // Ensure domain exists and is not null
        },
      },
    });
    uuid = user?.uuid;
  }

  const page = parseInt(_page);
  const limit = parseInt(_limit);
  const skip = (page - 1) * limit;

  try {
    // Build query object
    const query = {
      isActive: true,
    };

    if (pageType === "sharedArticles" && uuid) {
      // Retrieve ArticleSettings
      let articleSettings;
      if (req.query.domain && req.query.isPublicProfile === "true") {
        articleSettings = await ArticleSetting.find({
          userUuid: uuid,
          uniqueLink: { $ne: "" },
          isEnable: true,
        })
          .skip(skip)
          .limit(limit);
      } else {
        articleSettings = await ArticleSetting.find({
          userUuid: uuid,
          uniqueLink: { $ne: "" },
        })
          .skip(skip)
          .limit(limit);
      }

      // Extracting articleIds from the results
      const articleIds = articleSettings.map((setting) => setting.articleId);

      // Build the base query with articleIds
      const query = {
        _id: { $in: articleIds },
      };

      // Add search terms if provided
      if (terms) {
        query.$or = [
          { title: { $regex: terms, $options: "i" } },
          { content: { $regex: terms, $options: "i" } },
        ];
      }

      // Find articles based on query with pagination
      const articles = await Article.find(query);

      // Combine the ArticleSettings with the Articles
      const combinedResults = articles.map((article) => {
        // Find the corresponding ArticleSetting for each article
        const setting = articleSettings.find(
          (setting) => setting.articleId.toString() === article._id.toString()
        );
        return {
          ...article._doc,
          articleSetting: setting || null, // Attach the ArticleSetting if it exists
        };
      });

      // Check if there is a next page
      const totalArticles = await Article.countDocuments({
        _id: { $in: articleIds },
      });

      const hasNextPage = page * limit < totalArticles; // Check if the next page exists

      // Return the combined results along with pagination info
      return res.status(200).json({
        data: combinedResults,
        hasNextPage: hasNextPage, // Flag indicating if the next page exists
      });
    }

    // Add search terms if provided
    if (terms) {
      query.$or = [
        { title: { $regex: terms, $options: "i" } },
        { content: { $regex: terms, $options: "i" } },
      ];
    }

    // Sorting logic
    let sortOptions = {};
    if (sort === "Newest First") {
      sortOptions = { createdAt: -1 };
    } else if (sort === "Oldest First") {
      sortOptions = { createdAt: 1 };
    } else if (sort === "Most Popular") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.createdAt = { $gte: sevenDaysAgo };
    }

    let articles;
    let hasNextPage;
    // Fetch the articles with pagination, sorting, and filtering
    if (email === "true") {
      // Get the current date and the date from seven days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Retrieve the `recentWeekNewsIds` array from the database
      const weeklySentRecord = await WeeklySent.findOne();
      let recentWeekNewsIds = weeklySentRecord
        ? weeklySentRecord.recentWeekNewsIds
        : [];

      // Find articles from the last seven days, excluding those in `recentWeekNewsIds`
      const articles = await Article.find({
        createdAt: { $gte: sevenDaysAgo }, // Filter for articles created in the last seven days
        _id: { $nin: recentWeekNewsIds }, // Exclude articles already sent
        // Add any additional filters if necessary, e.g., isActive: true
      })
        .sort({ createdAt: -1 }) // Optional sorting by creation date or any criteria
        .limit(5); // Limit to 5 unique articles

      // Get the new article IDs and update `recentWeekNewsIds` in the database
      const newArticleIds = articles.map((article) => article._id);
      recentWeekNewsIds = [...recentWeekNewsIds, ...newArticleIds];

      // Update `recentWeekNewsIds` in the database
      await WeeklySent.updateOne(
        {}, // Assuming a single document, update without a filter
        { $set: { recentWeekNewsIds } },
        { upsert: true } // Create the document if it doesn't exist
      );

      return res.status(200).json({
        data: articles.length > 0 ? articles : [],
      });
    } else {
      articles = await Article.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

      // Extract article IDs from the articles retrieved
      const articleIds = articles.map((article) => article._id);

      // Retrieve ArticleSettings for the fetched articles
      const articleSettings = await ArticleSetting.find({
        userUuid: uuid,
        articleId: { $in: articleIds }, // Match against the article IDs
      });

      // Create a map of ArticleSettings for quick lookup
      const settingsMap = articleSettings.reduce((map, setting) => {
        map[setting.articleId.toString()] = setting; // Keyed by articleId
        return map;
      }, {});

      // Combine ArticleSettings with Articles
      articles = articles.map((article) => {
        const setting = settingsMap[article._id.toString()]; // Lookup in the map
        return {
          ...article.toObject(), // Spread the article document
          articleSetting: setting || null, // Attach the ArticleSetting if it exists
        };
      });

      hasNextPage = page * limit < (await Article.countDocuments()); // Check if the next page exists

      const viewerUser = await UserModel.findOne({ uuid: uuid });
      if (!viewerUser)
        return res
          .status(404)
          .json({ message: `User with ${uuid}, not found` });

      if (!hasNextPage && articles.length > 0) {
        if (viewerUser.role === "guest") articles.push(notificationGuest1);
        if (viewerUser.role === "visitor") articles.push(notificationVisitor1);
      }
    }

    res.status(200).json({ data: articles, hasNextPage: hasNextPage });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Get article by userUuid (using POST)
const getArticlesUserUuid = async (req, res) => {
  try {
    const { userUuid } = req.body;
    const article = await Article.find({ userUuid: userUuid, isActive: true });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.status(200).json(article);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Get article by id (using POST)
const getArticleById = async (req, res) => {
  try {
    const { id, userUuid } = req.query;

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const articleSetting = await ArticleSetting.findOneAndUpdate(
        { articleId: id, userUuid: userUuid },
        { $inc: { viewCount: 1 } },
        { new: true }
      );
      const article = await Article.findOneAndUpdate(
        { _id: id }, // Query to find the article by its _id
        { $inc: { viewCount: 1 } }, // Increment the viewCount by 1
        { new: true, timestamps: false } // Return the updated document
      );

      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      return res
        .status(200)
        .json({ ...article._doc, articleSetting: articleSetting });
    } else {
      const articleSetting = await ArticleSetting.findOneAndUpdate(
        { uniqueLink: id },
        { $inc: { viewCount: 1 } },
        { new: true }
      );
      if (!articleSetting) {
        return res
          .status(404)
          .json({ status: false, message: "Link not found." });
      }

      if (!articleSetting.isEnable) {
        return res
          .status(404)
          .json({ status: false, message: "This link is not active." });
      }

      const article = await Article.findOneAndUpdate(
        { _id: articleSetting.articleId }, // Query to find the article by its _id
        { $inc: { viewCount: 1 } }, // Increment the viewCount by 1
        { new: true, timestamps: false } // Return the updated document
      );

      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      return res
        .status(200)
        .json({ ...article._doc, articleSetting: articleSetting });
    }

    return res.status(400).json({ message: "Invalid id parameter" });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Create new article
const createArticle = async (req, res) => {
  const {
    userUuid,
    prompt,
    source,
    suggestions,
    title,
    abstract,
    groundBreakingFindings,
    discussion,
    conclusion,
    seoSummary,
    settings,
    articleId,
  } = req.body;

  try {
    // Check if an article with the same title already exists
    const existingArticle = await Article.findOne({ _id: articleId });

    if (existingArticle) {
      const rePublishArticle = await Article.findOneAndUpdate(
        { _id: articleId },
        {
          userUuid,
          prompt,
          source: JSON.parse(source),
          suggestions: JSON.parse(suggestions),
          title,
          abstract,
          groundBreakingFindings: JSON.parse(groundBreakingFindings),
          discussion,
          conclusion,
          seoSummary,
          settings: JSON.parse(settings),
        },
        { new: true }
      );
      if (!rePublishArticle) throw new Error("Article could not be published.");
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: rePublishArticle._id,
          description: rePublishArticle.seoSummary,
          route: "static_pages/articles",
          title: rePublishArticle.title,
          serviceType: "articles",
        });
      }
      rePublishArticle.linkGenerated = true;
      if (req.file) {
        const articleId = rePublishArticle._id.toString();
        if (articleId === null || articleId === undefined)
          throw new Error(
            "Please provide article you wannt to upload image for."
          );
        const folderName = articleId;
        // Store the uploaded file path
        const filePath = req.file.path;
        const outputDir = path.join(__dirname, folderName);

        // Ensure the uploads directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate filenames for resized images
        const fileName = path.basename(filePath, path.extname(filePath));
        const ext = path.extname(filePath);

        // Image Processing
        const isoDateString = new Date().toISOString().replace(/[:.-]/g, "");
        const output16x9 = path.join(outputDir, `${isoDateString}-16x9${ext}`);
        const output4x3 = path.join(outputDir, `${isoDateString}-4x3${ext}`);
        const output1x1 = path.join(outputDir, `${isoDateString}-1x1${ext}`);

        // Save the image directly without resizing
        await Promise.all([
          // Save with 16:9 aspect ratio filename
          sharp(filePath).toFile(output16x9),

          // Save with 4:3 aspect ratio filename
          sharp(filePath).toFile(output4x3),

          // Save with 1:1 aspect ratio filename
          sharp(filePath).toFile(output1x1),
        ]);

        // Cropped one
        // Resize the image to different aspect ratios using sharp
        // await Promise.all([
        //   // 16:9 aspect ratio (e.g., 1600x900)
        //   sharp(filePath)
        //     .resize({ width: 1600, height: 900 })
        //     .toFile(output16x9),

        //   // 4:3 aspect ratio (e.g., 1200x900)
        //   sharp(filePath)
        //     .resize({ width: 1200, height: 900 })
        //     .toFile(output4x3),

        //   // 1:1 aspect ratio (e.g., 1000x1000)
        //   sharp(filePath)
        //     .resize({ width: 1000, height: 1000 })
        //     .toFile(output1x1),
        // ]);

        const s3RootFolder = `article/${folderName}`;
        MODE === "PROD" && await deleteDirectoryFromS3(s3RootFolder);
        // Upload the directory with resized images to S3
        const s3Urls = MODE === "PROD" ? await uploadDirectoryToS3(outputDir, s3RootFolder) : "";

        // Delay before deleting the original file from the filesystem after resizing
        fs.unlink(filePath, (err) => {
          if (err) {
            // console.error(`Error deleting file: ${filePath}`, err);
          } else {
            // console.log(`File deleted: ${filePath}`);
          }
        });

        // Delete the output directory and its contents using fs.rm
        await fs.promises.rm(outputDir, { recursive: true });
        // console.log(`Directory deleted: ${outputDir}`);

        rePublishArticle.s3Urls = s3Urls;
        await rePublishArticle.save();
        if (MODE === "PROD") {
          await uploadS3Bucket({
            fileName: rePublishArticle._id,
            description: rePublishArticle.seoSummary,
            route: "static_pages/articles",
            title: rePublishArticle.title,
            serviceType: "articles",
          });
        }
      }
      await rePublishArticle.save();
      return res.status(201).json(rePublishArticle);
    }

    // Create new article if no duplicate is found
    const newArticle = new Article({
      userUuid,
      prompt,
      source: JSON.parse(source),
      suggestions: JSON.parse(suggestions),
      title,
      abstract,
      groundBreakingFindings: JSON.parse(groundBreakingFindings),
      discussion,
      conclusion,
      seoSummary,
      settings: JSON.parse(settings),
    });
    const savedArticle = await newArticle.save();
    if (MODE === "PROD") {
      await uploadS3Bucket({
        fileName: savedArticle._id,
        description: savedArticle.seoSummary,
        route: "static_pages/articles",
        title: savedArticle.title,
        serviceType: "articles",
      });
    }
    savedArticle.linkGenerated = true;
    if (req.file) {
      const articleId = savedArticle._id.toString();
      if (articleId === null || articleId === undefined)
        throw new Error(
          "Please provide article you wannt to upload image for."
        );
      const folderName = articleId;
      // Store the uploaded file path
      const filePath = req.file.path;
      const outputDir = path.join(__dirname, folderName);

      // Ensure the uploads directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate filenames for resized images
      const fileName = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath);

      // Image Processing
      const isoDateString = new Date().toISOString().replace(/[:.-]/g, "");
      const output16x9 = path.join(outputDir, `${isoDateString}-16x9${ext}`);
      const output4x3 = path.join(outputDir, `${isoDateString}-4x3${ext}`);
      const output1x1 = path.join(outputDir, `${isoDateString}-1x1${ext}`);

      // Save the image directly without resizing
      await Promise.all([
        // Save with 16:9 aspect ratio filename
        sharp(filePath).toFile(output16x9),

        // Save with 4:3 aspect ratio filename
        sharp(filePath).toFile(output4x3),

        // Save with 1:1 aspect ratio filename
        sharp(filePath).toFile(output1x1),
      ]);

      // // Cropped one
      // Resize the image to different aspect ratios using sharp
      // await Promise.all([
      //   // 16:9 aspect ratio (e.g., 1600x900)
      //   sharp(filePath)
      //     .resize({ width: 1600, height: 900 })
      //     .toFile(output16x9),

      //   // 4:3 aspect ratio (e.g., 1200x900)
      //   sharp(filePath)
      //     .resize({ width: 1200, height: 900 })
      //     .toFile(output4x3),

      //   // 1:1 aspect ratio (e.g., 1000x1000)
      //   sharp(filePath)
      //     .resize({ width: 1000, height: 1000 })
      //     .toFile(output1x1),
      // ]);

      const s3RootFolder = `article/${folderName}`;
      MODE === "PROD" && await deleteDirectoryFromS3(s3RootFolder);
      // Upload the directory with resized images to S3
      const s3Urls = MODE === "PROD" ? await uploadDirectoryToS3(outputDir, s3RootFolder) : "";;

      // Delay before deleting the original file from the filesystem after resizing
      fs.unlink(filePath, (err) => {
        if (err) {
          // console.error(`Error deleting file: ${filePath}`, err);
        } else {
          // console.log(`File deleted: ${filePath}`);
        }
      });

      // Delete the output directory and its contents using fs.rm
      await fs.promises.rm(outputDir, { recursive: true });
      // console.log(`Directory deleted: ${outputDir}`);

      savedArticle.s3Urls = s3Urls;
      await savedArticle.save();
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: savedArticle._id,
          description: savedArticle.seoSummary,
          route: "static_pages/articles",
          title: savedArticle.title,
          serviceType: "articles",
        });
      }
    }
    await savedArticle.save();

    res.status(201).json(savedArticle);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Update an article (using POST)
const updateArticle = async (req, res) => {
  const { id, source, settings } = req.body;

  try {
    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      { source, settings },
      { new: true }
    );

    if (!updatedArticle) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(200).json(updatedArticle);
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete an article (using POST)
const deleteArticle = async (req, res) => {
  const { id } = req.body;

  try {
    const deletedArticle = await Article.findByIdAndUpdate(
      id,
      { isActive: false, deletedAt: new Date().toISOString() },
      { new: true }
    );

    if (!deletedArticle) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(204).json();
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// file upload article (using POST)
const fileUploadArticle = async (req, res) => {
  try {
    const articleId = req.body.articleId;
    if (articleId === null || articleId === undefined)
      throw new Error("Please provide article you wannt to upload image for.");
    const folderName = articleId;
    // Store the uploaded file path
    const filePath = req.file.path;
    const outputDir = path.join(__dirname, folderName);

    // Ensure the uploads directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filenames for resized images
    const fileName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);

    // Image Processing
    const isoDateString = new Date().toISOString().replace(/[:.-]/g, "");
    const output16x9 = path.join(outputDir, `${isoDateString}-16x9${ext}`);
    const output4x3 = path.join(outputDir, `${isoDateString}-4x3${ext}`);
    const output1x1 = path.join(outputDir, `${isoDateString}-1x1${ext}`);
    // Call the background and resize function for each aspect ratio
    // await sharp(filePath)
    //   .resize(1200, 630, {
    //     fit: sharp.fit.contain,
    //     background: { r: 0, g: 0, b: 0 },
    //   })
    //   .toFile(output16x9);
    // await sharp(filePath)
    //   .resize(1200, 900, {
    //     fit: sharp.fit.contain,
    //     background: { r: 0, g: 0, b: 0 },
    //   })
    //   .toFile(output4x3);
    // await sharp(filePath)
    //   .resize(1080, 1080, {
    //     fit: sharp.fit.contain,
    //     background: { r: 0, g: 0, b: 0 },
    //   })
    //   .toFile(output1x1);

    // // Pulled one
    // // Resize the image to different aspect ratios using sharp
    // await Promise.all([
    //   // 16:9 aspect ratio (e.g., 1600x900)
    //   sharp(filePath)
    //     .resize({ width: 1600, height: 900, fit: sharp.fit.fill }) // Stretch to fit
    //     .toFile(output16x9),

    //   // 4:3 aspect ratio (e.g., 1200x900)
    //   sharp(filePath)
    //     .resize({ width: 1200, height: 900, fit: sharp.fit.fill }) // Stretch to fit
    //     .toFile(output4x3),

    //   // 1:1 aspect ratio (e.g., 1000x1000)
    //   sharp(filePath)
    //     .resize({ width: 1000, height: 1000, fit: sharp.fit.fill }) // Stretch to fit
    //     .toFile(output1x1),
    // ]);

    // // Cropped one
    // Resize the image to different aspect ratios using sharp
    await Promise.all([
      // 16:9 aspect ratio (e.g., 1600x900)
      sharp(filePath).resize({ width: 1600, height: 900 }).toFile(output16x9),

      // 4:3 aspect ratio (e.g., 1200x900)
      sharp(filePath).resize({ width: 1200, height: 900 }).toFile(output4x3),

      // 1:1 aspect ratio (e.g., 1000x1000)
      sharp(filePath).resize({ width: 1000, height: 1000 }).toFile(output1x1),
    ]);

    const s3RootFolder = `article/${folderName}`;
    MODE === "PROD" && await deleteDirectoryFromS3(s3RootFolder);
    // Upload the directory with resized images to S3
    const s3Urls = MODE === "PROD" ? await uploadDirectoryToS3(outputDir, s3RootFolder) : "";

    // Delay before deleting the original file from the filesystem after resizing
    fs.unlink(filePath, (err) => {
      if (err) {
        // console.error(`Error deleting file: ${filePath}`, err);
      } else {
        // console.log(`File deleted: ${filePath}`);
      }
    });

    // Delete the output directory and its contents using fs.rm
    await fs.promises.rm(outputDir, { recursive: true });
    // console.log(`Directory deleted: ${outputDir}`);

    const updateArticle = await Article.findOneAndUpdate(
      {
        _id: articleId,
      },
      {
        s3Urls: s3Urls,
      }
    ).exec();

    if (MODE === "PROD") {
      await uploadS3Bucket({
        fileName: updateArticle._id,
        description: updateArticle.seoSummary,
        route: "static_pages/articles",
        title: updateArticle.title,
        serviceType: "articles",
      });
    }

    // Send a response back with the paths of the resized images in S3
    res.send({
      message: "File uploaded, resized, and uploaded to S3 successfully!",
      originalFile: req.file,
      s3Urls,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Update the Link of an article (using POST)
const uniqueLink = async (req, res) => {
  const { uuid, id, customLink } = req.body;

  try {
    const article = await Article.findOne({
      _id: id,
    });

    if (customLink) {
      if (/[\s.]/.test(customLink))
        return res.status(403).json({
          message: "Customized link should not contain spaces or periods.",
        });
      const customLinkAlreadyExists = await ArticleSetting.findOne({
        uniqueLink: customLink,
      });
      if (customLinkAlreadyExists)
        return res.status(403).json({
          message: "Custom link already exist. Try something different.",
        });
      const isCustomLinkExists = await ArticleSetting.findOne({
        articleId: id,
        userUuid: uuid,
        uniqueCustomizedLinkGenerated: true,
      });
      if (isCustomLinkExists)
        return res.status(403).json({
          message: "Custom link already generated with this article.",
        });
    }

    let articleSetting;

    if (customLink) {
      articleSetting = await ArticleSetting.findOneAndUpdate(
        { articleId: id, userUuid: uuid },
        { uniqueLink: customLink, uniqueCustomizedLinkGenerated: true },
        { new: true, upsert: true }
      );
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: articleSetting.uniqueLink,
          description: article.seoSummary,
          route: "static_pages/articles",
          title: article.title,
          serviceType: "articles",
          uniqueLinkArticle: "true",
        });
      }
    } else {
      const linkAlreadyGenerated = await ArticleSetting.findOne({
        articleId: id,
        userUuid: uuid,
        uniqueLink: { $ne: "" },
      });
      if (linkAlreadyGenerated)
        return res
          .status(403)
          .json({ message: "Link already generated with this article." });
      articleSetting = await ArticleSetting.findOneAndUpdate(
        { articleId: id, userUuid: uuid },
        {
          uniqueLink: shortLink.generate(8),
          uniqueCustomizedLinkGenerated: false,
        },
        { new: true, upsert: true }
      );
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: articleSetting.uniqueLink,
          description: article.seoSummary,
          route: "static_pages/articles",
          title: article.title,
          serviceType: "articles",
          uniqueLinkArticle: "true",
        });
      }
    }

    return res.status(200).json({
      message: "Link applied successfully",
      article: { ...article._doc, articleSetting: articleSetting },
    });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete an Article Settings (using POST)
const deleteArticleSetting = async (req, res) => {
  const { id, uuid } = req.body;

  try {
    // Find and delete the ArticleSetting document
    const deleteArticleSetting = await ArticleSetting.findOneAndDelete({
      _id: id,
      userUuid: uuid,
    });
    if (MODE === "PROD") {
      await uploadS3Bucket({
        fileName: deleteArticleSetting.uniqueLink,
        route: "static_pages/articles",
        serviceType: "delete",
      });
    }

    if (!deleteArticleSetting) {
      return res.status(404).json({ message: "Article setting not found" });
    }

    res.status(204).json(); // No content response if deletion was successful
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Set an Article Settings (using POST)
const setArticleSettingStatus = async (req, res) => {
  const { id, uuid } = req.body;

  try {
    // Find the ArticleSetting document and toggle `isEnable`
    const updatedArticleSetting = await ArticleSetting.findOneAndUpdate(
      { _id: id, userUuid: uuid },
      [{ $set: { isEnable: { $not: "$isEnable" } } }],
      { new: true } // Returns the updated document
    );

    if (!updatedArticleSetting) {
      return res.status(404).json({ message: "Article setting not found" });
    }

    res.status(200).json({
      message: "Article setting updated",
      data: updatedArticleSetting,
    });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// Export all functions at once
module.exports = {
  getArticles,
  getArticlesUserUuid,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  fileUploadArticle,
  uniqueLink,
  deleteArticleSetting,
  setArticleSettingStatus,
};
