const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const { UserListSchema } = require("../models/UserList");
const { Article } = require("../models/Article");
const UserModel = require("../models/UserModel");
const UserQuestSetting = require("../models/UserQuestSetting");
const { ArticleSetting } = require("../models/ArticleSetting");
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-west-2' });
const rekognition = new AWS.Rekognition();

// Front Image Regex
const frontImageRegex = /(id\s?card|license|passport|i\.d\.?\s?card|identity\s?card|name|photo)/i;

// Back Image Regex
const backImageRegex = /(barcode|qr\s?code|machine\s?readable|back\s?side|magnetic\s?stripe|text\s?zone|data\s?block)/i;

// Regex to detect face-related labels
const faceImageRegex = /(face|head|portrait|headshot)/i;

// Set the spotLight
const spotLight = async (req, res) => {
  try {
    const { domain, type, id, status } = req.body;

    const user = await UserModel.findOne({
      badges: {
        $elemMatch: {
          "domain.name": domain,
          domain: { $exists: true, $ne: null }, // Ensure domain exists and is not null
        },
      },
    });

    const userUuid = user.uuid;

    if (status === "set") {
      // Fetch documents with spotLight set to true
      const [spotLightArticle, spotLightInfoQuest, spotLightUserList] =
        await Promise.all([
          ArticleSetting.findOne({ userUuid: userUuid, spotLight: true }),
          UserQuestSetting.findOne({ uuid: userUuid, spotLight: true }),
          UserListSchema.findOne(
            { userUuid: userUuid, "list.spotLight": true },
            { list: { $elemMatch: { spotLight: true } } }
          ),
        ]);

      // Determine the source type and combine results into a single object
      let spotLight = null;
      if (spotLightArticle) {
        spotLight = { ...spotLightArticle._doc, spotLightType: "news" };
      } else if (spotLightInfoQuest) {
        spotLight = { ...spotLightInfoQuest._doc, spotLightType: "posts" };
      } else if (spotLightUserList) {
        spotLight = { ...spotLightUserList.toObject(), spotLightType: "lists" };
      }

      if (spotLight) {
        // Find and set previous spotlights to false
        const updateSpotLightPromises = [];

        // Update spotLight for the article if it exists
        if (spotLightArticle) {
          updateSpotLightPromises.push(
            ArticleSetting.updateOne({ _id: spotLightArticle._id }, { $set: { spotLight: false } })
          );
        }

        // Update spotLight for the quest if it exists
        if (spotLightInfoQuest) {
          updateSpotLightPromises.push(
            UserQuestSetting.updateOne({ _id: spotLightInfoQuest._id }, { $set: { spotLight: false } })
          );
        }

        // Update spotLight for the user list if it exists
        if (spotLightUserList) {
          updateSpotLightPromises.push(
            UserListSchema.updateOne(
              { _id: spotLightUserList._id, "list.spotLight": true },
              { $set: { "list.$.spotLight": false } }
            )
          );
        }

        // Wait for all updates to complete
        await Promise.all(updateSpotLightPromises);
      }
    }

    if (status === "set") {
      switch (type) {
        case "posts":
          await UserQuestSetting.findOneAndUpdate(
            { uuid: userUuid, questForeignKey: id },
            { $set: { spotLight: true } }
          );
          break;

        case "news":
          await ArticleSetting.findOneAndUpdate(
            { userUuid: userUuid, articleId: id },
            { $set: { spotLight: true } }
          );
          break;

        case "lists":
          await UserListSchema.findOneAndUpdate(
            { userUuid: userUuid, "list._id": id },
            { $set: { "list.$.spotLight": true } }
          );
          break;

        default:
          return res.status(400).json({ message: "Invalid type specified" });
      }
      return res.status(200).json({ message: "Spotlight added successfully" });
    }

    if (status === "reset") {
      switch (type) {
        case "posts":
          await UserQuestSetting.findOneAndUpdate(
            { uuid: userUuid, questForeignKey: id },
            { $set: { spotLight: false } }
          );
          break;

        case "news":
          await ArticleSetting.findOneAndUpdate(
            { userUuid: userUuid, articleId: id },
            { $set: { spotLight: false } }
          );
          break;

        case "lists":
          await UserListSchema.findOneAndUpdate(
            { userUuid, "list._id": id },
            { $set: { "list.$.spotLight": false } }
          );
          break;

        default:
          return res.status(400).json({ message: "Invalid type specified" });
      }
      return res
        .status(200)
        .json({ message: "Spotlight removed successfully" });
    }
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// New function to validate the back image
const detectDocument = async (req, res) => {
  const file = req.files['file'] ? req.files['file'][0] : null;
  const buffer = file.buffer;
  const imageBuffer = buffer.buffer;
  const { type } = req.body;

  let regex;
  if (type === "front") {
    regex = frontImageRegex;
  } else if (type === "back") {
    regex = backImageRegex;
  } else {
    return res.status(400).json({ message: "Invalid type specified" });
  }

  const params = {
    Image: {
      Bytes: imageBuffer,
    },
  };

  try {
    const result = await rekognition.detectLabels(params).promise();

    // Extract labels from the response
    const labels = result.Labels.map(label => label.Name);

    // Check for face-related labels on the back image
    if (type === "back" && labels.some(label => faceImageRegex.test(label))) {
      return res.status(403).json({ message: "Invalid Document: Back side contains face" });
    }

    const isValidDocument = labels.some(label => regex.test(label));

    if (isValidDocument) {
      return res.status(200).json({ message: "Valid Document" });
    } else {
      return res.status(403).json({ message: "Invalid Document" });
    }
  } catch (error) {
    // console.error('Error detecting labels for back image:', error);
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};

// Export all functions at once
module.exports = {
  spotLight,
  detectDocument,
};
