const express = require("express");
const router = express.Router();
// controller
const DevScriptController = require("../controller/DevScriptController");
const { uploadSingle } = require("../middleware/uploadSingle");
const multer = require('multer');

/**
 * @swagger
 * tags:
 *   name: DevScriptRoutes
 *   description: Endpoints for user DevScriptRoutes
 */

// router.patch(
//   "/excep",
//   /**
//   * @swagger
//   * /devscript/excep:
//   *   patch:
//   *     tags:
//   *       - DevScriptRoutes
//   *     summary: Set badge data for all users
//   *     description: Endpoint to set badge data for all users in the database
//   *     responses:
//   *       '200':
//   *         description: Badge data encrypted successfully for all users
//   *       '500':
//   *         description: Internal server error
//   */
//   DevScriptController.excep
// )

// router.patch(
//   "/encryptBadgeData",
//   /**
//   * @swagger
//   * /devscript/encryptBadgeData:
//   *   patch:
//   *     tags:
//   *       - DevScriptRoutes
//   *     summary: Encrypt badge data for all users
//   *     description: Endpoint to encrypt badge data for all users in the database
//   *     responses:
//   *       '200':
//   *         description: Badge data encrypted successfully for all users
//   *       '500':
//   *         description: Internal server error
//   */
//   DevScriptController.encryptBadgeData
// )

