const express = require("express");
const router = express.Router();
// controller
const DirectMessageController = require("../controller/DirectMessageController");
// middleware
const protect = require("../middleware/protect");

/**
 * @swagger
 * tags:
 *   name: Direct Message
 *   description: Endpoints for managing direct messages
 */

router.post("/directMessage/send",
  /**
   * @swagger
   * /directMessage/send:
   *   post:
   *     tags:
   *       - Direct Message
   *     summary: Send direct message
   *     description: Endpoint to send a direct message
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DirectMessageSendRequest'
   *     responses:
   *       '200':
   *         description: Direct message sent successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.send
);

router.post("/directMessage/sendPublic",
  /**
   * @swagger
   * /directMessage/sendPublic:
   *   post:
   *     tags:
   *       - Direct Message
   *     summary: sendPublic direct message
   *     description: Endpoint to sendPublic a direct message
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DirectMessagesendPublicRequest'
   *     responses:
   *       '200':
   *         description: Direct message sent successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.sendPublic
);

router.patch("/directMessage/requestStatus",
  /**
   * @swagger
   * /directMessage/requestStatus:
   *   patch:
   *     tags:
   *       - Direct Message
   *     summary: requestStatus direct message
   *     description: Endpoint to requestStatus a direct message
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DirectMessagerequestStatusRequest'
   *     responses:
   *       '200':
   *         description: Direct message sent successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.requestStatus
);

router.post("/directMessage/draft",
  /**
   * @swagger
   * /directMessage/draft:
   *   post:
   *     tags:
   *       - Direct Message
   *     summary: Save draft direct message
   *     description: Endpoint to save a draft direct message
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DirectMessageDraftRequest'
   *     responses:
   *       '200':
   *         description: Draft direct message saved successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.draft
);

router.get("/directMessage/getAllDraft/:uuid",
  /**
   * @swagger
   * /directMessage/getAllDraft/{uuid}:
   *   get:
   *     tags:
   *       - Direct Message
   *     summary: Get all draft messages
   *     description: Endpoint to retrieve all draft direct messages by user UUID
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UUID of the user
   *     responses:
   *       '200':
   *         description: Successfully retrieved all draft direct messages
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.getAllDraft
);

router.get("/directMessage/getAllSend/:uuid",
  /**
   * @swagger
   * /directMessage/getAllSend/{uuid}:
   *   get:
   *     tags:
   *       - Direct Message
   *     summary: Get all sent messages
   *     description: Endpoint to retrieve all sent direct messages by user UUID
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UUID of the user
   *     responses:
   *       '200':
   *         description: Successfully retrieved all sent direct messages
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.getAllSend
);

router.get("/directMessage/getAllReceive/:uuid",
  /**
   * @swagger
   * /directMessage/getAllReceive/{uuid}:
   *   get:
   *     tags:
   *       - Direct Message
   *     summary: Get all received messages
   *     description: Endpoint to retrieve all received direct messages by user UUID
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UUID of the user
   *     responses:
   *       '200':
   *         description: Successfully retrieved all received direct messages
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.getAllReceive
);

router.post("/directMessage/view",
  /**
   * @swagger
   * /directMessage/view:
   *   post:
   *     tags:
   *       - Direct Message
   *     summary: View direct message
   *     description: Endpoint to mark a direct message as viewed
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DirectMessageViewRequest'
   *     responses:
   *       '200':
   *         description: Direct message viewed successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.view
);

router.delete("/directMessage/delete",
  /**
   * @swagger
   * /directMessage/delete:
   *   delete:
   *     tags:
   *       - Direct Message
   *     summary: Delete direct message
   *     description: Endpoint to delete a direct message
   *     responses:
   *       '200':
   *         description: Direct message deleted successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.deleteMessage
);

router.post("/directMessage/trash",
  /**
   * @swagger
   * /directMessage/trash:
   *   post:
   *     tags:
   *       - Direct Message
   *     summary: Move direct message to trash
   *     description: Endpoint to move a direct message to trash
   *     responses:
   *       '200':
   *         description: Direct message moved to trash successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.trashMessage
);

router.post("/directMessage/restore",
  /**
   * @swagger
   * /directMessage/restore:
   *   post:
   *     tags:
   *       - Direct Message
   *     summary: Restore direct message from trash
   *     description: Endpoint to restore a direct message from trash
   *     responses:
   *       '200':
   *         description: Direct message restored from trash successfully
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.restoreMessage
);

router.get("/directMessage/getAllDeletedMessage/:uuid",
  /**
   * @swagger
   * /directMessage/getAllDeletedMessage/{uuid}:
   *   get:
   *     tags:
   *       - Direct Message
   *     summary: Get all deleted messages
   *     description: Endpoint to retrieve all deleted messages for a user
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UUID of the user
   *     responses:
   *       '200':
   *         description: Successfully retrieved all deleted messages
   *       '404':
   *         description: No deleted messages found
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.getAllDeletedMessage
);

router.get("/directMessage/cancleMessage/:uuid/:id",
  /**
   * @swagger
   * /directMessage/cancleMessage/{uuid}/{id}:
   *   get:
   *     tags:
   *       - Direct Message
   *     summary: Get all deleted messages
   *     description: Endpoint to retrieve all deleted messages for a user
   *     parameters:
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UUID of the user
   *     responses:
   *       '200':
   *         description: Successfully retrieved all deleted messages
   *       '404':
   *         description: No deleted messages found
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.cancleMessage
);

router.post("/directMessage/getCountForOptions",
  /**
   * @swagger
   * /directMessage/getCountForOptions:
   *   post:
   *     tags:
   *       - Direct Message
   *     summary: Get count for options
   *     description: Endpoint to retrieve count for specific options based on the request body
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               uuid:
   *                 type: string
   *                 description: The UUID of the user
   *               questForeignKey:
   *                 type: string
   *                 description: The quest foreign key
   *               options:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of options
   *     responses:
   *       '200':
   *         description: Successfully retrieved count for options
   *       '400':
   *         description: Bad request, invalid input
   *       '500':
   *         description: Internal server error
   */
  DirectMessageController.getCountForOptions
);

module.exports = router;
