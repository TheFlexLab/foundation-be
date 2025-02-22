const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const { PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY } = require("../config/env");

webpush.setVapidDetails(
    "mailto:test@test.com",
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
);

// Subscribe Route

router.post("/subscribe", (req, res) => {
    // Get Push Subscription Object
    const subscription = req.body;

    // Send 201 - resource created
    res.status(201).json({});

    // Create Payload: specified the value to be sent
    const payload = JSON.stringify({ title: "Push Test" });

    // Pass object into sendNotification
    webpush.sendNotification(subscription, payload).catch((err) => { throw error; });
});


module.exports = router;