const { QUEST_CREATED_AMOUNT } = require("../constants");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const UserModel = require("../models/UserModel");
const StartQuests = require("../models/StartQuests");
const User = require("../models/UserModel");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const { getTreasury, updateTreasury } = require("../utils/treasuryService");
const { getUserBalance, updateUserBalance } = require("../utils/userServices");
const BookmarkQuests = require("../models/BookmarkQuests");
const {
  getPercentage,
  getPercentageQuestForeignKey,
  getPercentageAA,
} = require("../utils/getPercentage");
const shortLink = require("shortlink");
const { execSync } = require("child_process");
const UserQuestSetting = require("../models/UserQuestSetting");
const axios = require("axios");
const mongoose = require("mongoose");
const {
  UserListSchema,
  CategorySchema,
  PostSchema,
} = require("../models/UserList");
const Treasury = require("../models/Treasury");
const {
  notification1,
  notification2,
  notification3,
  notification4,
  notification5,
  notification6,
  notification7,
  notification8,
  notification9,
  notification10,
  notification11,
  notification12,
  notification13,
  notification14,
  notification15,
  notification16,
} = require("../notifications/home");
const { AdvanceAnalytics } = require("../models/Analyze");
const {
  notificationGuest1,
  notificationGuest2,
} = require("../notifications/guest");
const {
  notificationVisitor1,
  notificationVisitor2,
} = require("../notifications/visitor");
const { Article } = require("../models/Article");
const { QuestRagUpdate } = require("../models/QuestRagUpdate");
const WeeklySent = require("../models/WeeklySent");
const { link } = require("./UserQuestSettingController");
const { ArticleSetting } = require("../models/ArticleSetting");
const { isLinkValid } = require("../service/userQuestSettings");
const { computeResult } = require("../service/InfoQuestQuestion");

const optionsMapping = {
  "yes/no": [
    {
      id: "index-0",
      question: "Yes",
      chatgptQuestion: "Yes",
      selected: false,
      optionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      isTyping: false,
      duplication: false,
    },
    {
      id: "index-1",
      question: "No",
      chatgptQuestion: "No",
      selected: false,
      optionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      isTyping: false,
      duplication: false,
    },
  ],
  "agree/disagree": [
    {
      id: "index-0",
      question: "Agree",
      chatgptQuestion: "Agree",
      selected: false,
      optionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      isTyping: false,
      duplication: false,
    },
    {
      id: "index-1",
      question: "Disagree",
      chatgptQuestion: "Disagree",
      selected: false,
      optionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      isTyping: false,
      duplication: false,
    },
  ],
  "like/dislike": [
    {
      id: "index-0",
      question: "Like",
      chatgptQuestion: "Like",
      selected: false,
      optionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      isTyping: false,
      duplication: false,
    },
    {
      id: "index-1",
      question: "Dislike",
      chatgptQuestion: "Dislike",
      selected: false,
      optionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success",
      },
      isTyping: false,
      duplication: false,
    },
  ],
};

// Badge Count Operators
const operators = {
  1: "$gt", // Greater than
  2: "$lt", // Less than
  3: "$eq", // Equal to
  4: "$ne", // Not equal to
};

const hiddenOptionsfx = async (
  data,
  userUuid,
  questForeignKey,
  sharedLinkOnly,
  hiddenOptionsArray
) => {
  try {
    // Flatten the hiddenOptionsArray into a set of keys to be hidden
    const hiddenKeysSet = new Set(hiddenOptionsArray);

    // Process the result to remove hidden keys
    const updatedResult = data.result.map((resultItem) => {
      // Remove keys from `selected` if they exist in hiddenKeysSet
      if (resultItem.selected) {
        for (const key of hiddenKeysSet) {
          delete resultItem.selected[key];
        }
      }

      // Remove keys from `contended` if they exist in hiddenKeysSet
      if (resultItem.contended) {
        for (const key of hiddenKeysSet) {
          delete resultItem.contended[key];
        }
      }

      return resultItem;
    });

    const QuestAnswers = data.QuestAnswers.filter(
      (answer) => !hiddenOptionsArray.includes(answer.question)
    );

    // Ensure optionsRemoved array exists and update it
    if (!data.optionsRemoved) {
      data.optionsRemoved = [];
    }

    // Add hiddenOptionsArray elements to optionsRemoved
    hiddenOptionsArray.forEach((option) => {
      if (!data.optionsRemoved.includes(option)) {
        data.optionsRemoved.push(option);
      }
    });

    data.result = updatedResult;
    const selectedKeys = Object.keys(data.result[0]?.selected || {});
    const contendedKeys = Object.keys(data.result[0]?.contended || {});
    let conditionalMatch;
    if (sharedLinkOnly && sharedLinkOnly !== "" && sharedLinkOnly !== "undefined" && sharedLinkOnly !== "null") {
      if (isLinkValid(sharedLinkOnly)) {
        conditionalMatch = {
          questForeignKey: questForeignKey,
          userQuestSettingRef: sharedLinkOnly,
          $expr: { $gt: [{ $size: "$data" }, 0] },
        }
      }
      else {
        throw new Error("This link is not active");
      }
    }
    else {
      conditionalMatch = {
        questForeignKey: questForeignKey,
        $expr: { $gt: [{ $size: "$data" }, 0] },
      }
    }
    let startQuests = await StartQuests.aggregate([
      {
        $match: conditionalMatch,
      },
      {
        // Add a stage to extract the most recent document in the data array
        $addFields: {
          recentData: { $arrayElemAt: ["$data", -1] }, // Get the most recent data from the array
        },
      },
      {
        $match: {
          $or: [
            // Case 1: `selected` is a string and must match one of the `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "string" } }, // Ensure it's a string
                { "recentData.selected": { $in: selectedKeys } }, // Must match `selectedKeys`
              ],
            },
            // Case 2: `selected` is an array of objects and all `question` values must be in `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.selected": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: selectedKeys }, // Ensure all questions are in `selectedKeys`
                      },
                    },
                  },
                },
              ],
            },
            // Similarly, if you want to handle `contended` conditions:
            {
              $and: [
                { "recentData.contended": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.contended": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: contendedKeys }, // Ensure all questions are in `contendedKeys`
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ]);

    startQuests = startQuests.filter((doc) => {
      // Ensure `doc.recentData` exists
      const recentData = doc.recentData;
      if (!recentData) {
        return false; // Exclude documents where `recentData` is not present
      }

      let selectedValid = false;
      let contendedValid = false;

      // Handle the `selected` structure
      if (typeof recentData.selected === "string") {
        // Case where `selected` is a string and must match one of the `selectedKeys`
        selectedValid = selectedKeys.includes(recentData.selected);
      } else if (Array.isArray(recentData.selected)) {
        // Case where `selected` is an array of objects and all `question` values must be in `selectedKeys`
        selectedValid = recentData.selected.every(
          (selection) =>
            selection &&
            typeof selection === "object" &&
            selectedKeys.includes(selection.question)
        );
      }

      // Handle the `contended` structure
      if (Array.isArray(recentData.contended)) {
        // Case where `contended` is an array of objects and all `question` values must be in `contendedKeys`
        contendedValid = recentData.contended.every(
          (contention) =>
            contention &&
            typeof contention === "object" &&
            contendedKeys.includes(contention.question)
        );
      } else {
        // No `contended` condition for string type based on the provided information
        contendedValid = true; // or other conditions if needed
      }

      // Only include documents where both `selected` and `contended` are valid
      return selectedValid && contendedValid;
    });

    const uuids = startQuests.map((doc) => doc.uuid);
    const aaUuidUpdate = await AdvanceAnalytics.findOneAndUpdate(
      {
        userUuid: userUuid,
        questForeignKey: questForeignKey,
      },
      {
        usersUuids: uuids,
      },
      { new: true }
    );
    if (!aaUuidUpdate)
      return res
        .status(404)
        .json({ message: "Could not save users references." });

    return {
      ...data,
      QuestAnswers,
      result: updatedResult,
      participantsCount: uuids.length,
      optionsRemoved: data.optionsRemoved, // Include the updated optionsRemoved array
    };
  } catch (error) {
    // console.log(error.message);
    throw error;
  }
};

const badgeCountfx = async (data, userUuid, questForeignKey, sharedLinkOnly, oprend, range) => {
  try {
    const operator = operators[oprend];
    const selectedKeys = Object.keys(data.result[0]?.selected || {});
    const contendedKeys = Object.keys(data.result[0]?.contended || {});
    let conditionalMatch;
    if (sharedLinkOnly && sharedLinkOnly !== "" && sharedLinkOnly !== "undefined" && sharedLinkOnly !== "null") {
      if (isLinkValid(sharedLinkOnly)) {
        conditionalMatch = {
          questForeignKey: questForeignKey,
          userQuestSettingRef: sharedLinkOnly,
          $expr: { $gt: [{ $size: "$data" }, 0] },
        }
      }
      else {
        throw new Error("This link is not active");
      }
    }
    else {
      conditionalMatch = {
        questForeignKey: questForeignKey,
        $expr: { $gt: [{ $size: "$data" }, 0] },
      }
    }
    let startQuests = await StartQuests.aggregate([
      {
        $match: conditionalMatch,
      },
      {
        // Add a stage to extract the most recent document in the data array
        $addFields: {
          recentData: { $arrayElemAt: ["$data", -1] }, // Get the most recent data from the array
        },
      },
      {
        $match: {
          $or: [
            // Case 1: `selected` is a string and must match one of the `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "string" } }, // Ensure it's a string
                { "recentData.selected": { $in: selectedKeys } }, // Must match `selectedKeys`
              ],
            },
            // Case 2: `selected` is an array of objects and all `question` values must be in `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.selected": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: selectedKeys }, // Ensure all questions are in `selectedKeys`
                      },
                    },
                  },
                },
              ],
            },
            // Similarly, if you want to handle `contended` conditions:
            {
              $and: [
                { "recentData.contended": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.contended": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: contendedKeys }, // Ensure all questions are in `contendedKeys`
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users", // The name of the User collection
          localField: "uuid", // The field in StartQuests that matches User
          foreignField: "uuid", // The field in User to match
          as: "userDetails", // The name of the array field to hold matching documents
        },
      },
      {
        $unwind: "$userDetails", // Unwind the array to deconstruct the documents
      },
      {
        $match: {
          "userDetails.badges": { $exists: true }, // Ensure the badges field exists
          $expr: { [operator]: [{ $size: "$userDetails.badges" }, range] }, // Match based on badges array length
        },
      },
      {
        $project: {
          userDetails: 0, // Optionally exclude userDetails if you don't need it in the result
        },
      },
    ]);

    startQuests = startQuests.filter((doc) => {
      // Ensure `doc.recentData` exists
      const recentData = doc.recentData;
      if (!recentData) {
        return false; // Exclude documents where `recentData` is not present
      }

      let selectedValid = false;
      let contendedValid = false;

      // Handle the `selected` structure
      if (typeof recentData.selected === "string") {
        // Case where `selected` is a string and must match one of the `selectedKeys`
        selectedValid = selectedKeys.includes(recentData.selected);
      } else if (Array.isArray(recentData.selected)) {
        // Case where `selected` is an array of objects and all `question` values must be in `selectedKeys`
        selectedValid = recentData.selected.every(
          (selection) =>
            selection &&
            typeof selection === "object" &&
            selectedKeys.includes(selection.question)
        );
      }

      // Handle the `contended` structure
      if (Array.isArray(recentData.contended)) {
        // Case where `contended` is an array of objects and all `question` values must be in `contendedKeys`
        contendedValid = recentData.contended.every(
          (contention) =>
            contention &&
            typeof contention === "object" &&
            contendedKeys.includes(contention.question)
        );
      } else {
        // No `contended` condition for string type based on the provided information
        contendedValid = true; // or other conditions if needed
      }

      // Only include documents where both `selected` and `contended` are valid
      return selectedValid && contendedValid;
    });

    let result = [
      {
        selected: {},
        contended: {},
      },
    ];

    startQuests.forEach((doc) => {
      // Find the most recent `data` object based on the `created` field
      let recentData = doc.data.reduce((latest, current) => {
        return new Date(latest.created) > new Date(current.created)
          ? latest
          : current;
      });

      // Handle the first structure (where `selected` is a string)
      if (typeof recentData.selected === "string") {
        if (result[0].selected[recentData.selected]) {
          result[0].selected[recentData.selected]++;
        } else {
          result[0].selected[recentData.selected] = 1;
        }
      }

      // Handle the second structure (where `selected` and `contended` are arrays of objects)
      if (Array.isArray(recentData.selected)) {
        recentData.selected.forEach((selection) => {
          if (selection && typeof selection === "object") {
            Object.keys(selection).forEach((key) => {
              if (key === "question") {
                if (result[0].selected[selection[key]]) {
                  result[0].selected[selection[key]]++;
                } else {
                  result[0].selected[selection[key]] = 1;
                }
              }
            });
          }
        });
      }

      if (Array.isArray(recentData.contended)) {
        recentData.contended.forEach((contention) => {
          if (contention && typeof contention === "object") {
            Object.keys(contention).forEach((key) => {
              if (key === "question") {
                if (result[0].contended[contention[key]]) {
                  result[0].contended[contention[key]]++;
                } else {
                  result[0].contended[contention[key]] = 1;
                }
              }
            });
          }
        });
      }
    });

    // Store users references
    const uuids = startQuests.map((doc) => doc.uuid);
    const aaUuidUpdate = await AdvanceAnalytics.findOneAndUpdate(
      {
        userUuid: userUuid,
        questForeignKey: questForeignKey,
      },
      {
        usersUuids: uuids,
      },
      { new: true }
    );
    if (!aaUuidUpdate)
      return res
        .status(404)
        .json({ message: "Could not save users references." });

    return {
      ...data,
      totalStartQuest: startQuests.length,
      participantsCount: uuids.length,
      result,
    };
  } catch (error) {
    // console.log(error.message);
    throw error;
  }
};