router.get(
  "/createUserListForAllUsers",
  /**
   * @swagger
   * /devscript/createUserListForAllUsers:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: Get user's list information
   *     description: Endpoint to get information of a user
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.createUserListForAllUsers
);

router.post(
  "/dbReset",
  /**
   * @swagger
   * /devscript/dbReset:
   *   post:
   *     tags:
   *       - DevScriptRoutes
   *     summary: Reset the database
   *     description: Endpoint to reset the database
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               db:
   *                 type: string
   *                 enum: [main, stag, dev]
   *                 example: main
   *                 description: The database to reset
   *     responses:
   *       '200':
   *         description: Database reset successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.dbReset
);

router.get(
  "/userListSeoSetting",
  /**
   * @swagger
   * /devscript/userListSeoSetting:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users list seo
   *     description: To Set users list seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.userListSeoSetting
);

router.get("/fetchheaders", (req, res) => {
  // Get headers from the request
  const headers = req.headers;
  // // console.log({ headers });
  // Send headers as JSON response
  res.json({ headers });
});

router.get(
  "/admin/userProfiles/generalStatistics",
  /**
   * @swagger
   * /devscript/admin/userProfiles/generalStatistics:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: Get user's list information
   *     description: Endpoint to get information of a user
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.generalStatistics
);

router.get(
  "/userPostSeoSetting",
  /**
   * @swagger
   * /devscript/userPostSeoSetting:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.userPostSeoSetting
);

router.get(
  "/setFeedback",
  /**
   * @swagger
   * /devscript/setFeedback:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.setFeedback
);

router.get(
  "/setPostCounters",
  /**
   * @swagger
   * /devscript/setPostCounters:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.setPostCounters
);

router.get(
  "/createGuestLedger",
  /**
   * @swagger
   * /devscript/createGuestLedger:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.createGuestLedger
);

router.post(
  "/sendEmail",
  /**
   * @swagger
   * /devscript/sendEmail:
   *   post:
   *     tags:
   *       - DevScriptRoutes
   *     summary: Send an email to a list of recipients
   *     description: Sends an email to a list of recipients with the provided subject, message, and sender information.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               subject:
   *                 type: string
   *                 description: Subject of the email.
   *                 example: Meeting Reminder
   *               message:
   *                 type: string
   *                 description: Body content of the email.
   *                 example: This is a reminder for the meeting scheduled tomorrow at 10 AM.
   *               sender:
   *                 type: string
   *                 description: Sender's email address.
   *                 example: noreply@example.com
   *     responses:
   *       '200':
   *         description: Mail sent successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.sendEmail
);

router.post(
  "/sendEmailTemplate",
  /**
   * @swagger
   * /devscript/sendEmailTemplate:
   *   post:
   *     tags:
   *       - DevScriptRoutes
   *     summary: Send an email to a list of recipients
   *     description: Sends an email to a list of recipients with the provided subject, message, and sender information.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               subject:
   *                 type: string
   *                 description: Subject of the email.
   *                 example: Meeting Reminder
   *               message:
   *                 type: string
   *                 description: Body content of the email.
   *                 example: This is a reminder for the meeting scheduled tomorrow at 10 AM.
   *               sender:
   *                 type: string
   *                 description: Sender's email address.
   *                 example: noreply@example.com
   *     responses:
   *       '200':
   *         description: Mail sent successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.sendEmailTemplate
);

router.get(
  "/generatePostData",
  /**
   * @swagger
   * /devscript/generatePostData:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Get Post Data File along Statistics
   *     description: To Get Post Data File along Statistics
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.generatePostData
);

router.get(
  "/addOptionsInBooleanQuests",
  /**
   * @swagger
   * /devscript/addOptionsInBooleanQuests:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.addOptionsInBooleanQuests
);

router.get(
  "/addIdsToQuestAnswersArrayObjects",
  /**
   * @swagger
   * /devscript/addIdsToQuestAnswersArrayObjects:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.addIdsToQuestAnswersArrayObjects
);

router.get(
  "/selectedContendedPercentages",
  /**
   * @swagger
   * /devscript/selectedContendedPercentages:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.selectedContendedPercentages
);

router.get(
  "/setGeneralTypes",
  /**
   * @swagger
   * /devscript/setGeneralTypes:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.setGeneralTypes
);

router.get(
  "/postDataPDF",
  /**
   * @swagger
   * /devscript/postDataPDF:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.postDataPDF
);

router.get(
  "/postDataPDFIndividuals",
  /**
   * @swagger
   * /devscript/postDataPDFIndividuals:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.postDataPDFIndividuals
);

router.get(
  "/createPDFFromJson",
  /**
   * @swagger
   * /devscript/createPDFFromJson:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.createPDFFromJson
);

router.get(
  "/createUserPDFs",
  /**
   * @swagger
   * /devscript/createUserPDFs:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.createUserPDFs
);

router.get(
  "/embedDailyUser",
  /**
   * @swagger
   * /devscript/embedDailyUser:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.embedDailyUser
);

router.get(
  "/embedDailyPosts",
  /**
   * @swagger
   * /devscript/embedDailyPosts:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.embedDailyPosts
);

router.get(
  "/generatePostPdfForTest",
  /**
   * @swagger
   * /devscript/generatePostPdfForTest:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.generatePostPdfForTest
);

router.get(
  "/tempRemoval",
  /**
   * @swagger
   * /devscript/tempRemoval:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.tempRemoval
);

router.get(
  "/postsForcedEmbed",
  /**
   * @swagger
   * /devscript/postsForcedEmbed:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.postsForcedEmbed
);

router.get(
  "/articleSEO",
  /**
   * @swagger
   * /devscript/articleSEO:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.articleSEO
);

router.get(
  "/sharedPostImageSEO",
  /**
   * @swagger
   * /devscript/sharedPostImageSEO:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.sharedPostImageSEO
);

router.get(
  "/homepageSEO",
  /**
   * @swagger
   * /devscript/homepageSEO:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.homepageSEO
);

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/upload",
  upload.single('file'),
  /**
   * @swagger
   * /devscript/upload:
   *   get:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.upload
);

router.delete(
  "/deleteS3Htmls",
  /**
   * @swagger
   * /devscript/deleteS3Htmls:
   *   delete:
   *     tags:
   *       - DevScriptRoutes
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  DevScriptController.deleteS3Htmls
);

module.exports = router;
