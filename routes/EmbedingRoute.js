const express = require("express");
const router = express.Router();
// controller
const EmbeddingController = require("../controller/EmbeddingController");

/**
 * @swagger
 * tags:
 *   name: Embedding and Rag Stuff
 *   description: Endpoints for Embedding and Rag Stuff
 */

router.get(
    "/setEmbedding",
    /**
     * @swagger
     * /chatbot/setEmbedding:
     *   get:
     *     tags:
     *       - Embedding and Rag Stuff
     *     summary: To Embed Data
     *     description: To Embed Data
     *     responses:
     *       '200':
     *         description: User information retrieved successfully
     *       '500':
     *         description: Internal server error
     */
    EmbeddingController.setEmbedding
);

router.post(
    "/retrieveData",
    /**
     * @swagger
     * /chatbot/retrieveData:
     *   post:
     *     tags:
     *       - Embedding and Rag Stuff
     *     summary: Retrieve data based on query embedding
     *     description: Retrieves similar documents from the MongoDB Atlas vector store based on the provided query.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 example: "What is AI?"
     *     responses:
     *       '200':
     *         description: Successfully retrieved similar documents
     *       '500':
     *         description: Internal server error
     */
    EmbeddingController.retrieveData
);

router.post(
    "/chatGptData",
    /**
     * @swagger
     * /chatbot/chatGptData:
     *   post:
     *     tags:
     *       - Embedding and Rag Stuff
     *     summary: Chat data based on query embedding
     *     description: Retrieves similar documents from the MongoDB Atlas vector store based on the provided query.
     *     parameters:
     *       - in: query
     *         name: system
     *         schema:
     *           type: string
     *           default: "You are a very enthusiastic Foundation representative who loves to help people! Given the following sections from the Foundation documentation, answer the question using only that information, outputted in markdown format. If you are unsure and the answer is not explicitly written in the documentation, say 'Sorry, I don't know how to help with that.'"
     *         required: true
     *         description: The system message that sets the tone and context for the response.
     *       - in: query
     *         name: question
     *         schema:
     *           type: string
     *         required: true
     *         description: The question for which the chat data should be retrieved.
     *       - in: query
     *         name: temperature
     *         schema:
     *           type: number
     *           default: 0   # Default value for temperature
     *         required: false
     *         description: Sampling temperature between 0 and 1. Higher values make the output more random.
     *       - in: query
     *         name: max_tokens
     *         schema:
     *           type: number
     *           default: 256   # Default value for max_tokens
     *         required: false
     *         description: Maximum number of tokens to generate.
     *       - in: query
     *         name: top_p
     *         schema:
     *           type: number
     *           default: 0.001   # Default value for top_p
     *         required: false
     *         description: Nucleus sampling. Model considers tokens with top_p probability mass.
     *       - in: query
     *         name: frequency_penalty
     *         schema:
     *           type: number
     *           default: 0   # Default value for frequency_penalty
     *         required: false
     *         description: Frequency penalty between 0 and 1 to reduce token repetition.
     *       - in: query
     *         name: presence_penalty
     *         schema:
     *           type: number
     *           default: 0   # Default value for presence_penalty
     *         required: false
     *         description: Presence penalty between 0 and 1 to encourage talking about new topics.
     *     responses:
     *       '200':
     *         description: Successfully retrieved similar documents
     *       '500':
     *         description: Internal server error
     */
    EmbeddingController.chatGptData
);

module.exports = router;
