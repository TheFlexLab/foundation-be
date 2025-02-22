const express = require("express");
const router = express.Router();
// controller
const ArticleController = require("../controller/ArticleController");
const { uploadSingle } = require("../middleware/uploadSingle");

/**
 * @swagger
 * tags:
 *   name: Articles
 *   description: API to manage your articles.
 */

/**
 * @swagger
 * /article/articles:
 *   get:
 *     summary: Retrieve a list of articles
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         description: The page number to retrieve (defaults to 1).
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of articles with pagination info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 articles:
 *                   type: array
 *                   items:
 *                     type: object
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalArticles:
 *                   type: integer
 */
router.get("/articles", ArticleController.getArticles);

/**
 * @swagger
 * /article/user:
 *   post:
 *     summary: Get an article by userUuid
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userUuid:
 *                 type: string
 *                 description: The UUID of the user
 *     responses:
 *       200:
 *         description: An article object.
 */
router.post("/user", ArticleController.getArticlesUserUuid);

/**
 * @swagger
 * /article/getArticleById:
 *   post:
 *     summary: Get an article by userUuid
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userUuid:
 *                 type: string
 *                 description: The UUID of the user
 *     responses:
 *       200:
 *         description: An article object.
 */
router.get("/getArticleById", ArticleController.getArticleById);

/**
 * @swagger
 * /article/create:
 *   post:
 *     summary: Create a new article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userUuid:
 *                 type: string
 *               body:
 *                 type: string
 *               source:
 *                 type: array
 *                 items:
 *                   type: string
 *               suggestions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: The article was successfully created.
 */
router.post("/create", uploadSingle, ArticleController.createArticle);

/**
 * @swagger
 * /article/update:
 *   post:
 *     summary: Update an article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID of the article to update
 *               body:
 *                 type: string
 *               source:
 *                 type: array
 *                 items:
 *                   type: string
 *               suggestions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: The article was successfully updated.
 */
router.post("/update", ArticleController.updateArticle);

/**
 * @swagger
 * /article/delete:
 *   post:
 *     summary: Delete an article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID of the article to delete
 *     responses:
 *       204:
 *         description: The article was successfully deleted.
 */
router.post("/delete", ArticleController.deleteArticle);

/**
 * @swagger
 * /article/upload:
 *   post:
 *     summary: Upload a file with additional JSON data
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               title:
 *                 type: string
 *                 description: The title of the article
 *               description:
 *                 type: string
 *                 description: The description of the article
 *     responses:
 *       200:
 *         description: File and data uploaded successfully
 *       500:
 *         description: Internal Server Error
 */
router.post("/upload", uploadSingle, ArticleController.fileUploadArticle);

/**
 * @swagger
 * /article/uniqueLink:
 *   post:
 *     summary: Update an article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID of the article to update
 *     responses:
 *       204:
 *         description: The article was successfully updated.
 */
router.post("/uniqueLink", ArticleController.uniqueLink);

/**
 * @swagger
 * /article/deleteArticleSetting:
 *   post:
 *     summary: Delete an ArticleSetting
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID of the article to delete
 *     responses:
 *       204:
 *         description: The article was successfully deleted.
 */
router.post("/deleteArticleSetting", ArticleController.deleteArticleSetting);

/**
 * @swagger
 * /article/setArticleSettingStatus:
 *   post:
 *     summary: Set an article setting
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID of the article to delete
 *     responses:
 *       204:
 *         description: The article was successfully deleted.
 */
router.post("/setArticleSettingStatus", ArticleController.setArticleSettingStatus);

module.exports = router;
