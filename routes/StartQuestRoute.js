const express = require("express");
const router = express.Router();
// controller
const StartQuestController = require("../controller/StartQuestController");
// middleware
const protect = require("../middleware/protect");
const isUrlSharedPostValidToInteract = require("../middleware/isUrlSharedPostValidToInteract");
const isGuest = require("../middleware/isGuest");

router.get("/frame", StartQuestController.handleGetFrame);
router.post("/frame-change", StartQuestController.handleChangeFrame);

/**
 * @swagger
 * tags:
 *   name: Start Quest
 *   description: Endpoints for starting and managing quests
 */

router.post(
  "/updateViolationCounter/:uuid",
  /**
   * @swagger
   * /startQuest/updateViolationCounter/{uuid}:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: Update violation counter
   *     description: Endpoint to update violation counter for a quest
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ViolationCounterUpdateRequest'
   *     responses:
   *       '200':
   *         description: Violation counter updated successfully
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.updateViolationCounter
);

router.post(
  "/submitThroughFrames",
  /**
   * @swagger
   * /startQuest/submitThroughFrames:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: Create start quest
   *     description: Endpoint to create a start quest
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StartQuestCreationRequest'
   *     responses:
   *       '200':
   *         description: Start quest created successfully
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.submitThroughFrames
);

router.post(
  "/fidRedirect",
  /**
   * @swagger
   * /startQuest/fidRedirect:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: To Set users post seo
   *     description: To Set users post seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.fidRedirect
);

router.post(
  "/createStartQuest",
  isUrlSharedPostValidToInteract,
  // isGuest,
  /**
   * @swagger
   * /startQuest/createStartQuest:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: Create start quest
   *     description: Endpoint to create a start quest
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StartQuestCreationRequest'
   *     responses:
   *       '200':
   *         description: Start quest created successfully
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.createStartQuest
);

router.post(
  "/updateChangeAnsStartQuest",
  // isGuest,
  /**
   * @swagger
   * /startQuest/updateChangeAnsStartQuest:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: Update change answer start quest
   *     description: Endpoint to update change answer start quest
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChangeAnswerStartQuestRequest'
   *     responses:
   *       '200':
   *         description: Change answer start quest updated successfully
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.updateChangeAnsStartQuest
);

router.post(
  "/getRankedQuestPercent",
  /**
   * @swagger
   * /startQuest/getRankedQuestPercent:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: Get ranked quest percentage
   *     description: Endpoint to get the percentage of ranked quests
   *     responses:
   *       '200':
   *         description: Successfully retrieved ranked quest percentage
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.getRankedQuestPercent
);

router.post(
  "/getStartQuestPercent",
  /**
   * @swagger
   * /startQuest/getStartQuestPercent:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: Get start quest percentage
   *     description: Endpoint to get the percentage of start quests
   *     responses:
   *       '200':
   *         description: Successfully retrieved start quest percentage
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.getStartQuestPercent
);

router.post(
  "/getStartQuestInfo",
  /**
   * @swagger
   * /startQuest/getStartQuestInfo:
   *   post:
   *     tags:
   *       - Start Quest
   *     summary: Get start quest information
   *     description: Endpoint to get information about a start quest
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/StartQuestInfoRequest'
   *     responses:
   *       '200':
   *         description: Successfully retrieved start quest information
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.getStartQuestInfo
);

router.patch(
  "/revealMyAnswers",
  /**
   * @swagger
   * /startQuest/revealMyAnswers:
   *   patch:
   *     tags:
   *       - Start Quest
   *     summary: To Set users patch seo
   *     description: To Set users patch seo
   *     responses:
   *       '200':
   *         description: User information retrieved successfully
   *       '500':
   *         description: Internal server error
   */
  StartQuestController.revealMyAnswers
);

module.exports = router;
