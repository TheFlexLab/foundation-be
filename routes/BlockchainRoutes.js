const express = require("express");
const router = express.Router();

// controller
const BlockchainController = require("../controller/BlockchainController");

/**
 * @swagger
 * tags:
 *   name: Blockchain
 *   description: Endpoints for Blockchain
 */

router.post(
  "/widthrawFdx",
  /**
   * @swagger
   * /widthrawFdx:
   *   post:
   *     tags:
   *       - Blockchain
   *     summary: Withdraw FDX
   *     description: Allows the user to withdraw FDX tokens.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *                 description: The ID of the user requesting the withdrawal.
   *               amount:
   *                 type: number
   *                 description: The amount of FDX to withdraw.
   *     responses:
   *       '200':
   *         description: Withdrawal successful.
   *       '400':
   *         description: Invalid input or insufficient balance.
   *       '500':
   *         description: Internal server error.
   */
  BlockchainController.widthraw
);
router.get(
  "/missedDeposits",

  BlockchainController.processMissedTransactions
);

router.get(
  "/fetchFeeBalance",
  /**
   * @swagger
   * /fetchFeeBalance:
   *   get:
   *     tags:
   *       - Blockchain
   *     summary: Fetch Fee Balance
   *     description: Retrieves the current fee balance for transactions.
   *     responses:
   *       '200':
   *         description: Fee balance retrieved successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 feeBalance:
   *                   type: number
   *                   description: The fee balance amount.
   *                   example: 0.0025
   *                 currency:
   *                   type: string
   *                   description: The currency of the fee balance.
   *                   example: "ETH"
   *       '500':
   *         description: Internal server error.
   */
  BlockchainController.fetchFeeBalance
);

module.exports = router;
