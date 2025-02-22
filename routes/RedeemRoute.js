const express = require("express");
const router = express.Router();
// controller
const RedeemController = require("../controller/RedeemController");
// middleware
const protect = require("../middleware/protect");

/**
 * @swagger
 * tags:
 *   name: Redeem
 *   description: Endpoints for redeeming rewards
 */

router.post("/redeem/create",
  /**
   * @swagger
   * /redeem/create:
   *   post:
   *     tags:
   *       - Redeem
   *     summary: Create redeem request
   *     description: Endpoint to create a redeem request
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RedeemRequest'
   *     responses:
   *       '200':
   *         description: Redeem request created successfully
   *       '500':
   *         description: Internal server error
   */
  RedeemController.create
);

router.post("/redeem/transfer",
  /**
   * @swagger
   * /redeem/transfer:
   *   post:
   *     tags:
   *       - Redeem
   *     summary: Transfer redeemed rewards
   *     description: Endpoint to transfer redeemed rewards
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TransferRequest'
   *     responses:
   *       '200':
   *         description: Rewards transferred successfully
   *       '500':
   *         description: Internal server error
   */
  RedeemController.transfer
);

router.post("/redeem/delete",
  /**
   * @swagger
   * /redeem/delete:
   *   post:
   *     tags:
   *       - Redeem
   *     summary: Delete redeem request
   *     description: Endpoint to delete a redeem request
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RedeemDeleteRequest'
   *     responses:
   *       '200':
   *         description: Redeem request deleted successfully
   *       '500':
   *         description: Internal server error
   */
  RedeemController.deleteRedeem
);

router.post("/redeem/balance",
  /**
   * @swagger
   * /redeem/balance:
   *   post:
   *     tags:
   *       - Redeem
   *     summary: Get redeem balance
   *     description: Endpoint to get redeem balance
   *     responses:
   *       '200':
   *         description: Successfully retrieved redeem balance
   *       '500':
   *         description: Internal server error
   */
  RedeemController.balance
);

router.get("/redeem/getUnredeemedById/:id/:uuid",
  /**
   * @swagger
   * /redeem/getUnredeemedById/{id}/{uuid}:
   *   get:
   *     tags:
   *       - Redeem
   *     summary: Get unredeemed rewards by ID
   *     description: Endpoint to get unredeemed rewards by user ID and UUID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Successfully retrieved unredeemed rewards
   *       '500':
   *         description: Internal server error
   */
  RedeemController.getUnredeemedById
);

router.get("/redeem/getRedeemHistoryById/:id/:uuid",
  /**
   * @swagger
   * /redeem/getRedeemHistoryById/{id}/{uuid}:
   *   get:
   *     tags:
   *       - Redeem
   *     summary: Get redeem history by ID
   *     description: Endpoint to get redeem history by user ID and UUID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: uuid
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Successfully retrieved redeem history
   *       '500':
   *         description: Internal server error
   */
  RedeemController.getRedeemHistoryById
);

module.exports = router;