const targetfx = async (
  data,
  userUuid,
  questForeignKey,
  sharedLinkOnly,
  targetedOptionsArray,
  targetedQuestForeignKey
) => {
  try {
    const selectedKeys = Object.keys(data.result[0]?.selected || {});
    const contendedKeys = Object.keys(data.result[0]?.contended || {});
    let conditionalMatch;
    if (sharedLinkOnly && sharedLinkOnly !== "" && sharedLinkOnly !== "undefined" && sharedLinkOnly !== "null") {
      if (isLinkValid(sharedLinkOnly)) {
        conditionalMatch = {
          questForeignKey: targetedQuestForeignKey,
          userQuestSettingRef: sharedLinkOnly,
        }
      }
      else {
        throw new Error("This link is not active");
      }
    }
    else {
      conditionalMatch = { questForeignKey: targetedQuestForeignKey }
    }
    let targetUuids = await StartQuests.aggregate([
      { $match: conditionalMatch }, // Step 1: Match targetedQuestForeignKey
      { $unwind: "$data" }, // Unwind the data array to work with each entry individually
      { $sort: { "data.created": -1 } }, // Sort by the created date in descending order to get the most recent first
      {
        $group: {
          _id: "$_id",
          uuid: { $first: "$uuid" }, // Extract the uuid of each document
          recentData: { $first: "$data" }, // Get the most recent data entry
        },
      },
      {
        $match: {
          $or: [
            // Check if selected is a string and matches the targetedOptionsArray
            { "recentData.selected": { $in: targetedOptionsArray } },
            // Check if selected is an array of objects with question fields
            { "recentData.selected.question": { $in: targetedOptionsArray } },
            // Check if contended is a string and matches the targetedOptionsArray
            { "recentData.contended": { $in: targetedOptionsArray } },
            // Check if contended is an array of objects with question fields
            { "recentData.contended.question": { $in: targetedOptionsArray } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          uuids: { $addToSet: "$uuid" }, // Collect all uuids that match the criteria
        },
      },
    ]);

    targetUuids = targetUuids.length > 0 ? targetUuids[0].uuids : [];

    let startQuests = await StartQuests.aggregate([
      // Step 1: Match documents by uuid and questForeignKey
      {
        $match: {
          uuid: { $in: targetUuids },
          questForeignKey: questForeignKey,
        },
      },
      // Step 2: Unwind the data array to process each element individually
      { $unwind: "$data" },
      // Step 3: Sort by the created field in descending order to get the most recent first
      { $sort: { "data.created": -1 } },
      // Step 4: Group by _id to keep only the most recent data
      {
        $group: {
          _id: "$_id",
          uuid: { $first: "$uuid" },
          questForeignKey: { $first: "$questForeignKey" },
          recentData: { $first: "$data" },
        },
      },
      // Step 5: Match to ensure recentData.selected or recentData.contended contain keys from result
      {
        $match: {
          $or: [
            // Case 1: `selected` is a string and must match one of the `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "string" } }, // Ensure it's a string
                { "recentData.selected": { $in: selectedKeys } }, // Must match `selectedKeys`
              ],
            },
            // Case 2: `selected` is an array of objects and all `question` values must be in `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.selected": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: selectedKeys }, // Ensure all questions are in `selectedKeys`
                      },
                    },
                  },
                },
              ],
            },
            // Similarly, if you want to handle `contended` conditions:
            {
              $and: [
                { "recentData.contended": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.contended": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: contendedKeys }, // Ensure all questions are in `contendedKeys`
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ]);

    startQuests = startQuests.filter((doc) => {
      // Ensure `doc.recentData` exists
      const recentData = doc.recentData;
      if (!recentData) {
        return false; // Exclude documents where `recentData` is not present
      }

      let selectedValid = false;
      let contendedValid = false;

      // Handle the `selected` structure
      if (typeof recentData.selected === "string") {
        // Case where `selected` is a string and must match one of the `selectedKeys`
        selectedValid = selectedKeys.includes(recentData.selected);
      } else if (Array.isArray(recentData.selected)) {
        // Case where `selected` is an array of objects and all `question` values must be in `selectedKeys`
        selectedValid = recentData.selected.every(
          (selection) =>
            selection &&
            typeof selection === "object" &&
            selectedKeys.includes(selection.question)
        );
      }

      // Handle the `contended` structure
      if (Array.isArray(recentData.contended)) {
        // Case where `contended` is an array of objects and all `question` values must be in `contendedKeys`
        contendedValid = recentData.contended.every(
          (contention) =>
            contention &&
            typeof contention === "object" &&
            contendedKeys.includes(contention.question)
        );
      } else {
        // No `contended` condition for string type based on the provided information
        contendedValid = true; // or other conditions if needed
      }

      // Only include documents where both `selected` and `contended` are valid
      return selectedValid && contendedValid;
    });

    // Initialize result as an array with one object
    let result = [
      {
        selected: {},
        contended: {},
      },
    ];

    startQuests.forEach((doc) => {
      const recentData = doc.recentData; // This is already the most recent data

      // Handle the first structure (where `selected` is a string)
      if (typeof recentData.selected === "string") {
        if (result[0].selected[recentData.selected]) {
          result[0].selected[recentData.selected]++;
        } else {
          result[0].selected[recentData.selected] = 1;
        }
      }

      // Handle the second structure (where `selected` and `contended` are arrays of objects)
      if (Array.isArray(recentData.selected)) {
        recentData.selected.forEach((selection) => {
          if (selection && typeof selection === "object") {
            if (selection.question) {
              if (result[0].selected[selection.question]) {
                result[0].selected[selection.question]++;
              } else {
                result[0].selected[selection.question] = 1;
              }
            }
          }
        });
      }

      if (Array.isArray(recentData.contended)) {
        recentData.contended.forEach((contention) => {
          if (contention && typeof contention === "object") {
            if (contention.question) {
              if (result[0].contended[contention.question]) {
                result[0].contended[contention.question]++;
              } else {
                result[0].contended[contention.question] = 1;
              }
            }
          }
        });
      }
    });

    const targetedAnswers = [
      ...Object.keys(result[0].selected),
      ...Object.keys(result[0].contended),
    ];

    const QuestAnswers = data.QuestAnswers;
    const filteredQuestAnswers = QuestAnswers.filter((answer) =>
      targetedAnswers.includes(answer.question)
    );
    const optionsRemoved = QuestAnswers.filter(
      (answer) => !targetedAnswers.includes(answer.question)
    );

    // Store users references
    const uuids = startQuests.map((doc) => doc.uuid);
    const aaUuidUpdate = await AdvanceAnalytics.findOneAndUpdate(
      {
        userUuid: userUuid,
        questForeignKey: questForeignKey,
      },
      {
        usersUuids: uuids,
      },
      { new: true }
    );
    if (!aaUuidUpdate)
      return res
        .status(404)
        .json({ message: "Could not save users references." });

    return {
      ...data,
      totalStartQuest: startQuests.length,
      participantsCount: uuids.length,
      result,
    };
    // }
  } catch (error) {
    // console.log(error.message);
    throw error;
  }
};

