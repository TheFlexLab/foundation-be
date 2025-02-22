const express = require("express");
const router = express.Router();
const AppController = require("../controller/AppController");
const multer = require('multer');
const { verifyImage, identityFilesConfig } = require("../middleware/verifyImage");

/**
 * @swagger
 * tags:
 *   name: AppRoutes
 *   description: Endpoints for user AppRoutes
 */

router.post(
    "/spotLight",
    /**
     * @swagger
     * /app/spotLight:
     *   post:
     *     tags:
     *       - AppRoutes
     *     summary: To Set users post SEO
     *     description: To Set users post SEO
     *     responses:
     *       '200':
     *         description: User information retrieved successfully
     *       '500':
     *         description: Internal server error
     */
    AppController.spotLight
);

router.post(
    "/detectDocument",
    /**
     * @swagger
     * /app/detectDocument:
     *   post:
     *     tags:
     *       - AppRoutes
     *     summary: To Set users post SEO
     *     description: To Set users post SEO
     *     responses:
     *       '200':
     *         description: User information retrieved successfully
     *       '500':
     *         description: Internal server error
     */
    verifyImage(identityFilesConfig),
    AppController.detectDocument
);

module.exports = router;
