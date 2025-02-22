const express = require("express");
const router = express.Router();
// controller
const QuestTopicController = require("../controller/QuestTopicController");
// middleware
const protect = require("../middleware/protect");

/**
 * @swagger
 * tags:
 *   name: Quest Topic
 *   description: Endpoints for managing quest topics
 */

router.patch("/topic/:topicId/:isAllow",
  /**
   * @swagger
   * /preferences/topic/{topicId}/{isAllow}:
   *   patch:
   *     tags:
   *       - Quest Topic
   *     summary: Update topic
   *     description: Endpoint to update the status of a topic
   *     parameters:
   *       - in: path
   *         name: topicId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the topic
   *       - in: path
   *         name: isAllow
   *         required: true
   *         schema:
   *           type: boolean
   *         description: Whether to allow the topic or not
   *     responses:
   *       '200':
   *         description: Topic updated successfully
   *       '500':
   *         description: Internal server error
   */
  QuestTopicController.update
);

router.get("/getAllTopic",
  /**
   * @swagger
   * /preferences/getAllTopic:
   *   get:
   *     tags:
   *       - Quest Topic
   *     summary: Get all topics
   *     description: Endpoint to get all topics
   *     responses:
   *       '200':
   *         description: Successfully retrieved all topics
   *       '500':
   *         description: Internal server error
   */
  QuestTopicController.getAllTopic
);

router.get("/searchTopics",
  /**
   * @swagger
   * /preferences/searchTopics:
   *   get:
   *     tags:
   *       - Quest Topic
   *     summary: Search topics
   *     description: Endpoint to search topics based on criteria
   *     parameters:
   *       - in: query
   *         name: keyword
   *         schema:
   *           type: string
   *         description: Keyword to search topics
   *     responses:
   *       '200':
   *         description: Successfully retrieved the search results
   *       '500':
   *         description: Internal server error
   */
  QuestTopicController.searchTopics
);

router.get("/getAllQuestByTopic",
  /**
   * @swagger
   * /preferences/getAllQuestByTopic:
   *   get:
   *     tags:
   *       - Quest Topic
   *     summary: Get all quests by topic
   *     description: Endpoint to get all quests associated with a topic
   *     responses:
   *       '200':
   *         description: Successfully retrieved all quests by topic
   *       '500':
   *         description: Internal server error
   */
  QuestTopicController.getAllQuestByTopic
);

router.get("/getAllQuestByTrendingTopic",
  /**
   * @swagger
   * /preferences/getAllQuestByTrendingTopic:
   *   get:
   *     tags:
   *       - Quest Topic
   *     summary: Get all quests by trending topic
   *     description: Endpoint to get all quests associated with trending topics
   *     responses:
   *       '200':
   *         description: Successfully retrieved all quests by trending topic
   *       '500':
   *         description: Internal server error
   */
  QuestTopicController.getAllQuestByTrendingTopic
);

module.exports = router;