const activityfx = async (data, userUuid, questForeignKey, sharedLinkOnly, allParams) => {
  try {
    const selectedKeys = Object.keys(data.result[0]?.selected || {});
    const contendedKeys = Object.keys(data.result[0]?.contended || {});
    const operator = operators[allParams.operand];

    const switchCases = {
      twitter: {
        // Condition 1: Check for 'twitter' badge with followers
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges",
                  as: "badge",
                  cond: {
                    $and: [
                      { $eq: ["$$badge.accountName", "twitter"] },
                      {
                        [operator]: ["$$badge.followers", allParams.followers],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },
      sex: {
        // Check for sex
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges",
                  as: "badge",
                  cond: {
                    $and: [
                      {
                        $eq: ["$$badge.personal.sex", allParams.sex],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },
      relationship: {
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges",
                  as: "badge",
                  cond: {
                    $and: [
                      {
                        $eq: [
                          "$$badge.personal.relationshipStatus",
                          allParams.relationshipStatus,
                        ],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },
      currentCity: {
        // Check for sex
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges",
                  as: "badge",
                  cond: {
                    $and: [
                      {
                        $eq: [
                          "$$badge.personal.currentCity",
                          allParams.currentCity,
                        ],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },
      homeTown: {
        // Check for sex
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges",
                  as: "badge",
                  cond: {
                    $and: [
                      {
                        $eq: ["$$badge.personal.homeTown", allParams.homeTown],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },
      dateOfBirth: {
        // Check if the `dateOfBirth` is within the range
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges",
                  as: "badge",
                  cond: {
                    $and: [
                      {
                        $gte: ["$$badge.personal.dateOfBirth", allParams.from],
                      },
                      {
                        $lte: ["$$badge.personal.dateOfBirth", allParams.to],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },

      work: {
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges", // Access badges array
                  as: "badge",
                  cond: {
                    $and: [
                      {
                        $eq: [
                          {
                            $ifNull: [
                              {
                                $arrayElemAt: [
                                  `$$badge.personal.work.${allParams.fieldName}`,
                                  0,
                                ], // Safely access the field
                              },
                              null, // Default to null if not found
                            ],
                          },
                          allParams.fieldValue, // Match the provided field value
                        ],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },
      education: {
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges", // Access badges array
                  as: "badge",
                  cond: {
                    $and: [
                      {
                        $eq: [
                          {
                            $ifNull: [
                              {
                                $arrayElemAt: [
                                  `$$badge.personal.education.${allParams.fieldName}`,
                                  0,
                                ], // Safely access the field
                              },
                              null, // Default to null if not found
                            ],
                          },
                          allParams.fieldValue, // Match the provided field value
                        ],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },

      firstName: {
        // Check for sex
        case: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$userDetails.badges",
                  as: "badge",
                  cond: {
                    $ne: [
                      { $type: [`$$badge.personal.firstName`] }, // Check if the field type is not missing
                      "missing",
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
        then: true,
      },
    };

    let conditionalMatch;
    if (sharedLinkOnly && sharedLinkOnly !== "" && sharedLinkOnly !== "undefined" && sharedLinkOnly !== "null") {
      if (isLinkValid(sharedLinkOnly)) {
        conditionalMatch = {
          questForeignKey: questForeignKey,
          userQuestSettingRef: sharedLinkOnly,
          $expr: { $gt: [{ $size: "$data" }, 0] },
        }
      }
      else {
        throw new Error("This link is not active");
      }
    }
    else {
      conditionalMatch = {
        questForeignKey: questForeignKey,
        $expr: { $gt: [{ $size: "$data" }, 0] },
      }
    }

    let startQuests = await StartQuests.aggregate([
      {
        $match: conditionalMatch,
      },
      {
        // Add a stage to extract the most recent document in the data array
        $addFields: {
          recentData: { $arrayElemAt: ["$data", -1] }, // Get the most recent data from the array
        },
      },
      {
        $match: {
          $or: [
            // Case 1: `selected` is a string and must match one of the `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "string" } }, // Ensure it's a string
                { "recentData.selected": { $in: selectedKeys } }, // Must match `selectedKeys`
              ],
            },
            // Case 2: `selected` is an array of objects and all `question` values must be in `selectedKeys`
            {
              $and: [
                { "recentData.selected": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.selected": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: selectedKeys }, // Ensure all questions are in `selectedKeys`
                      },
                    },
                  },
                },
              ],
            },
            // Similarly, if you want to handle `contended` conditions:
            {
              $and: [
                { "recentData.contended": { $type: "array" } }, // Ensure it's an array
                {
                  "recentData.contended": {
                    $not: {
                      $elemMatch: {
                        question: { $nin: contendedKeys }, // Ensure all questions are in `contendedKeys`
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users", // The name of the User collection
          localField: "uuid", // The field in StartQuests that matches User
          foreignField: "uuid", // The field in User to match
          as: "userDetails", // The name of the array field to hold matching documents
        },
      },
      {
        $unwind: "$userDetails", // Unwind the array to deconstruct the documents
      },
      {
        $addFields: {
          conditionMet: {
            $switch: {
              branches: [
                switchCases[allParams.subtype] || { case: false, then: false },
              ],
              default: false, // If none of the conditions are met, return false
            },
          },
        },
      },
      {
        $match: {
          conditionMet: true, // Only match documents where the condition is met
        },
      },
      {
        $project: {
          userDetails: 0, // Optionally exclude userDetails if you don't need it in the result
        },
      },
    ]);

    startQuests = startQuests.filter((doc) => {
      // Ensure `doc.recentData` exists
      const recentData = doc.recentData;
      if (!recentData) {
        return false; // Exclude documents where `recentData` is not present
      }

      let selectedValid = false;
      let contendedValid = false;

      // Handle the `selected` structure
      if (typeof recentData.selected === "string") {
        // Case where `selected` is a string and must match one of the `selectedKeys`
        selectedValid = selectedKeys.includes(recentData.selected);
      } else if (Array.isArray(recentData.selected)) {
        // Case where `selected` is an array of objects and all `question` values must be in `selectedKeys`
        selectedValid = recentData.selected.every(
          (selection) =>
            selection &&
            typeof selection === "object" &&
            selectedKeys.includes(selection.question)
        );
      }

      // Handle the `contended` structure
      if (Array.isArray(recentData.contended)) {
        // Case where `contended` is an array of objects and all `question` values must be in `contendedKeys`
        contendedValid = recentData.contended.every(
          (contention) =>
            contention &&
            typeof contention === "object" &&
            contendedKeys.includes(contention.question)
        );
      } else {
        // No `contended` condition for string type based on the provided information
        contendedValid = true; // or other conditions if needed
      }

      // Only include documents where both `selected` and `contended` are valid
      return selectedValid && contendedValid;
    });

    let result = [
      {
        selected: {},
        contended: {},
      },
    ];

    startQuests.forEach((doc) => {
      // Find the most recent `data` object based on the `created` field
      let recentData = doc.data.reduce((latest, current) => {
        return new Date(latest.created) > new Date(current.created)
          ? latest
          : current;
      });

      // Handle the first structure (where `selected` is a string)
      if (typeof recentData.selected === "string") {
        if (result[0].selected[recentData.selected]) {
          result[0].selected[recentData.selected]++;
        } else {
          result[0].selected[recentData.selected] = 1;
        }
      }

      // Handle the second structure (where `selected` and `contended` are arrays of objects)
      if (Array.isArray(recentData.selected)) {
        recentData.selected.forEach((selection) => {
          if (selection && typeof selection === "object") {
            Object.keys(selection).forEach((key) => {
              if (key === "question") {
                if (result[0].selected[selection[key]]) {
                  result[0].selected[selection[key]]++;
                } else {
                  result[0].selected[selection[key]] = 1;
                }
              }
            });
          }
        });
      }

      if (Array.isArray(recentData.contended)) {
        recentData.contended.forEach((contention) => {
          if (contention && typeof contention === "object") {
            Object.keys(contention).forEach((key) => {
              if (key === "question") {
                if (result[0].contended[contention[key]]) {
                  result[0].contended[contention[key]]++;
                } else {
                  result[0].contended[contention[key]] = 1;
                }
              }
            });
          }
        });
      }
    });

    // Store users references
    const uuids = startQuests.map((doc) => doc.uuid);
    const aaUuidUpdate = await AdvanceAnalytics.findOneAndUpdate(
      {
        userUuid: userUuid,
        questForeignKey: questForeignKey,
      },
      {
        usersUuids: uuids,
      },
      { new: true }
    );
    if (!aaUuidUpdate)
      return res
        .status(404)
        .json({ message: "Could not save users references." });

    return {
      ...data,
      totalStartQuest: startQuests.length,
      participantsCount: uuids.length,
      result,
    };
  } catch (error) {
    // console.log(error.message);
    throw error;
  }
};

const createInfoQuestQuest = async (req, res) => {
  try {
    const userBalance = await getUserBalance(req.body.uuid);
    // if (userBalance < QUEST_CREATED_AMOUNT)
    //   throw new Error("The balance is insufficient to create a Quest!");
    // Find the user by uuid
    const user = await User.findOne({ uuid: req.body.uuid });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const questAlreadyExist = await InfoQuestQuestions.findOne({
      Question: req.body.Question,
    });
    if (questAlreadyExist) return res.status(403).send("Quest already exist.");

    // Determine the questAnswers based on whichTypeQuestion
    const questAnswers = optionsMapping[req.body.whichTypeQuestion]
      ? optionsMapping[req.body.whichTypeQuestion]
      : req.body.QuestAnswers || []; // Add a new `_id` field with a unique ObjectId to each object in `questAnswers`
    const updatedQuestAnswers = questAnswers.map((answer) => ({
      ...answer,
      _id: new mongoose.Types.ObjectId(),
    }));

    const question = await new InfoQuestQuestions({
      Question: req.body.Question,
      QuestionCorrect: req.body.QuestionCorrect,
      whichTypeQuestion: req.body.whichTypeQuestion,
      generalType: req.body.type,
      usersAddTheirAns: req.body.usersAddTheirAns || false,
      usersChangeTheirAns: req.body.usersChangeTheirAns,
      QuestTopic: req.body.QuestTopic,
      userCanSelectMultiple: req.body.userCanSelectMultiple,
      QuestAnswers: updatedQuestAnswers ? updatedQuestAnswers : [],
      QuestAnswersSelected:
        req.body.QuestAnswersSelected === undefined
          ? []
          : req.body.QuestAnswersSelected,
      uuid: req.body.uuid,
      getUserBadge: user._id,
      uniqueShareLink: shortLink.generate(8),
      moderationRatingCount: req.body.moderationRatingCount,
      url: req.body.url,
      description: req.body.description,
      isActive: true,
    });

    const createdQuestion = await question.save();
    if (!createdQuestion) {
      return res.status(404).send("Not Created 1");
    }

    // Increment the questsCreated field by one
    user.questsCreated += 1;

    // Push the ID of the created question into the createdQuests array
    user.createdQuests?.push(createdQuestion._id);
    // await User.findOneAndUpdate(
    //   { uuid: req.body.uuid },
    //   {
    //     $push: { createdQuests: createdQuestion._id },
    //   }
    // );

    // Save the updated user object
    await user.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postCreated",
      txID: txID,
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: createdQuestion._id,
      // txDescription : "User creates a new quest"
    });
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postCreated",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: user.uuid,
      txAmount: QUEST_CREATED_AMOUNT,
      txData: createdQuestion._id,
      // txDescription : "Incentive for creating a quest"
    });
    // Increment the Treasury
    await updateTreasury({ amount: QUEST_CREATED_AMOUNT, dec: true });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: QUEST_CREATED_AMOUNT,
      inc: true,
    });

    user.fdxEarned = user.fdxEarned + QUEST_CREATED_AMOUNT;
    user.feeSchedual.creatingPostFdx =
      user.feeSchedual.creatingPostFdx + QUEST_CREATED_AMOUNT;
    await user.save();

    if (
      (req.body.articleId && !req.body.suggestionTitle) ||
      (!req.body.articleId && req.body.suggestionTitle)
    ) {
      return res.status(400).json({
        error:
          "Both 'articleId' and 'suggestionTitle' must be provided together.",
      });
    }

    if (req.body.articleId && req.body.suggestionTitle) {
      const updatedArticle = await Article.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(req.body.articleId),
        },
        {
          $pull: {
            suggestions: {
              statement: req.body.suggestionTitle,
            },
          },
          $push: { source: createdQuestion._id.toString() },
        },
        { new: true } // This option returns the modified document
      );
      if (!updatedArticle) {
        return res.status(404).send("Article not found");
      }
    }

    await QuestRagUpdate.findOneAndUpdate(
      {},
      {
        $addToSet: { dailyQuestsToEmbed: createdQuestion._id.toString() }, // Use $addToSet to ensure uniqueness
      },
      { new: true, upsert: true } // Return the updated document, create if it doesn't exist
    );

    if (req.body.sharePost && req.body.spotlight) {
      let requestBody;
      // console.log(req.body.sharePost, req.body.spotlight)
      if (req?.body?.sharePost === "true" && req?.body?.spotlight === "false") {
        requestBody = {
          body:
          {
            uuid: req?.body?.uuid,
            questForeignKey: createdQuestion?._id,
            uniqueLink: true,
            Question: createdQuestion?.Question,
            linkStatus: "Enable",
            isGenerateLink: true,
            sharedTime: new Date().toISOString(),
            spotLight: false
          },
          params: {
            fxCall: "true",
          }
        }
        await link(requestBody);
      }

      if (req?.body?.sharePost === "true" && req?.body?.spotlight === "true") {
        // Fetch documents with spotLight set to true
        const [spotLightArticle, spotLightInfoQuest, spotLightUserList] =
          await Promise.all([
            ArticleSetting.findOne({ userUuid: req.body.uuid, spotLight: true }),
            UserQuestSetting.findOne({ uuid: req.body.uuid, spotLight: true }),
            UserListSchema.findOne(
              { userUuid: req.body.uuid, "list.spotLight": true },
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
        requestBody = {
          body:
          {
            uuid: req?.body?.uuid,
            questForeignKey: createdQuestion?._id,
            uniqueLink: true,
            Question: createdQuestion?.Question,
            linkStatus: "Enable",
            isGenerateLink: true,
            sharedTime: new Date().toISOString(),
            spotLight: true,
          },
          params: {
            fxCall: "true",
          }
        }
        await link(requestBody);
      }
    }

    res.status(201).json({
      message: "Quest has been Created",
      questID: createdQuestion._id,
      moderationRatingCount: req.body.moderationRatingCount,
    });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while createInfoQuestQuest: ${error.message}`,
    });
  }
};

const deleteInfoQuestQuest = async (req, res) => {
  try {
    // Treasury Check
    // const checkTreasury = await Treasury.findOne();
    // if (!checkTreasury)
    //   return res.status(404).json({ message: "Treasury is not found." });
    // if (
    //   Math.round(checkTreasury.amount) <= QUEST_CREATED_AMOUNT ||
    //   Math.round(checkTreasury.amount) <= 0
    // )
    //   return res.status(404).json({ message: "Treasury is not enough." });

    const userBalanceCheck = await User.findOne({
      uuid: req.params.userUuid,
    });
    if (userBalanceCheck.balance < QUEST_CREATED_AMOUNT)
      return res.status(404).json({ message: "Balance is not enough." });

    const infoQuest = await InfoQuestQuestions.findOne({
      _id: req.params.questId,
      uuid: req.params.userUuid,
    });

    if (!infoQuest) return res.status(404).send("Info Quest not found");

    if (infoQuest.interactingCounter >= 1)
      return res.status(403).json({
        message: "Quest is involved in Discussion, Quest can't be deleted.",
      }); // Not neccessry if we add the check at FE to remove the delete icon from those who have { usersAddTheirAns: true }

    await InfoQuestQuestions.deleteOne({
      _id: req.params.questId,
      uuid: req.params.userUuid,
    }).exec();

    // Delete and Save Info Quest
    // infoQuest.isActive = false;
    // await infoQuest.save();

    // Remove from hiddens and shared
    await UserQuestSetting.deleteMany({
      questForeignKey: req.params.questId,
    }).exec();

    // Remove Relative Bookmarks
    await BookmarkQuests.deleteMany({
      questForeignKey: req.params.questId,
    }).exec();

    // Remove Posts from Relative Lists
    const userLists = await UserListSchema.aggregate([
      { $unwind: "$list" },
      { $unwind: "$list.post" },
      {
        $match: {
          "list.post.questForeginKey": new mongoose.Types.ObjectId(
            req.params.questId
          ),
        },
      },
      { $group: { _id: "$_id", count: { $sum: 1 } } },
    ]);

    // Step 2: Remove the posts
    await UserListSchema.updateMany(
      {
        "list.post.questForeginKey": new mongoose.Types.ObjectId(
          req.params.questId
        ),
      },
      {
        $pull: {
          "list.$[].post": {
            questForeginKey: new mongoose.Types.ObjectId(req.params.questId),
          },
        },
      }
    );

    // Step 3: Decrement the postCounter
    for (const userList of userLists) {
      await UserListSchema.updateOne(
        { _id: userList._id },
        {
          $inc: {
            "list.$[].postCounter": -1,
          },
        }
      );
    }

    // Set Up User's Details
    const user = await User.findOne({ uuid: req.params.userUuid });

    // Decrement the questsCreated field by one
    user.questsCreated -= 1;
    await user.save();

    await Article.updateMany(
      { source: req.params.questId }, // Find documents where source contains the questId
      { $pull: { source: req.params.questId } } // Remove the questId from the source array
    );
    // console.log("Post Also deleted from Articles");

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postDeleted",
      txID: txID,
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "DAO",
      txAmount: 0,
      txData: req.params.questId,
      txDate: Date.now(),
      txDescription: "User deleted a Post",
    });
    // Create Ledger
    await createLedger({
      uuid: user.uuid,
      txUserAction: "postDeleted",
      txID: txID,
      txAuth: "DAO",
      txFrom: user.uuid,
      txTo: "DAO Treasury",
      txAmount: QUEST_CREATED_AMOUNT,
      txDate: Date.now(),
      txDescription: "User deleted a Post",
      txData: req.params.questId,
      // txDescription : "Incentive for creating a quest"
    });
    // Increment the Treasury
    await updateTreasury({ amount: QUEST_CREATED_AMOUNT, inc: true });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.params.userUuid,
      amount: QUEST_CREATED_AMOUNT,
      dec: true,
    });

    user.fdxSpent = user.fdxSpent + QUEST_CREATED_AMOUNT;
    await user.save();

    res
      .status(200)
      .json({ message: "Info quest question deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: `An error occurred: ${error.message}` });
  }
};

const constraintForUniqueQuestion = async (req, res) => {
  try {
    // Get the question from the query parameters and convert it to lowercase
    const queryQuestion = req.query.question?.toLowerCase();

    // Escape special characters in the input query to ensure a literal match
    const escapedQuery = queryQuestion.replace(
      /[-[\]{}()*+?.,\\^$|#\s]/g,
      "\\$&"
    );

    // Check for a matching question in a case-insensitive manner
    const matchingQuestion = await InfoQuestQuestions.findOne({
      Question: { $regex: new RegExp(`^${escapedQuery}$`, "i") },
      suppressed: { $ne: true },
    });

    if (matchingQuestion && matchingQuestion?.isActive) {
      // If a matching question is found, it's not unique
      return res.status(200).json({ isUnique: false });
    }

    // If no matching question is found, it's unique
    return res.status(200).json({ isUnique: true });
  } catch (error) {
    // console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};
const getAllQuests = async (req, res) => {
  try {
    const Questions = await InfoQuestQuestions.find();
    const resultArray = Questions.map(getPercentage);
    res.status(200).json(resultArray);
  } catch (err) {
    res.status(500).send(err);
  }
};
const getAllQuestsWithOpenInfoQuestStatus = async (req, res) => {
  try {
    const { moderationRatingFilter } = req.body;
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $in: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      //  filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
        moderationRatingCount: {
          $gte: moderationRatingFilter?.initial,
          $lte: moderationRatingFilter?.final,
        },
      }).sort({ createdAt: -1 });
      // .sort(
      //   req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
          moderationRatingCount: {
            $gte: moderationRatingFilter?.initial,
            $lte: moderationRatingFilter?.final,
          },
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // moderation filter
      filterObj.moderationRatingCount = {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      };
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        // .sort({ createdAt: -1 })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
              ? { lastInteractedAt: -1 }
              : req.body.sort === "Most Popular"
                ? { interactingCounter: -1 }
                : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      let Result = [];
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });
      //// console.log("startedQuestions", startedQuestions);
      //// console.log("allQuestions", allQuestions.length);
      await allQuestions.map(async function (rcrd) {
        let startedOrNot = false;
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            startedOrNot = true;
          }
        });
        if (startedOrNot === false) {
          Result.push(rcrd);
        }
      });
      const start = req.body.start;
      const end = req.body.end;
      //// console.log("Start" + start + "end" + end);

      const resultArray = Result.slice(start, end).map(getPercentage);
      //// console.log("resultArray", resultArray.length);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));
      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    //// console.log(err);
    res.status(500).send(err);
  }
};

const getAllQuestsWithAnsweredStatus = async (req, res) => {
  try {
    const { moderationRatingFilter } = req.body;
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $in: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      // filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
        moderationRatingCount: {
          $gte: moderationRatingFilter?.initial,
          $lte: moderationRatingFilter?.final,
        },
      }).sort({ createdAt: -1 });
      // .sort(
      //   req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
          moderationRatingCount: {
            $gte: moderationRatingFilter?.initial,
            $lte: moderationRatingFilter?.final,
          },
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt");

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt");

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // moderation filter
      filterObj.moderationRatingCount = {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      };
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      //// console.log("🚀 ~ getAllQuestsWithAnsStatus ~ hiddenUserSettingIds:",hiddenUserSettingIds);
      //// console.log("🚀 ~ getAllQuestsWithAnsStatus ~ filterObj:", filterObj);

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        // .sort({ createdAt: -1 })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
              ? { lastInteractedAt: -1 }
              : req.body.sort === "Most Popular"
                ? { interactingCounter: -1 }
                : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      //// console.log("req.body.uuid", req.body.uuid);
      let Records = [];
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });

      //// console.log("startedQuestions", startedQuestions);
      //// console.log("allQuestions", allQuestions.length);

      await allQuestions.map(async function (rcrd) {
        let startedOrNot = false;
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            startedOrNot = true;
          }
        });
        if (startedOrNot === true) {
          Records.push(rcrd);
        }
      });
      //// console.log("Records", Records.length);
      let Result = [];
      await Records.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            rcrd.startQuestData = rec;
            if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
              rcrd.startStatus = "change answer";
            } else {
              rcrd.startStatus = "completed";
            }
          }
        });

        Result.push(rcrd);
      });

      const start = req.body.start;
      const end = req.body.end;
      //// console.log("Start" + start + "end" + end);

      const resultArray = Result.slice(start, end).map(getPercentage);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));

      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    res.status(500).send(err);
    //// console.log(err);
  }
};

const getAllQuestsWithDefaultStatus = async (req, res) => {
  const {
    uuid,
    _page,
    _limit,
    filter,
    sort,
    type,
    Page,
    terms,
    blockedTerms,
    moderationRatingFilter,
  } = req.body;
  const page = parseInt(_page);
  const pageSize = parseInt(_limit);

  // Calculate the number of documents to skip to get to the desired page
  const skip = (page - 1) * pageSize;
  let allQuestions = [];
  let filterObj = {};
  let totalQuestionsCount;
  //// console.log("blockedTerms", blockedTerms);
  if (filter === true) {
    if (Page === "Bookmark") {
      filterObj.createdBy = uuid;
    } else {
      //// console.log("My Post Else");
      filterObj.uuid = uuid;
    }
  }

  if (type) {
    filterObj.whichTypeQuestion = type;
  }
  if (terms && terms.length > 0) {
    const regexTerm = terms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: regexTerm };
  } else if (blockedTerms && blockedTerms.length > 0) {
    // const regexBlockterms = blockedTerms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: blockedTerms };

    // const hiddenQuestList = await InfoQuestQuestions.find({
    //   QuestTopic: { $in: blockedTerms },
    // });

    // const mapPromises = hiddenQuestList.map(async (item) => {
    //   const userQuestSettingExist = await UserQuestSetting.findOne({
    //     uuid: uuid,
    //     questForeignKey: item._id,
    //   });

    //   if (userQuestSettingExist) {
    //     // If userQuestSetting exists, update it
    //     await UserQuestSetting.findOneAndUpdate(
    //       { uuid: uuid, questForeignKey: item._id },
    //       { hidden: true }
    //     );
    //   } else {
    //     // If userQuestSetting does not exist, create it
    //     await UserQuestSetting.create({
    //       uuid: uuid,
    //       questForeignKey: item._id,
    //       hidden: true,
    //     });
    //   }
    // });

    // // Use Promise.allSettled to handle errors without stopping execution
    // await Promise.allSettled(mapPromises);
  }
  //// console.log("Outside Bookmark");
  if (Page === "Bookmark") {
    //// console.log("Inside Bookmark");
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    // filterObj.uuid = uuid;
    const Questions = await BookmarkQuests.find({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      },
    })
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    //// console.log("Questions Length", Questions.length);
    //// console.log("Bookmark filterObj", filterObj);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
        ...filterObj,
        moderationRatingCount: {
          $gte: moderationRatingFilter?.initial,
          $lte: moderationRatingFilter?.final,
        },
      }).populate("getUserBadge", "badges");
    });
    //// console.log(mapPromises);

    allQuestions = await Promise.all(mapPromises);
    allQuestions = allQuestions.filter((question) => question !== null);
    totalQuestionsCount = await BookmarkQuests.countDocuments({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingFilter?.initial,
        $lte: moderationRatingFilter?.final,
      },
    });

    //// console.log("allQuestionsBookmark", allQuestions.length);
  } else if (Page === "Hidden") {
    //// console.log("running");
    filterObj.uuid = uuid;
    filterObj.hidden = true;
    const Questions = await UserQuestSetting.find(filterObj)
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (req.body.Page === "SharedLink") {
    //// console.log("running");
    filterObj.uuid = uuid;
    filterObj.linkStatus = { $in: ["Enable", "Disable"] };
    //// console.log("filterObj", filterObj);
    const Questions = await UserQuestSetting.find(filterObj)
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .limit(pageSize)
      .skip(skip);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else {
    // moderation filter
    filterObj.moderationRatingCount = {
      $gte: moderationRatingFilter?.initial,
      $lte: moderationRatingFilter?.final,
    };
    // First, find UserQuestSettings with hidden: false
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    //// console.log("🚀 ~ getAllQuestsWithDefaultStatus ~ filterObj:", filterObj);
    allQuestions = await InfoQuestQuestions.find({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    })
      // .sort({ createdAt: -1 })
      .sort(
        sort === "Newest First"
          ? { createdAt: -1 }
          : sort === "Last Updated"
            ? { lastInteractedAt: -1 }
            : sort === "Most Popular"
              ? { interactingCounter: -1 }
              : "createdAt"
      )
      .skip(skip)
      .limit(pageSize)
      .populate("getUserBadge", "badges");
    totalQuestionsCount = await InfoQuestQuestions.countDocuments({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    });
  }

  //// console.log("allQuestionsData", allQuestions.length);

  const resultArray = allQuestions.map((item) => getPercentage(item));
  const desiredArray = resultArray.map((item) => ({
    ...item._doc,
    selectedPercentage: item?.selectedPercentage?.[0]
      ? [
        Object.fromEntries(
          Object.entries(item.selectedPercentage[0]).sort(
            (a, b) => parseInt(b[1]) - parseInt(a[1])
          )
        ),
      ]
      : [],
    contendedPercentage: item?.contendedPercentage?.[0]
      ? [
        Object.fromEntries(
          Object.entries(item.contendedPercentage[0]).sort(
            (a, b) => parseInt(b[1]) - parseInt(a[1])
          )
        ),
      ]
      : [],
  }));
  // Query the database with skip and limit options to get questions for the requested page
  const result = await getQuestionsWithStatus(desiredArray, uuid);

  // getQuestionsWithUserSettings
  const result1 = await getQuestionsWithUserSettings(result, uuid);

  res.status(200).json({
    data: result1,
    hasNextPage: skip + pageSize < totalQuestionsCount,
  });
};
const suppressConditions = [
  { id: "Has Mistakes or Errors", minCount: 2 },
  { id: "Needs More Options", minCount: 2 },
  { id: "Unclear / Doesn’t make Sense", minCount: 2 },
  { id: "Duplicate / Similar Post", minCount: 2 },
  { id: "Not interested", minCount: Number.POSITIVE_INFINITY },
  { id: "Does not apply to me", minCount: Number.POSITIVE_INFINITY },
  { id: "Historical / Past Event", minCount: Number.POSITIVE_INFINITY },
];
const getQuestsAll = async (req, res) => {
  let {
    uuid,
    _page,
    _limit,
    filter,
    sort,
    type,
    Page,
    terms,
    blockedTerms,
    moderationRatingInitial,
    moderationRatingFinal,
    participated,
    start,
    end,
    media,
    email,
    fetchProfile,
    viewerUuid,
  } = req.query;
  const page = parseInt(_page);
  const pageSize = parseInt(_limit);

  let domainOwner;

  if (
    req.query.domain !== "null" &&
    req.query.domain !== "undefined" &&
    req.query.domain !== null &&
    req.query.domain !== undefined &&
    req.query.domain
  ) {
    domainOwner = await UserModel.findOne({
      badges: {
        $elemMatch: {
          "domain.name": req.query.domain,
          domain: { $exists: true, $ne: null }, // Ensure domain exists and is not null
        },
      },
    });
    uuid = domainOwner?.uuid;
  }

  //// console.log("blockedTerms", blockedTerms);

  // Calculate the number of documents to skip to get to the desired page
  const skip = (page - 1) * pageSize;
  let allQuestions = [];
  let filterObj = {};
  let totalQuestionsCount;

  if (sort === "Most Popular") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // console.log("date", sevenDaysAgo);
    filterObj.createdAt = { $gte: sevenDaysAgo };
    if (email === "true") {
      // Get the current date and the date from seven days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Retrieve the `recentWeekPostIds` array from the database
      const weeklySentRecord = await WeeklySent.findOne();
      let recentWeekPostIds = weeklySentRecord
        ? weeklySentRecord.recentWeekPostIds
        : [];

      // Find posts from the last seven days, excluding those in `recentWeekPostIds`
      const emailQuests = await InfoQuestQuestions.find({
        createdAt: { $gte: sevenDaysAgo }, // Filter for posts created in the last seven days
        moderationRatingCount: {
          $gte: moderationRatingInitial,
          $lte: moderationRatingFinal,
        },
        isActive: true,
        suppressed: false,
        _id: { $nin: recentWeekPostIds }, // Exclude already sent posts
      })
        .sort({ interactingCounter: -1, _id: 1 })
        .limit(5);

      // Get the new post IDs and update `recentWeekPostIds` in the database
      const newPostIds = emailQuests.map((post) => post._id);
      recentWeekPostIds = [...recentWeekPostIds, ...newPostIds];

      // Update `recentWeekPostIds` in the database and keep only the most recent ones
      await WeeklySent.updateOne(
        {}, // Assuming a single document, update without a filter
        { $set: { recentWeekPostIds } },
        { upsert: true } // Create the document if it doesn't exist
      );

      return res.status(200).json({
        data: emailQuests.length > 0 ? emailQuests : [],
      });
    }
  }

  if (sort === "Wow") {
    filterObj.isAboveThePercentage = true;
  }

  if (filter === "true") {
    //// console.log("filter");
    if (Page === "Bookmark") {
      filterObj.createdBy = uuid;
    } else {
      //// console.log("My Post Else");
      filterObj.uuid = uuid;
    }
  }

  if (type !== "All") {
    filterObj.whichTypeQuestion = type;
  }

  if (media === "None") {
    filterObj.url = { $exists: true, $size: 0 };
  } else if (media !== "All") {
    if (media === "Video") {
      filterObj.$or = [
        { url: { $regex: "youtube.com", $options: "i" } },
        { url: { $regex: "youtu.be", $options: "i" } },
        { url: { $regex: "youtube-nocookie.com", $options: "i" } },
      ];
    }

    if (media === "Image") {
      filterObj.url = { $regex: "live.staticflickr.com", $options: "i" };
    }

    if (media === "Music") {
      filterObj.url = { $regex: "soundcloud.com", $options: "i" };
    }

    if (media === "Giphy") {
      filterObj.url = { $regex: "giphy.com", $options: "i" };
    }
  }

  if (terms) {
    // const regexTerm = terms.map((term) => new RegExp(term, "i"));
    // filterObj.QuestTopic = { $in: regexTerm };
    const regex = { $regex: terms, $options: "i" };

    filterObj.$or = [
      { Question: regex },
      { whichTypeQuestion: regex },
      { "QuestAnswers.question": regex },
      { QuestTopic: regex },
      { description: regex },
    ];

    // $or: [
    //   { Question: { $regex: terms, $options: "i" } },
    //   { whichTypeQuestion: { $regex: terms, $options: "i" } },
    //   { "QuestAnswers.question": { $regex: terms, $options: "i" } },
    //   { QuestTopic: { $regex: terms, $options: "i" } },
    //   { description: { $regex: terms, $options: "i" } },
    // ]

    // filterObj.Question = regex;
  } else if (blockedTerms && blockedTerms.length > 0) {
    // const regexBlockterms = blockedTerms.map((term) => new RegExp(term, "i"));
    const blockedTermsArray = JSON.parse(blockedTerms);
    filterObj.QuestTopic = { $in: blockedTermsArray };
    // filterObj.QuestTopic = { $in: blockedTerms };

    // const hiddenQuestList = await InfoQuestQuestions.find({
    //   QuestTopic: { $in: blockedTerms },
    // });

    // const mapPromises = hiddenQuestList.map(async (item) => {
    //   const userQuestSettingExist = await UserQuestSetting.findOne({
    //     uuid: uuid,
    //     questForeignKey: item._id,
    //   });

    //   if (userQuestSettingExist) {
    //     // If userQuestSetting exists, update it
    //     await UserQuestSetting.findOneAndUpdate(
    //       { uuid: uuid, questForeignKey: item._id },
    //       { hidden: true }
    //     );
    //   } else {
    //     // If userQuestSetting does not exist, create it
    //     await UserQuestSetting.create({
    //       uuid: uuid,
    //       questForeignKey: item._id,
    //       hidden: true,
    //     });
    //   }
    // });

    // // Use Promise.allSettled to handle errors without stopping execution
    // await Promise.allSettled(mapPromises);
  }

  //// console.log("Outside Bookmark");
  if (Page === "Bookmark") {
    //// console.log("Inside Bookmark");
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    // filterObj.uuid = uuid;
    const Questions = await BookmarkQuests.find({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingInitial,
        $lte: moderationRatingFinal,
      },
    })
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    //// console.log("Questions Length", Questions.length);
    //// console.log("Bookmark filterObj", filterObj);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
        ...filterObj,

        moderationRatingCount: {
          $gte: moderationRatingInitial,
          $lte: moderationRatingFinal,
        },
      }).populate("getUserBadge", "badges");
    });
    //// console.log(mapPromises);

    allQuestions = await Promise.all(mapPromises);
    allQuestions = allQuestions.filter((question) => question !== null);
    totalQuestionsCount = await BookmarkQuests.countDocuments({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
      moderationRatingCount: {
        $gte: moderationRatingInitial,
        $lte: moderationRatingFinal,
      },
    });

    //// console.log("allQuestionsBookmark", allQuestions.length);
  } else if (Page === "Hidden") {
    //// console.log("running");
    filterObj.uuid = uuid;
    // filterObj.hidden = true;
    // filterObj.feedbackMessage = { $ne: "", $exists: true };
    filterObj.$or = [
      { feedbackMessage: { $ne: "", $exists: true } },
      { hidden: true },
    ];
    const Questions = await UserQuestSetting.find(filterObj)
      .sort({ feedbackTime: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .skip(skip)
      .limit(pageSize);

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    // Filter out suppressed questions if req.query.uuid does not match uuid
    // if (req.query.uuid) {
    //   allQuestions = allQuestions.filter((question) => {
    //     return !question.suppressed || question.uuid === req.query.uuid;
    //   });
    // } else {
    //   allQuestions = allQuestions.filter((question) => !question.suppressed);
    // }
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (Page === "SharedLink") {
    //// console.log("running");
    filterObj.uuid = uuid;
    if (req.query.domain && req.query.isPublicProfile === "true") {
      filterObj.linkStatus = { $in: ["Enable"] };
    }
    else if (req.query.viewerUuid && req.query.isPublicProfile === "false") {
      filterObj.linkStatus = { $in: ["Enable", "Disable"] };
    }
    else {
      filterObj.linkStatus = { $in: ["Enable", "Disable"] };
    }
    //// console.log("filterObj", filterObj);
    let Questions;
    // if (fetchProfile === "true") {
    //   Questions = await UserQuestSetting.find(filterObj).sort({
    //     createdAt: -1,
    //   });
    // } else {
    Questions = await UserQuestSetting.find(filterObj)
      .sort({ createdAt: -1 })
      // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt")
      .limit(pageSize)
      .skip(skip);
    // }

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (Page === "Feedback") {
    const hiddenUserSettings = await UserQuestSetting.find({
      feedbackMessage: { $ne: "", $exists: true },
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    allQuestions = await InfoQuestQuestions.find({
      _id: { $in: hiddenUserSettingIds },
      uuid: uuid,
      ...filterObj,
      isActive: true,
    })
      .populate("getUserBadge", "badges")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(skip);
    //// console.log("all", allQuestions);
  } else {
    // moderation filter
    filterObj.moderationRatingCount = {
      $gte: moderationRatingInitial,
      $lte: moderationRatingFinal,
    };

    // First, find UserQuestSettings with hidden: false
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );
    //// console.log("🚀 ~ getQuestsAll ~ hiddenUserSettingIds:",hiddenUserSettingIds);
    //// console.log("🚀 ~ getQuestsAll ~ filterObj:", filterObj);

    // let query = InfoQuestQuestions.find({
    //   _id: { $nin: hiddenUserSettingIds },
    //   ...filterObj,
    //   isActive: true,
    // });

    let query;
    if (terms) {
      query = InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        isActive: true,
        $or: [
          { suppressed: true, uuid: req.query.uuid },
          { suppressed: false },
        ],
        $or: [...filterObj.$or],
      });
    } else {
      query = InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        isActive: true,
        $or: [
          { suppressed: true, uuid: req.query.uuid },
          { suppressed: false },
        ],
        ...filterObj,
      });
    }

    query = query.sort(
      sort === "Wow"
        ? { createdAt: -1, _id: 1 }
        : sort === "Oldest First"
          ? { createdAt: 1, _id: 1 }
          : sort === "Newest First"
            ? { createdAt: -1, _id: 1 }
            : sort === "Last Updated"
              ? { lastInteractedAt: -1, _id: 1 }
              : sort === "Most Popular"
                ? { interactingCounter: -1, _id: 1 }
                : { createdAt: -1, _id: 1 }
    );
    // query = query.sort(
    //   sort === "Newest First"
    //     ? { createdAt: -1 }
    //     : sort === "Last Updated"
    //       ? { lastInteractedAt: -1 }
    //       : sort === "Most Popular"
    //         ? { interactingCounter: -1 }
    //         : { createdAt: -1 } // Default sort
    // );
    if (participated === "All") {
      query = query.skip(skip).limit(pageSize);
    }

    allQuestions = await query.populate("getUserBadge", "badges");

    // Filter out suppressed questions if req.query.uuid does not match uuid
    if (req.query.uuid) {
      allQuestions = allQuestions.filter((question) => {
        return !question.suppressed || question.uuid === req.query.uuid;
      });
    } else {
      allQuestions = allQuestions.filter((question) => !question.suppressed);
    }

    totalQuestionsCount = await InfoQuestQuestions.countDocuments({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    });
  }
  //// console.log("allQuestionsData", allQuestions.length);

  let resultArray;
  let nextPage;

  if (participated === "Yes") {
    //// console.log("Inside resultArray if participated");
    let Records = [];
    const startedQuestions = await StartQuests.find({
      uuid,
      // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
    });

    //// console.log("startedQuestions", startedQuestions);
    //// console.log("allQuestions", allQuestions.length);

    await allQuestions.map(async function (rcrd) {
      let startedOrNot = false;
      await startedQuestions.map(function (rec) {
        if (rec.questForeignKey === rcrd._id.toString()) {
          if (rec.isFeedback !== true && rec.data.length > 0)
            startedOrNot = true;
        }
      });
      if (startedOrNot === true) {
        Records.push(rcrd);
      }
    });
    //// console.log("Records", Records.length);
    let Result = [];
    await Records.map(async function (rcrd) {
      await startedQuestions.map(function (rec) {
        if (rec.questForeignKey === rcrd._id.toString()) {
          rcrd.startQuestData = rec;
          if (
            rcrd.usersChangeTheirAns?.trim() !== "" ||
            rcrd.whichTypeQuestion === "ranked choise"
          ) {
            rcrd.startStatus = "change answer";
          } else {
            rcrd.startStatus = "completed";
          }
        }
      });

      Result.push(rcrd);
    });

    // const start = req.body.start;
    // const end = req.body.end;
    //// console.log("Start" + start + "end" + end);

    nextPage = end < Result.length;
    resultArray = Result?.slice(start, end).map(getPercentage);
    // resultArray = await Promise.all(
    //   Result?.slice(start, end).map(async (item) => {
    //     const hiddenOptions = await HiddenOptions.findOne(
    //       {
    //         userUuid: uuid,
    //         questForeignKey: item._id.toString(),
    //       }
    //     )
    //     if (hiddenOptions && hiddenOptions.hiddenOptionsArray.length > 0) {
    //       return getPercentageHiddenOption(item, null, null, hiddenOptions.hiddenOptionsArray);
    //     }
    //     else {
    //       return getPercentage(item)
    //     }
    //   })
    // )
  } else if (participated === "Not") {
    //// console.log("Inside resultArray participated Not");

    let Result = [];
    const startedQuestions = await StartQuests.find({
      uuid,
      // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
    });

    await allQuestions.map(async function (rcrd) {
      let startedOrNot = false;
      await startedQuestions.map(function (rec) {
        if (
          rec.questForeignKey === rcrd._id.toString() &&
          rec.isFeedback === false
        ) {
          startedOrNot = true;
        }
      });
      if (startedOrNot === false) {
        Result.push(rcrd);
      }
    });
    // const start = req.body.start;
    // const end = req.body.end;
    //// console.log("Start" + start + "end" + end);
    // resultArray = await Promise.all(
    //   Result.slice(start, end).map(async (item) => {
    //     const hiddenOptions = await HiddenOptions.findOne(
    //       {
    //         userUuid: uuid,
    //         questForeignKey: item._id.toString(),
    //       }
    //     )
    //     if (hiddenOptions && hiddenOptions.hiddenOptionsArray.length > 0) {
    //       return getPercentageHiddenOption(item, null, null, hiddenOptions.hiddenOptionsArray);
    //     }
    //     else {
    //       return getPercentage(item)
    //     }
    //   })
    // )
    resultArray = Result.slice(start, end).map(getPercentage);
    nextPage = end < Result.length;
  } else {
    //// console.log("Inside resultArray else");
    nextPage = skip + pageSize < totalQuestionsCount;
    resultArray = allQuestions?.map((item) => getPercentage(item));
    // resultArray = await Promise.all(
    //   allQuestions?.map(async (item) => {
    //     const hiddenOptions = await HiddenOptions.findOne(
    //       {
    //         userUuid: uuid,
    //         questForeignKey: item._id.toString(),
    //       }
    //     )
    //     if (hiddenOptions && hiddenOptions.hiddenOptionsArray.length > 0) {
    //       return getPercentageHiddenOption(item, null, null, hiddenOptions.hiddenOptionsArray);
    //     }
    //     else {
    //       return getPercentage(item)
    //     }
    //   })
    // )
  }

  for (let i = 0; i < resultArray.length; i++) {
    const item = resultArray[i];
    const bookmarkDoc = await BookmarkQuests.findOne({
      questForeignKey: item._doc._id,
      uuid,
    });

    // //// console.log('bookmarkDoc', bookmarkDoc)
    if (bookmarkDoc) {
      resultArray[i]._doc.bookmark = true;
    } else {
      resultArray[i]._doc.bookmark = false;
    }

    // if (Page === "Feedback") {
    // Get the count of hidden items grouped by hidden message
    const feedbackReceived = await UserQuestSetting.aggregate([
      {
        $match: {
          feedbackMessage: { $ne: "", $exists: true },
          questForeignKey: item._doc._id.toString(),
        },
      },
      {
        $group: {
          _id: "$feedbackMessage",
          count: { $sum: 1 },
          uuids: { $push: "$uuid" },
        },
      },
    ]);

    let feedback = [];

    if (feedbackReceived) {
      // For each feedbackReceived item, check against suppressConditions
      feedbackReceived.forEach((suppressItem) => {
        suppressConditions.forEach((condition) => {
          if (suppressItem._id === condition.id) {
            const violated =
              suppressItem.count >= condition.minCount &&
              condition.id !== "Does not apply to me" &&
              condition.id !== "Not interested" &&
              condition.id !== "Needs More Options" &&
              condition.id !== "Historical / Past Event";
            feedback.push({
              id: suppressItem._id,
              count: suppressItem.count,
              violated: violated,
              uuids: suppressItem.uuids,
            });
          }
        });
      });
    }

    resultArray[i]._doc.feedback = feedback;
    resultArray[i]._doc.hiddenCount = await UserQuestSetting.countDocuments({
      hidden: true,
      questForeignKey: item._doc._id,
    });
    resultArray[i]._doc.feedbackCount = await UserQuestSetting.countDocuments({
      feedbackMessage: { $ne: "", $exists: true },
      questForeignKey: item._doc._id,
    });

    // if(!resultArray[i]._doc.isAddOptionFeedback){
    //   if (resultArray[i]._doc.hiddenCount === 0) {
    //     if (resultArray[i]._doc.suppressedReason) {
    //       if (resultArray[i]._doc.suppressedReason === "") {
    //         resultArray.splice(i, 1);
    //         i--;
    //       }
    //     } else {
    //       resultArray.splice(i, 1);
    //       i--;
    //     }
    //   }
    // }
    // }
  }

  const desiredArray = resultArray.map((item) => ({
    ...item._doc,
    selectedPercentage: item?.selectedPercentage?.[0]
      ? [
        Object.fromEntries(
          Object.entries(item.selectedPercentage[0]).sort(
            (a, b) => parseInt(b[1]) - parseInt(a[1])
          )
        ),
      ]
      : [],
    contendedPercentage: item?.contendedPercentage?.[0]
      ? [
        Object.fromEntries(
          Object.entries(item.contendedPercentage[0]).sort(
            (a, b) => parseInt(b[1]) - parseInt(a[1])
          )
        ),
      ]
      : [],
  }));
  // Query the database with skip and limit options to get questions for the requested page
  let result = await getQuestionsWithStatus(
    desiredArray,
    viewerUuid ? viewerUuid : uuid
  );
  // if (sort === "Wow") {
  //   result = result.filter((item) => {
  //     const hasHighPercentage = item.selectedPercentage?.some(
  //       (percentageObj) => {
  //         // Extract the percentage value and convert it to a number
  //         const percentageValue = parseFloat(Object.values(percentageObj)[0]);
  //         return percentageValue > 75;
  //       }
  //     );
  //     return hasHighPercentage;
  //   });
  // }
  // getQuestionsWithUserSettings
  let result1 = await getQuestionsWithUserSettings(
    result,
    viewerUuid ? viewerUuid : uuid
  );

  const user = await UserModel.findOne({
    uuid: uuid,
  });

  // for (const item of result1) {
  //   const hiddenOptions = await HiddenOptions.findOne({
  //     userUuid: uuid,
  //     questForeignKey: item._id.toString(),
  //   });

  //   if (hiddenOptions && hiddenOptions.hiddenOptionsArray.length > 0) {
  //     // Filter out the QuestAnswers based on hiddenOptions.hiddenOptionsArray
  //     item.QuestAnswers = item.QuestAnswers.filter(
  //       (doc) => !hiddenOptions.hiddenOptionsArray.includes(doc.question)
  //     );
  //   }
  // }

  if (result1.length !== 0 && domainOwner && req.query.domain && req.query.isPublicProfile === "true") {
    for (const post of result1) {
      const startQuest = await StartQuests.findOne(
        {
          uuid: domainOwner?.uuid,
          questForeignKey: post?._id,
        }
      )
      if (startQuest?.revealMyAnswers) {
        const resultDomainOwner = computeResult(startQuest);
        // // For result
        // post.resultOwner = [resultDomainOwner];
        // // For Start Quest
        post.startQuestDataOwner = startQuest;
        post.revealMyAnswers = true;
      }
      else {
        post.revealMyAnswers = false;
      }
    }
  }

  if (result1.length !== 0) {
    if (!terms) {
      if (user?.notificationSettings?.systemNotifications) {
        // Check if it's not the "Hidden" or "SharedLink" page and if it's the first page
        if (Page !== "Hidden" && Page !== "SharedLink" && Page !== "Feedback") {
          const user = await UserModel.findOne({
            uuid: uuid,
          });
          if (!user) throw new Error(`No user found against ${uuid}`);
          let mode = user.isGuestMode;

          // if (user.role === "guest" && page === 1) {
          //   result1.splice(0, 0, notificationGuest1);
          //   result1.splice(2, 0, notificationGuest2);
          // }

          // if (user.role === "visitor" && page === 1) {
          //   result1.splice(0, 0, notificationVisitor1);
          //   result1.splice(2, 0, notificationVisitor2);
          // }

          // if (user.role === "user") {
          // Page 1
          if (page === 1 && nextPage === false) {
            if (result1.length < 2) {
              user.role === "guest"
                ? result1.splice(0, 0, notificationGuest1)
                : user.role === "visitor"
                  ? result1.splice(0, 0, notificationVisitor1)
                  : result1.splice(0, 0, notification1);
            } else if (result1.length < 5) {
              user.role === "guest"
                ? result1.splice(0, 0, notificationGuest1)
                : user.role === "visitor"
                  ? result1.splice(0, 0, notificationVisitor1)
                  : result1.splice(0, 0, notification1);
              result1.splice(3, 0, notification2);
            } else {
              user.role === "guest"
                ? result1.splice(0, 0, notificationGuest1)
                : user.role === "visitor"
                  ? result1.splice(0, 0, notificationVisitor1)
                  : result1.splice(0, 0, notification1);
              result1.splice(3, 0, notification2);
              result1.splice(7, 0, notification3);
            }
          }
          if (page === 1 && nextPage === true) {
            user.role === "guest"
              ? result1.splice(0, 0, notificationGuest1)
              : user.role === "visitor"
                ? result1.splice(0, 0, notificationVisitor1)
                : result1.splice(0, 0, notification1);
            result1.splice(3, 0, notification2);
            result1.splice(7, 0, notification3);
          }

          // Page 2
          if (page === 2 && nextPage === false) {
            if (result1.length >= 3) {
              result1.splice(3, 0, notification4);
            }
          }
          if (page === 2 && nextPage === true) {
            result1.splice(3, 0, notification4);
          }

          // Page 3
          if (page === 3 && nextPage === false) {
            if (result1.length < 4) {
              result1.splice(1, 0, notification5);
            } else if (result1.length >= 4) {
              result1.splice(1, 0, notification5);
              result1.splice(5, 0, notification6);
            }
          }
          if (page === 3 && nextPage === true) {
            result1.splice(1, 0, notification5);
            result1.splice(5, 0, notification6);
          }

          // Page 4
          if (page === 4 && nextPage === false) {
            if (result1.length >= 2 && result1.length < 5) {
              result1.splice(2, 0, notification7);
            } else if (result1.length === 5) {
              result1.splice(2, 0, notification7);
              result1.splice(6, 0, notification8);
            }
          }
          if (page === 4 && nextPage === true) {
            result1.splice(2, 0, notification7);
            result1.splice(6, 0, notification8);
          }

          // Page 5
          if (page === 5 && nextPage === false) {
            if (result1.length >= 3) {
              result1.splice(3, 0, notification9);
            }
          }
          if (page === 5 && nextPage === true) {
            result1.splice(3, 0, notification9);
          }

          // Page 6
          if (page === 6 && nextPage === false) {
            if (result1.length >= 1 && result1.length < 4) {
              result1.splice(1, 0, notification10);
            } else if (result1.length >= 4) {
              result1.splice(1, 0, notification10);
              result1.splice(5, 0, notification11);
            }
          }
          if (page === 6 && nextPage === true) {
            result1.splice(1, 0, notification10);
            result1.splice(5, 0, notification11);
          }

          // Page 7
          if (page === 7 && nextPage === false) {
            if (result1.length >= 2) {
              result1.splice(2, 0, notification12);
            } else if (result1.length >= 5) {
              result1.splice(2, 0, notification12);
              result1.splice(6, 0, notification12);
            }
          }
          if (page === 7 && nextPage === true) {
            result1.splice(2, 0, notification12);
            result1.splice(6, 0, notification13);
          }

          // Page 8
          if (page === 8 && nextPage === false) {
            if (result1.length === 3) {
              result1.splice(3, 0, notification14);
            }
          }
          if (page === 8 && nextPage === true) {
            result1.splice(3, 0, notification14);
          }

          // Page 9
          if (page === 9 && nextPage === false) {
            if (result1.length >= 1) {
              result1.splice(1, 0, notification15);
            }
          }
          if (page === 9 && nextPage === true) {
            result1.splice(1, 0, notification15);
            result1.splice(5, 0, notification16);
          }
          // }
        }
      }
    }
  }

  const excludedPages = ["Feedback", "SharedLink", "Hidden", "Bookmark"];

  if (!excludedPages.includes(Page)) {
    result1 = await Promise.all(
      result1.map(async (doc) => {
        const articles = await Article.find({ source: doc._id }).sort({
          createdAt: -1,
        });
        return { ...doc, articles }; // Attach the articles to the doc
      })
    );
  }

  const viewerUser = await UserModel.findOne({ uuid: uuid });
  if (!viewerUser)
    return res.status(404).json({ message: `User with ${uuid}, not found` });

  if (!nextPage && result1.length > 0) {
    if (viewerUser.role === "guest") result1.push(notificationGuest1);
    if (viewerUser.role === "visitor") result1.push(notificationVisitor1);
  }

  // if (fetchProfile === "true" && !res) {
  //   return {
  //     data: result1,
  //     hasNextPage: nextPage,
  //   }
  // }

  return res.status(200).json({
    data: result1,
    hasNextPage: nextPage,
  });
};

const getAllQuestsWithResult = async (req, res) => {
  const { uuid, _page, _limit, filter, sort, type, Page, terms, blockedTerms } =
    req.body;
  const page = parseInt(_page);
  const pageSize = parseInt(_limit);

  // Calculate the number of documents to skip to get to the desired page
  const skip = (page - 1) * pageSize;
  let allQuestions = [];
  let filterObj = {};
  let totalQuestionsCount;

  if (filter === true) {
    if (Page === "Bookmark") {
      filterObj.createdBy = uuid;
    } else {
      filterObj.uuid = uuid;
    }
  }

  if (type) {
    filterObj.whichTypeQuestion = type;
  }
  if (terms && terms.length > 0) {
    const regexTerm = terms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: regexTerm };
  } else if (blockedTerms && blockedTerms.length > 0) {
    // const regexBlockterms = blockedTerms.map((term) => new RegExp(term, "i"));
    filterObj.QuestTopic = { $in: blockedTerms };
  }

  if (Page === "Bookmark") {
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    // filterObj.uuid = uuid;
    const Questions = await BookmarkQuests.find({
      questForeignKey: { $nin: hiddenUserSettingIds },
      uuid: uuid,
    }).sort({ createdAt: -1 });
    // .sort(sort === "Newest First" ? { createdAt: -1 } : "createdAt");

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
        ...filterObj,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    allQuestions = allQuestions.filter((question) => question !== null);
    totalQuestionsCount = await BookmarkQuests.countDocuments(filterObj);
  } else if (Page === "Hidden") {
    //// console.log("running");
    filterObj.uuid = uuid;
    filterObj.hidden = true;
    const Questions = await UserQuestSetting.find(filterObj).sort({
      createdAt: -1,
    });
    // .sort(
    //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
    // );

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else if (req.body.Page === "SharedLink") {
    //// console.log("running");
    filterObj.uuid = uuid;
    filterObj.linkStatus = "Enable";
    const Questions = await UserQuestSetting.find(filterObj).sort({
      createdAt: -1,
    });
    // .sort(
    //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
    // );

    const mapPromises = Questions.map(async function (record) {
      return await InfoQuestQuestions.findOne({
        _id: record.questForeignKey,
      }).populate("getUserBadge", "badges");
    });

    allQuestions = await Promise.all(mapPromises);
    totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
  } else {
    // First, find UserQuestSettings with hidden: false
    const hiddenUserSettings = await UserQuestSetting.find({
      hidden: true,
      uuid,
    });

    // Extract userSettingIds from hiddenUserSettings
    const hiddenUserSettingIds = hiddenUserSettings.map(
      (userSetting) => userSetting.questForeignKey
    );

    allQuestions = await InfoQuestQuestions.find({
      _id: { $nin: hiddenUserSettingIds },
      ...filterObj,
    })
      .sort(
        sort === "Newest First"
          ? { createdAt: -1 }
          : sort === "Last Updated"
            ? { lastInteractedAt: -1 }
            : sort === "Most Popular"
              ? { interactingCounter: -1 }
              : "createdAt"
      ) // Sort by createdAt field in descending order
      .skip(skip)
      .limit(pageSize);
    totalQuestionsCount = await InfoQuestQuestions.countDocuments(filterObj);
  }

  const resultArray = allQuestions.map(getPercentage);

  // Query the database with skip and limit options to get questions for the requested page

  const result = await getQuestionsWithStatus(resultArray, uuid);
  // getQuestionsWithUserSettings
  const result1 = await getQuestionsWithUserSettings(result, uuid);

  res.status(200).json({
    data: result1,
    hasNextPage: skip + pageSize < totalQuestionsCount,
  });
};

const getQuestById = async (req, res) => {
  try {
    const { uuid, id, page, isAdvanceAnalytics } = req.params; // Use req.params instead of req.body
    const { sharedLinkOnly } = req.query;

    const { postLink } = req.query;
    const infoQuest = await InfoQuestQuestions.find({
      _id: id,
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Quest Exist!");

    const result = await getQuestionsWithStatus(infoQuest, uuid);
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, uuid);

    let quest;

    if (page === "SharedLink") {
      quest = await UserQuestSetting.findOne({ link: postLink });
    }
    //// console.log("questSharedLink", quest);

    const advanceAnalyticsDoc = await AdvanceAnalytics.findOne({
      userUuid: uuid,
      questForeignKey: id,
    });

    if (
      advanceAnalyticsDoc &&
      advanceAnalyticsDoc.advanceAnalytics.length > 0
    ) {
      // Global function map
      const functionMap = {
        hide: hiddenOptionsfx,
        badgeCount: badgeCountfx,
        target: targetfx,
        activity: activityfx,
        // fifthAA: fifthAAfx, Replace with actual one
        // Add other function mappings as needed
      };
      // Sort the advanceAnalytics array by the order field
      const sortedAnalytics = advanceAnalyticsDoc.advanceAnalytics.sort(
        (a, b) => a.order - b.order
      );

      // Initialize the result variable
      let currentResult = { ...result1[0]._doc, optionsRemoved: [] };

      // Call functions based on type in sorted order
      for (const analyticsItem of sortedAnalytics) {
        const func = functionMap[analyticsItem.type];
        if (func) {
          let params = [currentResult, uuid, id, sharedLinkOnly]; // Common parameters for all functions
          // Add specific parameters based on the type of analyticsItem
          switch (analyticsItem.type) {
            case "hide":
              params.push(analyticsItem.hiddenOptionsArray); // Add hiddenOptionsArray for hide type
              break;
            case "badgeCount":
              params.push(analyticsItem.oprend, analyticsItem.range); // Add oprend and range for badgeCount type
              break;
            case "target":
              params.push(
                analyticsItem.targetedOptionsArray,
                analyticsItem.targetedQuestForeignKey
              ); // Add parameters for target type
              break;
            case "activity":
              params.push(analyticsItem.allParams); // Add parameters for target type
              break;
            // Add more cases for other types as needed
            default:
              // console.warn(`Unhandled type: ${analyticsItem.type}`);
              break;
          }
          // Call the function with the dynamic parameters
          currentResult = await func(...params);
        } else {
          // console.warn(`No function found for type: ${analyticsItem.type}`);
        }
      }

      const arrayResult = [currentResult];
      let resultArray = arrayResult.map((item) =>
        getPercentageAA(item, null, null, [], sharedLinkOnly)
      );
      const desiredArray = resultArray.map((item) => ({
        ...item,
        selectedPercentage: item.selectedPercentage
          ? item.selectedPercentage
          : [],
        contendedPercentage: item.contendedPercentage
          ? item.contendedPercentage
          : [],
        userQuestSetting: item.userQuestSetting,
        page,
      }));

      if (desiredArray[0]) {
        desiredArray[0].advanceAnalytics = advanceAnalyticsDoc
          ? advanceAnalyticsDoc.advanceAnalytics
          : null;
      }
      if (page === "advance-analytics") {
        desiredArray[0].startStatus = "completed";
      }

      if (isAdvanceAnalytics) return desiredArray;

      if (sharedLinkOnly && sharedLinkOnly !== "") {
        const userQuestSetting = await UserQuestSetting.findOne({
          link: sharedLinkOnly,
        });
        desiredArray[0].userQuestSetting = userQuestSetting;
      }

      res.status(200).json({
        data: desiredArray,
      });
    } else {
      let resultArray = result1.map((item) => getPercentage(item, page, quest));
      let participantsCount;
      if (sharedLinkOnly && sharedLinkOnly !== "") {
        participantsCount = await StartQuests.countDocuments({
          questForeignKey: id,
          userQuestSettingRef: sharedLinkOnly,
          $expr: {
            $gt: [{ $size: "$data" }, 0], // Checks if the length of `data` array is greater than 0
          },
        });
      }
      else {
        participantsCount = await StartQuests.countDocuments({
          questForeignKey: id,
          $expr: {
            $gt: [{ $size: "$data" }, 0], // Checks if the length of `data` array is greater than 0
          },
        });
      }

      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage
          ? item.selectedPercentage
          : [],
        contendedPercentage: item.contendedPercentage
          ? item.contendedPercentage
          : [],
        userQuestSetting: item.userQuestSetting,
        participantsCount: participantsCount,
        page,
      }));

      if (page === "advance-analytics") {
        desiredArray[0].startStatus = "completed";
      }
      if (isAdvanceAnalytics) return desiredArray;

      if (sharedLinkOnly && sharedLinkOnly !== "") {
        const userQuestSetting = await UserQuestSetting.findOne({
          link: sharedLinkOnly,
        });
        desiredArray[0].userQuestSetting = userQuestSetting;
      }

      res.status(200).json({
        data: desiredArray,
      });
    }
  } catch (error) {
    // console.log(error.message);
    res.status(500).json({
      message: `An error occurred while getQuestById InfoQuest: ${error.message}`,
    });
  }
};
const getQuestsCustom = async (req, res) => {
  try {
    const { ids, uuid } = req.query;

    // Ensure `ids` is a comma-separated string, then split it into an array
    const idsArray = ids ? ids.split(",") : [];

    // Check if `idsArray` is populated
    if (!Array.isArray(idsArray) || idsArray.length === 0) {
      throw new Error("No Quest IDs provided!");
    }

    // Find multiple quests using `$in` with the array of `ids`
    const infoQuest = await InfoQuestQuestions.find({
      _id: { $in: idsArray },
    }).populate("getUserBadge", "badges");

    if (!infoQuest || infoQuest.length === 0)
      throw new Error("No Quests Exist!");

    if (
      uuid !== null &&
      uuid !== undefined &&
      uuid !== "null" &&
      uuid !== "undefined"
    ) {
      // Process each quest with user settings and status
      const result = await getQuestionsWithStatus(infoQuest, uuid);
      const result1 = await getQuestionsWithUserSettings(result, uuid);

      // Process result to compute percentages
      let resultArray = result1.map((item) => getPercentage(item));

      // Prepare the final array of quest data
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage || [],
        contendedPercentage: item.contendedPercentage || [],
        userQuestSetting: item.userQuestSetting,
      }));

      const desiredArrayWithFeedback = await Promise.all(
        desiredArray.map(async (doc) => {
          const feedbackReceived = await UserQuestSetting.aggregate([
            {
              $match: {
                feedbackMessage: { $ne: "", $exists: true },
                questForeignKey: doc._id.toString(), // Use doc._id for the aggregation
                uuid: uuid,
              },
            },
            {
              $group: {
                _id: "$feedbackMessage",
                count: { $sum: 1 },
                uuids: { $push: "$uuid" },
              },
            },
          ]);

          let feedback = [];

          if (feedbackReceived) {
            // For each feedbackReceived item, check against suppressConditions
            feedbackReceived.forEach((suppressItem) => {
              suppressConditions.forEach((condition) => {
                if (suppressItem._id === condition.id) {
                  const violated =
                    suppressItem.count >= condition.minCount &&
                    condition.id !== "Does not apply to me" &&
                    condition.id !== "Not interested" &&
                    condition.id !== "Needs More Options" &&
                    condition.id !== "Historical / Past Event";
                  feedback.push({
                    id: suppressItem._id,
                    count: suppressItem.count,
                    violated: violated,
                    uuids: suppressItem.uuids,
                  });
                }
              });
            });
          }

          // Attach feedback to the current doc
          return { ...doc, feedback }; // Return the doc with the feedback array
        })
      );

      // Return the result as a JSON response
      return res.status(200).json({
        data: desiredArrayWithFeedback,
      });
    } else {
      // Return the result as a JSON response
      return res.status(200).json({
        data: infoQuest,
      });
    }
  } catch (error) {
    // console.log(error.message);
    res.status(500).json({
      message: `An error occurred while getting Quests Info: ${error.message}`,
    });
  }
};

async function getQuestByIdQuestForeignKey(questForeignKey) {
  try {
    const infoQuest = await InfoQuestQuestions.find({
      _id: new mongoose.Types.ObjectId(questForeignKey.toString()),
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Quest Exist!");

    const result = await getQuestionsWithStatusQuestForeignKey(
      infoQuest,
      questForeignKey
    );
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettingsQuestForeignKey(
      result,
      questForeignKey
    );

    let quest;

    // if (page === "SharedLink") {
    quest = await UserQuestSetting.findOne({
      questForeignKey: questForeignKey,
    });
    // }
    // //// console.log("questSharedLink", quest);

    const resultArray = result1.map((item) =>
      getPercentageQuestForeignKey(item, quest)
    );

    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      userQuestSetting: item.userQuestSetting,
    }));

    return desiredArray[0];
  } catch (error) {
    //// console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestById InfoQuest: ${error.message}`,
    });
  }
}

async function getQuestByIdUserUuid(questForeignKey, uuid) {
  try {
    const infoQuest = await InfoQuestQuestions.find({
      _id: new mongoose.Types.ObjectId(questForeignKey.toString()),
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Quest Exist!");

    const result = await getQuestionsWithStatus(
      infoQuest,
      uuid
    );
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(
      result,
      uuid
    );

    const resultArray = result1.map(getPercentage);

    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      userQuestSetting: item.userQuestSetting,
    }));

    return desiredArray[0];
  } catch (error) {
    //// console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestById InfoQuest: ${error.message}`,
    });
  }
}

const getQuestByUniqueShareLink = async (req, res) => {
  try {
    // req.cookie
    //// console.log("🚀 ~ getQuestById ~ req.cookie:", req.cookies);
    // return
    const uuid = req.query.uuid;
    const { uniqueShareLink } = req.params; // Use req.params instead of req.body

    const userQuestSetting = await UserQuestSetting.findOne({
      // uuid,
      link: uniqueShareLink,
    });

    if (!userQuestSetting) {
      // If the document doesn't exist, you may want to handle this case
      return res
        .status(404)
        .json({ status: false, message: "Link not found." });
    }
    if (userQuestSetting.linkStatus !== "Enable") {
      // If the list does not exists
      return res
        .status(404)
        .json({ status: false, message: "This link is not active." });
    }

    const infoQuest = await InfoQuestQuestions.find({
      _id: userQuestSetting.questForeignKey,
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Post Exist!");

    if (infoQuest.isActive === false) {
      return res.status(404).json({ message: "This link is not active." });
    }

    const result = await getQuestionsWithStatus(infoQuest, uuid);

    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, uuid);

    const userQuestSettingForTerminal = await UserQuestSetting.findOne({
      uuid: uuid,
      questForeignKey: userQuestSetting.questForeignKey,
      linkStatus: "Enable",
    });

    const resultArray = result1.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      userQuestSetting: userQuestSettingForTerminal,
    }));

    const desiredArrayWithFeedback = await Promise.all(
      desiredArray.map(async (doc) => {
        const feedbackReceived = await UserQuestSetting.aggregate([
          {
            $match: {
              feedbackMessage: { $ne: "", $exists: true },
              questForeignKey: doc._id.toString(), // Use doc._id for the aggregation
              uuid: uuid,
            },
          },
          {
            $group: {
              _id: "$feedbackMessage",
              count: { $sum: 1 },
              uuids: { $push: "$uuid" },
            },
          },
        ]);

        let feedback = [];

        if (feedbackReceived) {
          // For each feedbackReceived item, check against suppressConditions
          feedbackReceived.forEach((suppressItem) => {
            suppressConditions.forEach((condition) => {
              if (suppressItem._id === condition.id) {
                const violated =
                  suppressItem.count >= condition.minCount &&
                  condition.id !== "Does not apply to me" &&
                  condition.id !== "Not interested" &&
                  condition.id !== "Needs More Options" &&
                  condition.id !== "Historical / Past Event";
                feedback.push({
                  id: suppressItem._id,
                  count: suppressItem.count,
                  violated: violated,
                  uuids: suppressItem.uuids,
                });
              }
            });
          });
        }

        // Attach feedback to the current doc
        return { ...doc, feedback }; // Return the doc with the feedback array
      })
    );

    const user = await User.findOne({ uuid: uuid });
    if (user) {
      if (user.role === "guest") {
        const notification = {
          id: "guest_notification",
          icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
          header: "What is Guest Mode?",
          text: [
            "As a guest user on Foundation, you can earn FDX tokens by engaging with shared posts, lists, and news. While you’re free to explore all features, your participation is limited to shared links. Any FDX you earn during your guest period can be retained if you sign up, but be aware that it will expire after 30 days if you do not create an account.",
          ],
          buttonText: "Sign Up",
          buttonUrl: "/",
          show: "Guest Mode",
          category: "",
          position: "Full screen post",
          priority: 2,
          mode: "Guest",
          timestamp: new Date().toISOString(),
        };

        desiredArrayWithFeedback.splice(1, 0, notification);
      }

      if (user.role === "visitor") {
        const notification = {
          id: "guest_notification",
          icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
          header: "What is Visitor Mode?",
          text: [
            "As a visitor on Foundation, you can explore all features of the platform, but your participation is limited. You won’t be able to engage with any links shared from foundation. Visitor status is assigned if you’ve already been granted guest or user access from your IP address, which helps reduce abuse of shared links. To participate in shared links, you must sign up for an account.",
          ],
          buttonText: "Sign Up",
          buttonUrl: "/",
          show: "Visitor Mode",
          category: "",
          position: "Full screen post",
          priority: 2,
          mode: "Guest",
          timestamp: new Date().toISOString(),
        };

        desiredArrayWithFeedback.splice(1, 0, notification);
      }

      if (user.role === "user") {
        const notification = {
          id: "guest_notification",
          icon: "https://www.flickr.com/photos/160246067@N08/39735543880/",
          header: "Share Your Voice!",
          text: [
            "When you engage with shared posts on Foundation, you contribute to a wealth of knowledge that benefits the entire community. For every pariticpation, you earn FDX tokens, which reflects the value of your input. Join us in shaping a meaningful future for everyone while getting rewarded for your contributions.",
          ],
          buttonText: "Join Foundation",
          buttonUrl: "/",
          show: "ALL Only on shared posts",
          category: "",
          position: "Full screen post",
          priority: 2,
          mode: "Guest",
          timestamp: new Date().toISOString(),
        };

        desiredArrayWithFeedback.splice(1, 0, notification);
      }
    }

    res.status(200).json({
      data: desiredArrayWithFeedback,
    });
  } catch (error) {
    //// console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestByUniqueShareLink InfoQuest: ${error.message}`,
    });
  }
};

const getQuestByUniqueId = async (req, res) => {
  try {
    const { postId, uuid } = req.params;

    const infoQuest = await InfoQuestQuestions.find({
      _id: postId,
    }).populate("getUserBadge", "badges");
    if (!infoQuest) throw new Error("No Post Exist!");

    // if (infoQuest.isActive === false) {
    //   return res.status(404).json({ message: "This link is not active." });
    // }

    const result = await getQuestionsWithStatus(infoQuest, uuid);

    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, uuid);

    const resultArray = result1.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
    }));

    res.status(200).json({
      data: desiredArray,
    });
  } catch (error) {
    //// console.log(error);
    res.status(500).json({
      message: `An error occurred while getQuestByUniqueShareLink InfoQuest: ${error.message}`,
    });
  }
};

const getEmbededPostByUniqueId = async (req, res) => {
  try {
    const { link } = req.params;
    const post = await await UserQuestSetting.findOne({
      link: link,
    });

    const infoQuest = await InfoQuestQuestions.find({
      _id: post?.questForeignKey,
    }).populate("getUserBadge", "badges");

    if (!infoQuest) throw new Error("No Post Exist!");
    const result1 = await getQuestionsWithStatus(infoQuest);

    const resultArray = result1.map(getPercentage);
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      startStatus: "completed",
      type: "embed",
    }));

    res.status(200).json({
      data: desiredArray,
    });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while emdeding post: ${error.message}`,
    });
  }
};

const getAllQuestsWithCompletedStatus = async (req, res) => {
  try {
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $in: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      // filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
      }).sort({ createdAt: -1 });
      // .sort(
      //   req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort({
        createdAt: -1,
      });
      // .sort(
      //   sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      // );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
              ? { lastInteractedAt: -1 }
              : req.body.sort === "Most Popular"
                ? { interactingCounter: -1 }
                : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });
      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
            } else {
              rcrd.startStatus = "completed";
              Result.push(rcrd);
            }
          }
        });
      });

      const start = req.body.start;
      const end = req.body.end;
      //// console.log("Start" + start + "end" + end);

      const resultArray = Result.slice(start, end).map(getPercentage);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));
      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
};
const suppressPost = async (req, res) => {
  try {
    const { id } = req.params;

    const supression = await InfoQuestQuestions.findOneAndUpdate(
      { _id: id },
      { suppressed: true, suppressedReason: "Invalid Media" }
    );

    if (supression) {
      return res.status(200).json({
        message: "Suppressed successfully",
        data: supression,
      });
    } else {
      return res.status(404).json({
        message: "Post not found",
      });
    }
  } catch (err) {
    res.status(500).json({
      message: `An error occurred while suppressing: ${err.message}`,
    });
  }
};

const getAllQuestsWithChangeAnsStatus = async (req, res) => {
  try {
    let allQuestions;

    let filterObj = {};
    if (req.body.filter === true) {
      if (req.body.Page === "Bookmark") {
        filterObj.createdBy = req.body.uuid;
      } else {
        filterObj.uuid = req.body.uuid;
      }
    }

    if (req.body.type) {
      filterObj.whichTypeQuestion = req.body.type;
    }
    if (req.body.terms && req.body.terms.length > 0) {
      const regexTerm = req.body.terms.map((term) => new RegExp(term, "i"));
      filterObj.QuestTopic = { $in: regexTerm };
    } else if (req.body.blockedTerms && req.body.blockedTerms.length > 0) {
      const regexBlockterms = req.body.blockedTerms.map(
        (term) => new RegExp(term, "i")
      );
      filterObj.QuestTopic = { $nin: regexBlockterms };
    }

    if (req.body.Page === "Bookmark") {
      // filterObj.uuid=req.body.uuid;
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid: req.body.uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );
      // filterObj.uuid = req.body.uuid;
      const Questions = await BookmarkQuests.find({
        questForeignKey: { $nin: hiddenUserSettingIds },
        uuid: req.body.uuid,
        ...filterObj,
      }).sort(
        req.body.sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
          ...filterObj,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      allQuestions = allQuestions.filter((question) => question !== null);
    } else if (req.body.Page === "Hidden") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.hidden = true;
      const Questions = await UserQuestSetting.find(filterObj).sort(
        sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else if (req.body.Page === "SharedLink") {
      //// console.log("running");
      filterObj.uuid = uuid;
      filterObj.linkStatus = "Enable";
      const Questions = await UserQuestSetting.find(filterObj).sort(
        sort === "Newest First" ? { createdAt: -1 } : "createdAt"
      );

      const mapPromises = Questions.map(async function (record) {
        return await InfoQuestQuestions.findOne({
          _id: record.questForeignKey,
        }).populate("getUserBadge", "badges");
      });

      allQuestions = await Promise.all(mapPromises);
      totalQuestionsCount = await UserQuestSetting.countDocuments(filterObj);
    } else {
      // First, find UserQuestSettings with hidden: false
      const hiddenUserSettings = await UserQuestSetting.find({
        hidden: true,
        uuid,
      });

      // Extract userSettingIds from hiddenUserSettings
      const hiddenUserSettingIds = hiddenUserSettings.map(
        (userSetting) => userSetting.questForeignKey
      );

      allQuestions = await InfoQuestQuestions.find({
        _id: { $nin: hiddenUserSettingIds },
        ...filterObj,
      })
        .sort(
          req.body.sort === "Newest First"
            ? { createdAt: -1 }
            : req.body.sort === "Last Updated"
              ? { lastInteractedAt: -1 }
              : req.body.sort === "Most Popular"
                ? { interactingCounter: -1 }
                : "createdAt"
        )
        .populate("getUserBadge", "badges");
    }

    if (req.body.uuid === "" || req.body.uuid === undefined) {
      const resultArray = allQuestions.map(getPercentage);
      res.status(200).json(resultArray);
    } else {
      const startedQuestions = await StartQuests.find({
        uuid: req.body.uuid,
        // uuid: "0x81597438fdd366b90971a73f39d56eea4702c43a",
      });
      let Result = [];

      await allQuestions.map(async function (rcrd) {
        let startedOrNot = false;
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd._id.toString()) {
            startedOrNot = true;
            rcrd.startQuestData = rec;
          }
        });
        if (startedOrNot === true) {
          // if (rcrd.QuestionCorrect === "Not Selected") {
          if (
            rcrd.usersChangeTheirAns?.trim() !== "" ||
            rcrd.whichTypeQuestion === "ranked choise"
          ) {
            rcrd.startStatus = "change answer";
            Result.push(rcrd);
          }
        }
      });
      const start = req.body.start;
      const end = req.body.end;

      const resultArray = Result.slice(start, end).map(getPercentage);
      const desiredArray = resultArray.map((item) => ({
        ...item._doc,
        selectedPercentage: item.selectedPercentage,
        contendedPercentage: item.contendedPercentage,
      }));

      res.status(200).json({
        data: desiredArray,
        hasNextPage: end < Result.length,
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
};

async function getQuestionsWithStatus(allQuestions, uuid) {
  try {
    if (uuid === "" || uuid === undefined) {
      return allQuestions;
    } else {
      const startedQuestions = await StartQuests.find({
        uuid: uuid,
      });
      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            if (
              rec.isFeedback &&
              rec.data.length === 0 &&
              rec.isAddOptionFeedback
            ) {
              rcrd.startStatus = "continue";
              rcrd.startQuestData = rec;
            } else if (rec.isFeedback && rec.data.length > 0) {
              rcrd.startStatus = "change answer";
              rcrd.startQuestData = rec;
            } else if (rec.isFeedback) {
              rcrd.startStatus = "completed";
              rcrd.startQuestData = rec;
            } else if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
              if (rec.data.length !== 0) {
                rcrd.startStatus = "change answer";
                rcrd.startQuestData = rec;
              } else {
                rcrd.startStatus = "";
                rcrd.startQuestData = rec;
              }
            } else {
              rcrd.startStatus = "completed";
              rcrd.startQuestData = rec;
            }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

async function getQuestionsWithUserSettings(allQuestions, uuid) {
  try {
    if (uuid === "" || uuid === undefined) {
      return allQuestions;
    } else {
      const userQuestSettings = await UserQuestSetting.find({
        uuid: uuid,
      });
      // //// console.log(
      //   "🚀 ~ getQuestionsWithUserSettings ~ userQuestSettings:",
      //   userQuestSettings
      // );

      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await userQuestSettings.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            rcrd.userQuestSetting = rec;
            // if (
            //   rcrd.usersChangeTheirAns?.trim() !== "" ||
            //   rcrd.whichTypeQuestion === "ranked choise"
            // ) {
            //   rcrd.startStatus = "change answer";
            //   rcrd.startQuestData = rec;
            // } else {
            //   rcrd.startStatus = "completed";
            //   rcrd.startQuestData = rec;
            // }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

async function getQuestionsWithStatusQuestForeignKey(
  allQuestions,
  questForeignKey
) {
  try {
    if (questForeignKey === "" || questForeignKey === undefined) {
      return allQuestions;
    } else {
      const startedQuestions = await StartQuests.find({
        questForeignKey: questForeignKey,
      });

      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await startedQuestions.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            if (
              rcrd.usersChangeTheirAns?.trim() !== "" ||
              rcrd.whichTypeQuestion === "ranked choise"
            ) {
              rcrd.startStatus = "change answer";
              rcrd.startQuestData = rec;
            } else {
              rcrd.startStatus = "completed";
              rcrd.startQuestData = rec;
            }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

async function getQuestionsWithUserSettingsQuestForeignKey(
  allQuestions,
  questForeignKey
) {
  try {
    if (questForeignKey === "" || questForeignKey === undefined) {
      return allQuestions;
    } else {
      const userQuestSettings = await UserQuestSetting.find({
        questForeignKey: questForeignKey,
      });
      // //// console.log(
      //   "🚀 ~ getQuestionsWithUserSettings ~ userQuestSettings:",
      //   userQuestSettings
      // );

      let Result = [];
      await allQuestions.map(async function (rcrd) {
        await userQuestSettings.map(function (rec) {
          if (rec.questForeignKey === rcrd?._id?.toString()) {
            rcrd.userQuestSetting = rec;
            // if (
            //   rcrd.usersChangeTheirAns?.trim() !== "" ||
            //   rcrd.whichTypeQuestion === "ranked choise"
            // ) {
            //   rcrd.startStatus = "change answer";
            //   rcrd.startQuestData = rec;
            // } else {
            //   rcrd.startStatus = "completed";
            //   rcrd.startQuestData = rec;
            // }
          }
        });

        Result.push(rcrd);
      });

      return Result;
    }
  } catch (err) {
    throw err;
  }
}

// Controller function to check if ID exists in the database collection
const checkMediaDuplicateUrl = async (req, res) => {
  try {
    const { id } = req.params;

    // Construct a regex pattern to match the YouTube URL format
    const regex = new RegExp(`${id}`, "i");

    // Use the regex pattern in the find query
    const question = await InfoQuestQuestions.findOne({
      url: regex,
      isActive: true,
    });

    if (question) {
      // ID exists in the URL field, return an error
      return res
        .status(400)
        .json({ error: "This link already exists.", duplicate: true });
    }

    // ID does not exist in the URL field, continue with other operations
    // For example, you can insert the ID into the database here

    res.status(200).json({
      message:
        "Link does not exist in the URL field. Proceed with other operations.",
      duplicate: false,
    });
  } catch (error) {
    // console.error("Error checking ID in URL field:", error.message);
    res
      .status(500)
      .json({ error: `Error checking ID in URL field: ${error.message}` });
  }
};

const checkGifDuplicateUrl = async (req, res) => {
  try {
    const { url } = req.params;
    const question = await InfoQuestQuestions.findOne({
      url: url,
      isActive: true,
    });

    if (question) {
      return res
        .status(400)
        .json({ error: "This link already exists.", duplicate: true });
    }
    res.status(200).json({
      message:
        "Link does not exist in the URL field. Proceed with other operations.",
      duplicate: false,
    });
  } catch (error) {
    // console.error("Error checking ID in URL field:", error.message);
    res
      .status(500)
      .json({ error: `Error checking ID in URL field: ${error.message}` });
  }
};

// Function to get the final redirect URL from a short URL
function getFinalRedirectSoundCloud(shortUrl) {
  const command = `curl -Ls -o /dev/null -w %{url_effective} ${shortUrl}`;
  return execSync(command, { encoding: "utf-8" }).trim();
}

// Controller function to check if ID exists in the database collection
const getFullSoundcloudUrlFromShortUrl = async (req, res) => {
  const shortUrl = req.query.shortUrl;

  if (!shortUrl) {
    return res.status(400).json({ error: "Short URL parameter is missing" });
  }

  try {
    const finalUrl = getFinalRedirectSoundCloud(shortUrl);
    res.json({ finalUrl });
  } catch (error) {
    // console.error("Error retrieving final redirect URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller function to check if ID exists in the database collection
const getFlickerUrl = async (req, res) => {
  try {
    // Extract the Flickr photo URL from the query parameters
    const flickrUrl = req.query.url;

    // Make a GET request to Flickr's API with the dynamic URL
    const response = await fetch(
      `http://www.flickr.com/services/oembed/?format=json&url=${encodeURIComponent(
        flickrUrl
      )}`
    );

    // Check if the response is successful
    if (!response.ok) {
      if (response.status === 429) {
        return res
          .status(429)
          .json({ message: "Too many requests. Please try again later." });
      }
      throw new Error("Invalid Flickr photo URL");
    }

    // Parse the response as JSON
    const data = await response.json();

    // Check if the response from Flickr contains the image URL
    if (!data.url) {
      // If the response does not contain the image URL, throw an error
      throw new Error("Invalid Flickr photo URL");
    }

    // Extract the image URL from the response data
    const imageUrl = data.url;

    // Return the image URL as the API response
    res.json({ imageUrl });
  } catch (error) {
    // If an error occurs, return an error response
    // console.error(error);
    res.status(500).json({ message: `${error.message}` });
  }
};

const advanceAnalytics = async (req, res) => {
  try {
    const { userUuid, questForeignKey } = req.params;

    if (!req.body.type)
      return res.status(403).json({ message: "Type is not Provided" });
    if (!userUuid || !questForeignKey)
      return res.status(403).json({
        message:
          "Invalid request, Please provide references userUuid and questForeignKey in params",
      });

    const advanceAnalyticsDoc = await AdvanceAnalytics.findOne({
      userUuid: userUuid,
      questForeignKey: questForeignKey,
    });

    if (advanceAnalyticsDoc) {
      // Check if an object with the same 'type' and '_id' exists in the advanceAnalytics array
      const existingAnalytics = advanceAnalyticsDoc.advanceAnalytics.find(
        (item) =>
          item.type === req.body.type && item._id.toString() === req.body.id
      );

      if (existingAnalytics) {
        let existingAnalyticsCheck;

        if (req.body.type === "hide") {
          existingAnalyticsCheck = advanceAnalyticsDoc.advanceAnalytics.find(
            (item) =>
              item.type === req.body.type &&
              item.hiddenOptionsArray[0] === req.body.hiddenOptionsArray[0] &&
              item._id.toString() !== req.body.id
          );
        }

        if (req.body.type === "badgeCount") {
          existingAnalyticsCheck = advanceAnalyticsDoc.advanceAnalytics.find(
            (item) =>
              item.type === req.body.type &&
              item.oprend === req.body.oprend &&
              item.range === req.body.range &&
              item._id.toString() !== req.body.id
          );
        }

        if (req.body.type === "target") {
          existingAnalyticsCheck = advanceAnalyticsDoc.advanceAnalytics.find(
            (item) =>
              item.type === req.body.type &&
              item.targetedOptionsArray[0] ===
              req.body.targetedOptionsArray[0] &&
              item.targetedQuestForeignKey ===
              req.body.targetedQuestForeignKey &&
              item._id.toString() !== req.body.id
          );
        }

        if (req.body.type === "activity") {
          existingAnalyticsCheck = advanceAnalyticsDoc.advanceAnalytics.find(
            (item) =>
              item.type === req.body.type &&
              item.allParams.subtype === req.body.allParams.subtype &&
              item._id.toString() !== req.body.id
          );
        }

        if (existingAnalyticsCheck)
          return res
            .status(409)
            .json({ message: "Advance Analytic already Exists." });

        // if (
        //   req.body.type === "target" &&
        //   req.body.targetedOptionsArray &&
        //   req.body.targetedOptionsArray.length >= 1 &&
        //   existingAnalytics.targetedQuestForeignKey !== req.body.targetedQuestForeignKey
        // ) {

        //   // Delete documents where `targetedQuestForeignKey` matches `existingAnalytics.targetedQuestForeignKey`
        //   // await AdvanceAnalytics.findOneAndUpdate(
        //   //   {
        //   //     userUuid: userUuid,
        //   //     questForeignKey: questForeignKey,
        //   //   },
        //   //   {
        //   //     $pull: {
        //   //       advanceAnalytics: {
        //   //         targetedQuestForeignKey: existingAnalytics.targetedQuestForeignKey,
        //   //       },
        //   //     }, // Remove objects matching the type
        //   //   },
        //   //   { new: true } // Return the updated document
        //   // );

        //   // Find the current maximum order value in the advanceAnalytics array
        //   const maxOrder = advanceAnalyticsDoc.advanceAnalytics.reduce(
        //     (max, item) => (item.order > max ? item.order : max),
        //     0
        //   );

        //   // Extract existing options from advanceAnalyticsDoc
        //   const existingOptions = advanceAnalyticsDoc.advanceAnalytics
        //     .filter((item) => item.type === "target") // Filter items where type is "target"
        //     .map((item) => item.targetedOptionsArray[0]); // Map targetedOptionsArray[0]

        //   // Filter targetedOptionsArray to exclude options that already exist
        //   const filteredOptions = req.body.targetedOptionsArray.filter(
        //     (option) => !existingOptions.includes(option)
        //   );

        //   if (filteredOptions.length === 0) return res.status(409).json({ message: "Options already exist" });

        //   const newAnalytics = filteredOptions.map((option, index) => {
        //     const ids = new mongoose.Types.ObjectId(); // Generate a new ObjectId for each document
        //     return {
        //       ...req.body,
        //       _id: ids,
        //       id: ids,
        //       order: maxOrder + index + 1, // Increment order for each new document
        //       targetedOptionsArray: [option], // Set the current option
        //     };
        //   });

        //   // Push the new analytics if there are any new entries
        //   if (newAnalytics.length > 0) {
        //     advanceAnalyticsDoc.advanceAnalytics.push(...newAnalytics);
        //     await advanceAnalyticsDoc.save();
        //   }
        // }
        // else {
        // If an object with the same 'type' exists, update it with the new data from req.body
        for (let key in req.body) {
          existingAnalytics[key] = req.body[key];
        }
        // Mark the document as modified to ensure Mongoose tracks changes to the array
        advanceAnalyticsDoc.markModified("advanceAnalytics");
        // }
      } else {
        if (
          req.body.type === "target" &&
          req.body.targetedOptionsArray &&
          req.body.targetedOptionsArray.length >= 1
        ) {
          // const advanceAnalyticsDoc = await AdvanceAnalytics.findOne({
          //   userUuid: userUuid,
          //   questForeignKey: questForeignKey,
          // });

          // if (advanceAnalyticsDoc) {
          //   // Filter out documents where `type: "target"` and `targetedQuestForeignKey` does not match
          //   advanceAnalyticsDoc.advanceAnalytics = advanceAnalyticsDoc.advanceAnalytics.filter(
          //     (doc) =>
          //       !(doc.type === "target" && doc.targetedQuestForeignKey !== req.body.targetedQuestForeignKey)
          //   );

          //   // Save the updated document
          //   await advanceAnalyticsDoc.save();
          // }

          // Find the current maximum order value in the advanceAnalytics array
          const maxOrder = advanceAnalyticsDoc.advanceAnalytics.reduce(
            (max, item) => (item.order > max ? item.order : max),
            0
          );

          // Extract existing options from advanceAnalyticsDoc
          const existingOptions = advanceAnalyticsDoc.advanceAnalytics
            .filter(
              (item) =>
                item.type === "target" &&
                item.targetedQuestForeignKey ===
                req.body.targetedQuestForeignKey
            ) // Filter items where type is "target"
            .map((item) => item.targetedOptionsArray[0]); // Map targetedOptionsArray[0]

          // Filter targetedOptionsArray to exclude options that already exist
          const filteredOptions = req.body.targetedOptionsArray.filter(
            (option) => !existingOptions.includes(option)
          );

          if (filteredOptions.length === 0)
            return res.status(409).json({ message: "Options already exist" });

          const newAnalytics = filteredOptions.map((option, index) => {
            const ids = new mongoose.Types.ObjectId(); // Generate a new ObjectId for each document
            return {
              ...req.body,
              _id: ids,
              id: ids,
              order: maxOrder + index + 1, // Increment order for each new document
              targetedOptionsArray: [option], // Set the current option
            };
          });

          // Push the new analytics if there are any new entries
          if (newAnalytics.length > 0) {
            advanceAnalyticsDoc.advanceAnalytics.push(...newAnalytics);
            await advanceAnalyticsDoc.save();
          }
        } else {
          // Find the current maximum order value in the advanceAnalytics array
          const maxOrder = advanceAnalyticsDoc.advanceAnalytics.reduce(
            (max, item) => (item.order > max ? item.order : max),
            0
          );

          let existingAnalytics;

          if (req.body.type === "hide") {
            existingAnalytics = advanceAnalyticsDoc.advanceAnalytics.find(
              (item) =>
                item.type === req.body.type &&
                item.hiddenOptionsArray[0] === req.body.hiddenOptionsArray[0]
            );
          }

          if (req.body.type === "badgeCount") {
            existingAnalytics = advanceAnalyticsDoc.advanceAnalytics.find(
              (item) =>
                item.type === req.body.type &&
                item.oprend === req.body.oprend &&
                item.range === req.body.range
            );
          }

          if (req.body.type === "target") {
            existingAnalytics = advanceAnalyticsDoc.advanceAnalytics.find(
              (item) =>
                item.type === req.body.type &&
                item.targetedOptionsArray[0] ===
                req.body.targetedOptionsArray[0] &&
                item.targetedQuestForeignKey ===
                req.body.targetedQuestForeignKey
            );
          }

          if (req.body.type === "activity") {
            existingAnalytics = advanceAnalyticsDoc.advanceAnalytics.find(
              (item) =>
                item.type === req.body.type &&
                item.allParams.subtype === req.body.allParams.subtype
            );
          }

          if (existingAnalytics)
            return res
              .status(409)
              .json({ message: "Advance Analytic already Exists." });

          const ids = new mongoose.Types.ObjectId();
          // If no such object exists, push the new object with order greater than the existing ones
          const newAnalytics = {
            ...req.body,
            _id: ids,
            id: ids,
            order: maxOrder + 1, // Set the new order value to be greater than the max order
          };
          advanceAnalyticsDoc.advanceAnalytics.push(newAnalytics);
        }
      }

      // Save the updated document
      await advanceAnalyticsDoc.save();
    } else {
      if (
        req.body.type === "target" &&
        req.body.targetedOptionsArray &&
        req.body.targetedOptionsArray.length >= 1
      ) {
        // Create new analytics documents for each element in targetedOptionsArray
        const newAnalytics = req.body.targetedOptionsArray.map(
          (option, index) => {
            const ids = new mongoose.Types.ObjectId(); // Generate a new ObjectId for each document
            return {
              ...req.body,
              _id: ids,
              id: ids,
              order: index + 1, // Use the index + 1 as the order value
              targetedOptionsArray: [option], // Store the option or adjust as needed
            };
          }
        );

        // Create a new document with the new analytics entries
        const newDoc = new AdvanceAnalytics({
          userUuid,
          questForeignKey,
          advanceAnalytics: newAnalytics,
        });

        await newDoc.save();
      } else {
        const ids = new mongoose.Types.ObjectId();
        // If the document does not exist, create a new document with the new object
        const newDoc = new AdvanceAnalytics({
          userUuid,
          questForeignKey,
          advanceAnalytics: [
            { ...req.body, _id: ids, id: ids, order: 1 }, // Start with order 1
          ],
        });
        await newDoc.save();
      }
    }

    const recentAdvanceAnalytics = await AdvanceAnalytics.findOne({
      userUuid: userUuid,
      questForeignKey: questForeignKey,
    });

    const requestAA = {
      params: {
        uuid: userUuid,
        id: questForeignKey,
        page: "advance-analytics",
        isAdvanceAnalytics: true,
      },
      query: {
        postLink: null,
      },
    };
    const desiredArray = await getQuestById(requestAA);

    res.status(200).json({
      message: "Analytics configured successfully!",
      advanceAnalytics: recentAdvanceAnalytics.advanceAnalytics,
      data: desiredArray,
    });
  } catch (error) {
    // If an error occurs, return an error response
    // console.error(error);
    res.status(500).json({ message: `${error.message}` });
  }
};

const deleteAdvanceAnalytics = async (req, res) => {
  try {
    const { userUuid, questForeignKey, type, id } = req.params;

    if (!type || !id)
      return res.status(403).json({ message: "Type or Id is not Provided" });
    if (!userUuid || !questForeignKey)
      return res.status(403).json({
        message:
          "Invalid request, Please provide references userUuid and questForeignKey in params",
      });

    // Update the document by removing the object with the specified type from the advanceAnalytics array
    const result = await AdvanceAnalytics.findOneAndUpdate(
      {
        userUuid: userUuid,
        questForeignKey: questForeignKey,
      },
      {
        $pull: {
          advanceAnalytics: {
            type: type,
            _id: new mongoose.Types.ObjectId(id),
          },
        }, // Remove objects matching the type
      },
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ message: "Document not found." });
    }

    const recentAdvanceAnalytics = await AdvanceAnalytics.findOne({
      userUuid: userUuid,
      questForeignKey: questForeignKey,
    });

    const requestAA = {
      params: {
        uuid: userUuid,
        id: questForeignKey,
        page: "advance-analytics",
        isAdvanceAnalytics: true,
      },
      query: {
        postLink: null,
      },
    };
    const desiredArray = await getQuestById(requestAA);

    res.status(200).json({
      message: "Analytics configured successfully!",
      advanceAnalytics: recentAdvanceAnalytics.advanceAnalytics,
      data: desiredArray,
    });
  } catch (error) {
    // If an error occurs, return an error response
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const updateAnalyticsOrder = async (req, res) => {
  try {
    const { userUuid, questForeignKey } = req.params;
    const { order } = req.body; // order should be an array of objects with _id, type, and order

    // Find the document
    const advanceAnalyticsDoc = await AdvanceAnalytics.findOne({
      userUuid: userUuid,
      questForeignKey: questForeignKey,
    });

    if (!advanceAnalyticsDoc) {
      return res.status(404).json({ message: "Document not found." });
    }

    // Create a map of _id and type to new orders for quick lookup
    const orderMap = new Map(
      order.map((item) => [`${item._id}_${item.type}`, item.order])
    );

    // Update the order of objects in advanceAnalytics
    advanceAnalyticsDoc.advanceAnalytics.forEach((item) => {
      const key = `${item._id}_${item.type}`;
      if (orderMap.has(key)) {
        item.order = orderMap.get(key);
      }
    });

    // Mark the array as modified
    advanceAnalyticsDoc.markModified("advanceAnalytics");

    // Save the updated document
    await advanceAnalyticsDoc.save();

    // Fetch the updated document
    const recentAdvanceAnalytics = await AdvanceAnalytics.findOne({
      userUuid: userUuid,
      questForeignKey: questForeignKey,
    });

    const requestAA = {
      params: {
        uuid: userUuid,
        id: questForeignKey,
        page: "advance-analytics",
        isAdvanceAnalytics: true,
      },
      query: {
        postLink: null,
      },
    };
    const desiredArray = await getQuestById(requestAA);

    res.status(200).json({
      message: "Analytics configured successfully!",
      advanceAnalytics: recentAdvanceAnalytics.advanceAnalytics,
      data: desiredArray,
    });
  } catch (error) {
    // If an error occurs, return an error response
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const deleteAllAdvanceAnalytics = async (req, res) => {
  try {
    const { userUuid, questForeignKey } = req.params;

    // Update the document by removing the object with the specified type from the advanceAnalytics array
    const result = await AdvanceAnalytics.findOneAndUpdate(
      {
        userUuid: userUuid,
        questForeignKey: questForeignKey,
      },
      {
        advanceAnalytics: [],
      },
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ message: "Document not found." });
    }

    const recentAdvanceAnalytics = await AdvanceAnalytics.findOne({
      userUuid: userUuid,
      questForeignKey: questForeignKey,
    });

    const requestAA = {
      params: {
        uuid: userUuid,
        id: questForeignKey,
        page: "advance-analytics",
        isAdvanceAnalytics: true,
      },
      query: {
        postLink: null,
      },
    };
    const desiredArray = await getQuestById(requestAA);

    res.status(200).json({
      message: "Analytics configured successfully!",
      advanceAnalytics: recentAdvanceAnalytics.advanceAnalytics,
      data: desiredArray,
    });
  } catch (error) {
    // If an error occurs, return an error response
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createInfoQuestQuest,
  deleteInfoQuestQuest,
  constraintForUniqueQuestion,
  getAllQuests,
  getAllQuestsWithOpenInfoQuestStatus,
  getAllQuestsWithAnsweredStatus,
  getAllQuestsWithDefaultStatus,
  getAllQuestsWithResult,
  getQuestById,
  getAllQuestsWithCompletedStatus,
  getAllQuestsWithChangeAnsStatus,
  getQuestionsWithStatus,
  getQuestByUniqueShareLink,
  getQuestByUniqueId,
  getQuestionsWithUserSettings,
  checkMediaDuplicateUrl,
  checkGifDuplicateUrl,
  getFullSoundcloudUrlFromShortUrl,
  getFlickerUrl,
  getQuestsAll,
  suppressPost,
  getQuestByIdQuestForeignKey,
  getQuestByIdUserUuid,
  getQuestsCustom,
  getQuestionsWithStatusQuestForeignKey,
  getQuestionsWithUserSettingsQuestForeignKey,
  getEmbededPostByUniqueId,
  advanceAnalytics,
  deleteAdvanceAnalytics,
  updateAnalyticsOrder,
  deleteAllAdvanceAnalytics,
};
