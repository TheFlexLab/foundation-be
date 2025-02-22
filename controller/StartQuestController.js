const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const StartQuests = require("../models/StartQuests");
const axios = require("axios");
const User = require("../models/UserModel");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const { getTreasury, updateTreasury } = require("../utils/treasuryService");
const {
  QUEST_COMPLETED_AMOUNT,
  QUEST_COMPLETED_CHANGE_AMOUNT,
  QUEST_OPTION_ADDED_AMOUNT,
  QUEST_OPTION_CONTENTION_GIVEN_AMOUNT,
  QUEST_OWNER_ACCOUNT,
  QUEST_OPTION_CONTENTION_REMOVED_AMOUNT,
} = require("../constants");
const { getUserBalance, updateUserBalance } = require("../utils/userServices");
const {
  getQuestionsWithStatus,
  getQuestionsWithUserSettings,
} = require("./InfoQuestQuestionController");
const { getPercentage } = require("../utils/getPercentage");
const UserQuestSetting = require("../models/UserQuestSetting");
const BookmarkQuests = require("../models/BookmarkQuests");
const Ledgers = require("../models/Ledgers");
const { findOne, findOneAndUpdate } = require("../models/Treasury");
const mongoose = require("mongoose");
const { BACKEND_URL, FRONTEND_URL, MODE } = require("../config/env");
const { createGuestMode } = require("./AuthController");
const { getRandomDigits } = require("../utils/getRandomDigits");
const { UserListSchema } = require("../models/UserList");
const { createToken } = require("../service/auth");
const nodeHtmlToImage = require("node-html-to-image");
const { s3ImageUpload } = require("../utils/uploadS3Bucket");
const {
  frameBinaryResultsHTML,
} = require("../templates/frameBinaryResultsHTML");
const fs = require("fs");
const path = require("path");
const { QuestRagUpdate } = require("../models/QuestRagUpdate");
const { Article } = require("../models/Article");
const { ArticleSetting } = require("../models/ArticleSetting");

const updateViolationCounter = async (req, res) => {
  try {
    const result = await User.updateOne(
      { uuid: req.params.uuid },
      { $inc: { violationCounter: 1 } }
    );
    if (result.nModified === 0) {
      return res.status(404).send("User not found");
    }
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).send(error);
  }
};
// Function to check if any percentage is >= 75%
const hasHighPercentage = (array) => {
  return (
    array?.some((obj) => {
      // Ensure obj is an object and not null or undefined
      if (obj && typeof obj === "object") {
        return Object.values(obj).some((value) => {
          // Convert percentage string to number (remove '%' sign if present)
          const percentage = parseFloat(value.replace("%", ""));
          return !isNaN(percentage) && percentage >= 75;
        });
      }
      return false;
    }) || false
  );
};

const createGuestAccountForWrapcast = async (fid) => {
  try {
    const uuid = crypto.randomBytes(11).toString("hex");
    const randomDigits = getRandomDigits(6);
    const user = await new User({
      email: `user-${randomDigits}@guest.com`,
      uuid: uuid,
      isGuestMode: true,
      ip: "",
      fid: fid * 1,
    });
    const users = await user.save();
    if (!users) throw new Error("User not Created");

    const userList = await UserListSchema.findOne({
      userUuid: user.uuid,
    });

    if (!userList) {
      const createUserList = new UserListSchema({
        userUuid: user.uuid,
      });
      const newUserList = await createUserList.save();
      if (!newUserList) {
        await user.deleteOne({
          uuid: uuid,
        });
        throw new Error("User not created due to list");
      }
    }

    // Generate a JWT token
    const token = createToken({ uuid: user.uuid });

    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "accountCreatedGuest",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: uuid,
      txTo: "dao",
      txAmount: "0",
      txData: uuid,
      // txDescription : "User creates a new account"
    });

    // res.cookie("uuid", uuid, cookieConfiguration());
    // res.cookie("jwt", token, cookieConfiguration());
    // // res.json({ message: "Successful" });
    // res.status(200).json({ ...user._doc, token });

    return uuid;
  } catch (error) {
    // console.error(error.message);
    // res.status(500).json({
    //   message: `An error occurred while createGuestMode Auth: ${error.message}`,
    // });
  }
};

const convertHTMLToImageAndUpload = async (questStartData, link) => {
  try {
    const timestamp = Date.now();
    // Generate a image name for the image file
    const imgName =
      `${link}_` +
      `${questStartData.startQuestData?._id}_` +
      `${timestamp}` +
      ".png";

    // Set Puppeteer options with --no-sandbox flag
    const puppeteerOptions = {
      args: ["--no-sandbox"],
      defaultViewport: {
        width: 1200,
        height: 800,
      },
    };

    const s3UploadData = await nodeHtmlToImage({
      output: `./assets/uploads/images/${imgName}`,
      html: frameBinaryResultsHTML(questStartData),
      puppeteerArgs: puppeteerOptions,
    }).then(async () => {
      //// console.log("The image was created successfully!");

      // Read the image file from the backend directory
      const filePath = `./assets/uploads/images/${imgName}`;
      const fileBuffer = fs.readFileSync(filePath);

      let s3UploadData;
      if (MODE === "PROD") {
        // Upload the file to S3 bucket
        s3UploadData = await s3ImageUpload({
          fileBuffer,
          fileName: imgName,
          type: "wrapcast",
        });
      }

      if (!s3UploadData) throw new Error("File not uploaded");

      //// console.log("s3UploadData", s3UploadData);

      // Delete the file from the backend directory after uploading to S3
      fs.unlink(filePath, (err) => {
        if (err) {
          // console.error("Error deleting file:", err);
          return;
        }
        //// console.log("File deleted successfully");
      });
      return s3UploadData;
    });

    return s3UploadData;
  } catch (error) {
    // console.log("Error: ", error.message);
    throw error;
  }
};

function generateFarcasterFrameMetaTag({
  frame,
  imageUrl,
  postUrl,
  buttons,
  link,
}) {
  if (!frame) {
    frame = "vNext";
  }

  if (buttons && buttons.length > 4) {
    throw new Error("Maximum of four buttons are allowed per frame.");
  }

  let metaTag = `<meta property="fc:frame" content="${frame ? frame : "vNext"
    }" />\n`;
  metaTag += `<meta property="fc:frame:image" content="${imageUrl}" />\n`;

  if (buttons) {
    buttons.forEach((button, index) => {
      if (button.type === "post") {
        metaTag += `<meta property="fc:frame:button:${index + 1}" content="${button.title
          }" />\n`;
        metaTag += `<meta property="fc:frame:button:${index + 1}" content="${button.title
          }" />\n`;
      } else {
        metaTag += `<meta property="fc:frame:button:${index + 1}" content="${button.title
          }" />\n`;
        metaTag += `<meta property="fc:frame:button:${index + 1
          }:action" content="link" />\n`;
        metaTag += `<meta property="fc:frame:button:${index + 1
          }:target" content="https://on.foundation/p/${link}" />\n`;
      }
    });
  }

  if (postUrl) {
    metaTag += `<meta property="fc:frame:post_url" content="${postUrl}" /> \n`;
  }

  return metaTag;
}

function frameGenerator(frameProps) {
  const metaTag = generateFarcasterFrameMetaTag(frameProps);

  // console.log(metaTag);

  const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
                <meta charset="utf-8">
                <title>Who should be in charge of handling a child's gender dysmorphia/confusion?</title>
                <meta name="title" content="Who should be in charge of handling a child's gender dysmorphia/confusion?" />
                <meta name="description" content="Foundation Labs" />
        
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Who should be in charge of handling a child's gender dysmorphia/confusion?" />
                <meta property="og:description" content="Foundation Labs" />
                <meta property="og:image" content="https://foundation-seo.s3.amazonaws.com/seo-logo-v2.png" />
        
                <meta property="twitter:card" content="website" />
                <meta property="twitter:url" content="https://on.foundation" />
                <meta name="twitter:title" content="Who should be in charge of handling a child's gender dysmorphia/confusion?" />
                <meta name="twitter:description" content="Foundation Labs" />
                <meta name="twitter:image" content="https://foundation-seo.s3.amazonaws.com/seo-logo-v2.png" />

                ${metaTag}
        </head>
        <body>
            <p>Hello from Lambda@Edge!</p>
        </body>
        </html>
  `;
  return html;
}

const handleGetFrame = async (req, res) => {
  try {
    const { link } = req.query;
    const frameProps = {
      imageUrl: `https://foundation-seo.s3.amazonaws.com/dynamicImages/${link}_wrapcast.png`, // Question img
      buttons: [
        { type: "post", title: "View Results" },
        { type: "post", title: "Participate" },
        { type: "redirect", title: "View On Foundation" },
      ],
      postUrl: `${BACKEND_URL}/startQuest/submitThroughFrames?link=${link}`,
      link: link,
      frame: "vNext",
    };

    res.status(200).send(frameGenerator(frameProps));
  } catch (err) {
    res.status(500).send("Not Created 2");
  }
};

const handleChangeFrame = async (req, res) => {
  try {
    const { link } = req.query;
    const frameProps = {
      imageUrl: `https://foundation-seo.s3.amazonaws.com/dynamicImages/${link}_wrapcast.png`, // Question img
      buttons: [
        { type: "post", title: "Yes" },
        { type: "post", title: "No" },
        { type: "post", title: "Go Back" },
      ],
      postUrl: `${BACKEND_URL}/startQuest/submitThroughFrames?link=${link}&type=participation`,
      frame: "vNext",
      link,
    };

    res.status(200).send(frameGenerator(frameProps));
  } catch (err) {
    res.status(500).send("Not Created 2");
  }
};

const submitThroughFrames = async (req, res) => {
  try {
    const { link, type } = req.query;

    // Button => View Result
    if (req.body.untrustedData.buttonIndex === 1 && type !== "participation") {
      const frameProps = await viewFarcasterResults(
        link,
        req.body.untrustedData.castId.hash,
        req.body.untrustedData.castId.fid
      );

      return res.status(200).send(frameGenerator(frameProps));
    }

    // Default Case (Button = Yes No) Simple Participation/Change
    const quest = await UserQuestSetting.findOne({ link: link });

    let infoQuest = await InfoQuestQuestions.findOne({
      _id: quest.questForeignKey,
    });

    // Determine the selected value based on the type and selection
    let selectedValue;
    switch (infoQuest.whichTypeQuestion) {
      case "like/dislike":
        selectedValue =
          req.body.untrustedData.buttonIndex === 1 ? "Like" : "Dislike";
        break;
      case "agree/disagree":
        selectedValue =
          req.body.untrustedData.buttonIndex === 1 ? "Agree" : "Disagree";
        break;
      case "yes/no":
        selectedValue = req.body.untrustedData.buttonIndex === 1 ? "Yes" : "No";
        break;
      default:
        throw new Error("Unknown type question"); // Handle unexpected types
    }

    // Construct the data object
    const data = {
      created: new Date().toISOString(),
      selected: selectedValue,
    };

    const farcasterUser = await User.findOne({
      role: "user",
      badges: {
        $elemMatch: {
          type: "farcaster",
          fid: req.body.untrustedData.castId.fid * 1,
        },
      },
    });

    const alreadyAnswered = await StartQuests.findOne({
      uuid: farcasterUser?.uuid,
      questForeignKey: quest.questForeignKey,
    });

    // Button => Participate
    if (req.body.untrustedData.buttonIndex === 2 && type !== "participation") {
      try {
        if (alreadyAnswered) {
          if (
            (alreadyAnswered.isFeedback &&
              alreadyAnswered.data.length === 0 &&
              alreadyAnswered.isAddOptionFeedback) ||
            alreadyAnswered.isFeedback ||
            quest.linkStatus !== "Enable" ||
            infoQuest.isClosed
          ) {
            const frameProps = {
              imageUrl: `https://foundation-seo.s3.amazonaws.com/closedParticipation.png`, // Question img
              buttons: [{ type: "post", title: "Go Back" }],
              postUrl: `${BACKEND_URL}/startQuest/submitThroughFrames?link=${link}&type=participation`,
              frame: "vNext",
              link,
            };

            return res.status(200).send(frameGenerator(frameProps));
          }
        }

        const frameProps = {
          imageUrl: `https://foundation-seo.s3.amazonaws.com/dynamicImages/${link}_wrapcast.png`, // Question img
          buttons: [
            { type: "post", title: "Yes" },
            { type: "post", title: "No" },
            { type: "post", title: "Go Back" },
          ],
          postUrl: `${BACKEND_URL}/startQuest/submitThroughFrames?link=${link}&type=participation`,
          frame: "vNext",
          link,
        };

        return res.status(200).send(frameGenerator(frameProps));
      } catch (err) {
        return res.status(500).send("Not Created 2");
      }
    }
    // Button View On Foundation
    // if (req.body.untrustedData.buttonIndex === 3 && type !== "participation") {
    //   try {
    //     return res.redirect(
    //       `${FRONTEND_URL}/p/${link}?fid=${req.body.untrustedData.castId.fid}`
    //     );
    //   } catch (err) {
    //     return res.status(500).send("Not Created 2");
    //   }
    // }
    // Button Go Back (Inside 2nd Button )
    if (req.body.untrustedData.buttonIndex === 3 && type === "participation") {
      try {
        const frameProps = {
          imageUrl: `https://foundation-seo.s3.amazonaws.com/dynamicImages/${link}_wrapcast.png`, // Question img
          buttons: [
            { type: "post", title: "View Results" },
            { type: "post", title: "Participate" },
            { type: "redirect", title: "View On Foundation" },
          ],
          postUrl: `${BACKEND_URL}/startQuest/submitThroughFrames?link=${link}`,
          frame: "vNext",
          link,
        };

        return res.status(200).send(frameGenerator(frameProps));
      } catch (err) {
        return res.status(500).send("Not Created 2");
      }
    }

    // Button Go Back (Inside 2nd Button ) with closed case
    if (req.body.untrustedData.buttonIndex === 1 && type === "participation") {
      try {
        const frameProps = {
          imageUrl: `https://foundation-seo.s3.amazonaws.com/dynamicImages/${link}_wrapcast.png`, // Question img
          buttons: [
            { type: "post", title: "View Results" },
            { type: "post", title: "Participate" },
            { type: "redirect", title: "View On Foundation" },
          ],
          postUrl: `${BACKEND_URL}/startQuest/submitThroughFrames?link=${link}`,
          frame: "vNext",
          link,
        };

        return res.status(200).send(frameGenerator(frameProps));
      } catch (err) {
        return res.status(500).send("Not Created 2");
      }
    }
    let uuid;
    let requestBody;
    let response;
    // Without Ip limitations
    if (farcasterUser && alreadyAnswered) {
      // console.log("farcasterUser && alreadyAnswered");

      uuid = farcasterUser.uuid;

      requestBody = {
        questId: quest.questForeignKey,
        changeAnswerAddedObj: data,
        addedAnswer: "",
        uuid: uuid,
      };

      response = await fetch(
        `${BACKEND_URL}/startQuest/updateChangeAnsStartQuest`,
        {
          method: "POST", // Specify the HTTP method
          headers: {
            "Content-Type": "application/json", // Specify the content type
          },
          body: JSON.stringify(requestBody), // Convert the request body to a JSON string
        }
      );
    } else if (farcasterUser && !alreadyAnswered) {
      // console.log("farcasterUser && not alreadyAnswered");

      uuid = farcasterUser.uuid;
      requestBody = {
        questForeignKey: quest.questForeignKey,
        data: data,
        addedAnswer: "",
        uuid: uuid,
        isSharedLinkAns: true,
        postLink: link,
        // Add more fields if needed
      };

      // Forward the request to the complex API using fetch
      response = await fetch(`${BACKEND_URL}/startQuest/createStartQuest`, {
        method: "POST", // Specify the HTTP method
        headers: {
          "Content-Type": "application/json", // Specify the content type
        },
        body: JSON.stringify(requestBody), // Convert the request body to a JSON string
      });
    } else if (!farcasterUser) {
      // console.log("No farcasterUser");

      uuid = await createGuestAccountForWrapcast(
        req.body.untrustedData.castId.fid
      );

      requestBody = {
        questForeignKey: quest.questForeignKey,
        data: data,
        addedAnswer: "",
        uuid: uuid,
        isSharedLinkAns: true,
        postLink: link,
        // Add more fields if needed
      };

      // Forward the request to the complex API using fetch
      response = await fetch(`${BACKEND_URL}/startQuest/createStartQuest`, {
        method: "POST", // Specify the HTTP method
        headers: {
          "Content-Type": "application/json", // Specify the content type
        },
        body: JSON.stringify(requestBody), // Convert the request body to a JSON string
      });
    }

    // Check if the response is OK (status in the range 200-299)
    if (!response.ok)
      throw new Error("Start quest while warpcast frame got some error.");

    infoQuest = await InfoQuestQuestions.findOne({
      _id: quest.questForeignKey,
    });

    const result = await getQuestionsWithStatus([infoQuest], uuid);

    // console.log(infoQuest.result);

    const result1 = await getQuestionsWithUserSettings(result, uuid);

    let resultArray = result1.map((item) => getPercentage(item, null, null));
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage
        ? item.selectedPercentage
        : [],
      contendedPercentage: item.contendedPercentage
        ? item.contendedPercentage
        : [],
      userQuestSetting: item.userQuestSetting,
    }));

    const web3S3Image = await convertHTMLToImageAndUpload(
      desiredArray[0],
      link
    );

    if (!alreadyAnswered) {
      await StartQuests.findOneAndUpdate(
        { _id: desiredArray[0].startQuestData._id },
        { farcasterHash: req.body.untrustedData.castId.hash },
        { fid: req.body.untrustedData.castId.fid }
      );
    }

    const frameProps = {
      imageUrl: web3S3Image.s3Url, // results
      buttons: [{ type: "post", title: "Change" }],
      postUrl: `${BACKEND_URL}/startQuest/frame-change?link=${link}&type=participation`,
      frame: "vNext",
    };

    // Send the response back to the client
    return res.status(200).send(frameGenerator(frameProps));
  } catch (error) {
    // console.error("Error forwarding request:", error);
    return res.status(500).send("An error occurred");
  }
};

const fidRedirect = async (req, res) => {
  try {
    const { link } = req.query;
    res.redirect(
      `${FRONTEND_URL}/p/${link}?fid=${req.body.untrustedData.castId.fid}`
    );
  } catch (error) {
    // console.error("Error forwarding request:", error);
    return res.status(500).send("An error occurred");
  }
};

const viewFarcasterResults = async (link, hash, fid) => {
  try {
    const quest = await UserQuestSetting.findOne({ link: link });

    const infoQuest = await InfoQuestQuestions.findOne({
      _id: quest.questForeignKey,
    });

    // const alreadyAnswered = await StartQuests.findOne({
    //   farcasterHash: hash,
    // });

    const farcasterUser = await User.findOne({
      role: "user",
      badges: {
        $elemMatch: {
          type: "farcaster",
          fid: fid * 1,
        },
      },
    });

    let resultExistAlready;

    if (farcasterUser) {
      resultExistAlready = await StartQuests.findOne({
        uuid: farcasterUser.uuid,
        questForeignKey: quest.questForeignKey,
      });
    }

    // let url = "";
    // if (alreadyAnswered?.uuid) {
    //   url = `${BACKEND_URL}/infoquestions/getQuest/${link}?uuid=${alreadyAnswered?.uuid}`;
    // } else {
    //   url = `${BACKEND_URL}/infoquestions/getQuest/${link}`;
    // }

    // // Forward the request to the complex API using fetch
    // const response = await fetch(url, {
    //   method: "GET", // Specify the HTTP method
    //   headers: {
    //     "Content-Type": "application/json", // Specify the content type
    //   },
    // });

    // // console.log("response", response);

    // if (!response.ok)
    //   throw new Error("Start quest while warpcast frame got some error.");

    let result;
    let result1;

    if (farcasterUser && resultExistAlready) {
      result = await getQuestionsWithStatus([infoQuest], farcasterUser.uuid);
      result1 = await getQuestionsWithUserSettings(result, farcasterUser.uuid);
    } else {
      result = await getQuestionsWithStatus([infoQuest], null);
      result1 = await getQuestionsWithUserSettings(result, null);
    }
    let resultArray = result1.map((item) => getPercentage(item, null, null));
    const desiredArray = resultArray.map((item) => ({
      ...item._doc,
      selectedPercentage: item.selectedPercentage
        ? item.selectedPercentage
        : [],
      contendedPercentage: item.contendedPercentage
        ? item.contendedPercentage
        : [],
      userQuestSetting: item.userQuestSetting,
    }));

    const web3S3Image = await convertHTMLToImageAndUpload(
      desiredArray[0],
      link
    );

    const frameProps = {
      imageUrl: web3S3Image.s3Url, // results
      buttons: [{ type: "post", title: "Change" }],
      postUrl: `${BACKEND_URL}/startQuest/frame-change?link=${link}&type=participation`,
      frame: "vNext",
    };

    return frameProps;
  } catch (err) {
    // console.error("Error forwarding request:", err);
  }
};

const createStartQuest = async (req, res) => {
  try {
    const alreadySubmitted = await StartQuests.findOne({
      uuid: req.body.uuid,
      questForeignKey: req.body.questForeignKey,
      $expr: { $gt: [{ $size: "$data" }, 0] }, // Check if the length of the data array is greater than 0
    });
    if (alreadySubmitted) throw new Error("Already Submitted");

    const currentDate = new Date();
    const { postLink } = req.body;
    const checkSuppression = await InfoQuestQuestions.findOne({
      _id: req.body.questForeignKey,
    });
    if (checkSuppression.suppressed) {
      throw new Error(
        "Sorry, this content has been suppressed and is not available at the moment. Please try again later or contact support for further assistance."
      );
    }
    // Update InfoQuestQuestions and get the data
    const getInfoQuestQuestion = await InfoQuestQuestions.findByIdAndUpdate(
      { _id: req.body.questForeignKey },
      {
        $set: { lastInteractedAt: currentDate.toISOString() },
        $inc: { interactingCounter: 1 },
        $inc: { submitCounter: 1 },
      },
      { new: true } // To get the updated document
    );

    if (!getInfoQuestQuestion) {
      return res.status(404).send("InfoQuestQuestions not found");
    }

    // Get the UUID of the matching record in InfoQuestQuestions
    const matchingUuid = getInfoQuestQuestion.uuid;

    // Update the User table with the matching UUID and increment 'userAnswered'
    await User.findOneAndUpdate(
      { uuid: matchingUuid },
      { $inc: { usersAnswered: 1 } }
    );
    // Your Post Engaged
    await User.findOneAndUpdate(
      { uuid: checkSuppression.uuid },
      { $inc: { yourPostEngaged: 1 } }
    );

    if (req.body.isSharedLinkAns) {
      // Increament $inc userQuest submtted count if questForeignKey exist in UserQuestSetting Model
      await UserQuestSetting.findOneAndUpdate(
        { questForeignKey: req.body.questForeignKey, link: req.body.postLink },
        { $inc: { questsCompleted: 1 } } // Increment questImpression field by 1
      );
    }

    const txID = crypto.randomBytes(11).toString("hex");
    // Process the 'contended' array and increment 'contentionsGiven'
    const contendedArray = req.body.data?.contended || [];
    const contentionsGivenIncrement = contendedArray.length;
    // if user gives contention
    if (contendedArray.length) {
      const userBalance = await getUserBalance(req.body.uuid);
      if (userBalance < QUEST_OPTION_CONTENTION_GIVEN_AMOUNT)
        throw new Error("The balance is insufficient to give the contention!");
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "User",
        txFrom: req.body.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.questForeignKey,
        // txDescription : "User gives contention to a quest answer"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "DAO",
        txFrom: req.body.uuid,
        txTo: "DAO Treasury",
        txAmount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT,
        txData: req.body.questForeignKey,
        // txDescription : "DisInsentive for giving contention"
      });
      // Increment the Treasury
      await updateTreasury({
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT,
        inc: true,
      });
      // Decrement the UserBalance
      await updateUserBalance({
        uuid: req.body.uuid,
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT,
        dec: true,
      });
      const userSpent = await User.findOne({ uuid: req.body.uuid });
      userSpent.fdxSpent =
        userSpent.fdxSpent + QUEST_OPTION_CONTENTION_GIVEN_AMOUNT;
      await userSpent.save();
    }

    await User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $inc: { contentionsGiven: contentionsGivenIncrement } }
    );

    if (
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "open choice"
    ) {
      if (req.body.isAddedAnsSelected) {
        await User.findOneAndUpdate(
          { uuid: req.body.uuid },
          {
            $inc: {
              selectionsOnAddedAns: 1,
            },
          }
        );
      } else {
        for (const item of req.body.data?.selected) {
          const matchingStartQuest = await StartQuests.findOne({
            addedAnswer: item.question,
          });

          if (matchingStartQuest) {
            await User.findOneAndUpdate(
              { uuid: matchingStartQuest.uuid },
              {
                $inc: {
                  selectionsOnAddedAns: 1,
                },
              }
            );
          }
        }
      }
    }

    if (
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "ranked choise"
    ) {
      for (const item of req.body.data?.contended) {
        const matchingStartQuest = await StartQuests.findOne({
          addedAnswer: item.question,
        });

        if (matchingStartQuest) {
          await User.findOneAndUpdate(
            { uuid: matchingStartQuest.uuid },
            {
              $inc: {
                contentionsOnAddedAns: 1,
              },
            }
          );
        }
      }
    }

    // // Function to process an array
    // const processArray = async (array, fieldToUpdate) => {
    //   if (array && Array.isArray(array)) {
    //     for (const item of array) {
    //       // Check if item.question matches addedAnswer in StartQuests
    //       const matchingStartQuest = await StartQuests.findOne({
    //         addedAnswer: item.question,
    //       });

    //       if (matchingStartQuest) {
    //         // Get the uuid of the matching record
    //         const matchingUuid = matchingStartQuest.uuid;

    //         // Define the field to update based on the provided fieldToUpdate parameter
    //         const updateField = {};
    //         updateField[fieldToUpdate] = 1;

    //         // Increment the specified field in the User table
    //         await User.findOneAndUpdate(
    //           { uuid: matchingUuid },
    //           { $inc: updateField }
    //         );
    //       }
    //     }
    //   }
    // };

    // // Process the 'selected' array
    // await processArray(req.body.data?.selected, "selectionsOnAddedAns");

    if (req.body.isAddedAnsSelected === false) {
      req.body.data.selected = req.body.data.selected.filter(
        (entry) => !entry.addedAnswerByUser
      );
    }
    const alreadyExistRecord = await StartQuests.findOne({
      questForeignKey: req.body.questForeignKey,
      uuid: req.body.uuid,
    });
    let question;
    if (!alreadyExistRecord) {
      // Create a new StartQuests document
      question = new StartQuests({
        questForeignKey: req.body.questForeignKey,
        uuid: req.body.uuid,
        addedAnswer: req.body.addedAnswer,
        data: req.body.data,
        userQuestSettingRef: req.body.userQuestSettingRef
          ? req.body.userQuestSettingRef
          : "",
      });
      await question.save();
    } else {
      question = await StartQuests.findOneAndUpdate(
        { questForeignKey: req.body.questForeignKey, uuid: req.body.uuid },
        {
          addedAnswer: req.body.addedAnswer,
          data: req.body.data,
          userQuestSettingRef: req.body.userQuestSettingRef
            ? req.body.userQuestSettingRef
            : "",
        }
      ).exec();
    }

    // increment the totalStartQuest, selected and contended count
    const selectedCounter = {};
    const contendedCounter = {};
    const shareLinkSelectedCounter = {};
    const shareLinkContendedCounter = {};

    if (
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "ranked choise"
    ) {
      if (
        getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
        getInfoQuestQuestion.whichTypeQuestion === "open choice"
      ) {
        req.body.data?.selected?.forEach((item) => {
          selectedCounter[`result.selected.${item.question}`] = 1;
        });
        req.body.data?.contended?.forEach((item) => {
          contendedCounter[`result.contended.${item.question}`] = 1;
        });

        if (postLink) {
          req.body.data?.selected?.forEach((item) => {
            shareLinkSelectedCounter[`result.selected.${item.question}`] = 1;
          });
          req.body.data?.contended?.forEach((item) => {
            shareLinkContendedCounter[`result.contended.${item.question}`] = 1;
          });
        }
      }
      if (getInfoQuestQuestion.whichTypeQuestion === "ranked choise") {
        req.body.data?.selected?.forEach((item, index) => {
          const count = req.body.data?.selected.length - index - 1;
          selectedCounter[`result.selected.${item.question}`] = count;
        });
        req.body.data?.contended?.forEach((item) => {
          contendedCounter[`result.contended.${item.question}`] = 1;
        });

        if (postLink) {
          req.body.data?.selected?.forEach((item, index) => {
            const count = req.body.data?.selected.length - index - 1;
            shareLinkSelectedCounter[`result.selected.${item.question}`] =
              count;
          });
          req.body.data?.contended?.forEach((item) => {
            shareLinkContendedCounter[`result.contended.${item.question}`] = 1;
          });
        }
      }
    } else {
      selectedCounter[`result.selected.${req.body.data.selected}`] = 1;
      if (postLink) {
        shareLinkContendedCounter[
          `result.selected.${req.body.data.selected}`
        ] = 1;
      }
    }

    const incrementFields = {
      totalStartQuest: 1,
      ...selectedCounter,
      ...contendedCounter,
    };

    // Conditionally add `shareLinkTotalStartQuest` to the increment object
    if (req.body.userQuestSettingRef && req.body.userQuestSettingRef !== "") {
      incrementFields.shareLinkTotalStartQuest = 1;
    }

    // Perform the update
    await getInfoQuestQuestion.updateOne({
      $inc: incrementFields,
    });

    // await getInfoQuestQuestion.updateOne({
    //   $inc: {
    //     totalStartQuest: 1,
    //     ...selectedCounter,
    //     ...contendedCounter,
    //   },
    //   // $set: {
    //   //   startQuestData: question._id,
    //   // },
    // });
    await UserQuestSetting.findOneAndUpdate(
      { link: postLink },
      {
        $inc: {
          ...shareLinkSelectedCounter,
          ...shareLinkContendedCounter,
          ...(postLink && { shareLinkTotalStartQuest: 1 }),
        },
      }
    );

    // increment the result answers count
    // await getInfoQuestQuestion.updateOne({
    //   $inc: {
    //     totalStartQuest: 1,
    //     [`result.answer.${req.body.data.selected}`]: 1,
    //   },
    // });

    if (req.body.addedAnswer !== "") {
      // Increment 'addedAnswers' for the user
      await User.findOneAndUpdate(
        { uuid: req.body.uuid },
        { $inc: { addedAnswers: 1 } }
      );

      // Push the added answer to InfoQuestQuestions
      await InfoQuestQuestions.findByIdAndUpdate(
        { _id: req.body.questForeignKey },
        {
          $push: {
            QuestAnswers: {
              question: req.body.addedAnswer,
              selected: req.body.isAddedAnsSelected,
              uuid: req.body.addedAnswerUuid,
              _id: new mongoose.Types.ObjectId(),
            },
          },
        }
      );
      const txID2 = crypto.randomBytes(11).toString("hex");

      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "User",
        txFrom: req.body.questForeignKey,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.questForeignKey,
        // txDescription : "User adds an answer to a quest"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: req.body.uuid,
        txAmount: QUEST_OPTION_ADDED_AMOUNT,
        txData: req.body.questForeignKey,
        // txDescription : "Incentive for adding answer to quest"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: QUEST_OPTION_ADDED_AMOUNT, dec: true });
      // Increment the UserBalance
      await updateUserBalance({
        uuid: req.body.uuid,
        amount: QUEST_OPTION_ADDED_AMOUNT,
        inc: true,
      });
      const userEarned = await User.findOne({ uuid: req.body.uuid });
      userEarned.fdxEarned = userEarned.fdxEarned + QUEST_OPTION_ADDED_AMOUNT;
      userEarned.rewardSchedual.postParticipationFdx =
        userEarned.rewardSchedual.postParticipationFdx +
        QUEST_OPTION_ADDED_AMOUNT;
      await userEarned.save();
    }
    // Correct Answer or Wrong Answer
    const questionCorrectAnswer =
      getInfoQuestQuestion.QuestionCorrect.toLowerCase().trim();
    if (
      questionCorrectAnswer !== "no option" &&
      questionCorrectAnswer !== "not selected"
    ) {
      // For only multiple choice question
      if (questionCorrectAnswer === "selected") {
        const questionCorrectAnswerArray =
          getInfoQuestQuestion.QuestAnswersSelected.map((item) =>
            item?.answers.toLowerCase().trim()
          );
        const givenAnswersArray = req.body.data?.selected;
        const answersMatched = givenAnswersArray.every((item) =>
          questionCorrectAnswerArray.includes(
            item?.question.toLowerCase().trim()
          )
        );
        if (answersMatched) {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { correctedAnswers: 1 } }
          );
        } else {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { wrongedAnswers: 1 } }
          );
        }
      } else {
        // for Yes/No and Agree/Disagree
        const givenAnswer = req.body.data?.selected?.toLowerCase().trim();
        if (questionCorrectAnswer === givenAnswer) {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { correctedAnswers: 1 } }
          );
        } else {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { wrongedAnswers: 1 } }
          );
        }
      }
    }
    // Check if QuestionCorrect is not "Not Selected" and push the ID to completedQuests
    // if (data.QuestionCorrect !== "Not Selected") {
    await User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $addToSet: { completedQuests: getInfoQuestQuestion._id } }
    );

    const txID3 = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "postCompleted",
      txID: txID3,
      txAuth: "User",
      txFrom: req.body.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.questForeignKey,
      // txDescription : "User completes a quest"
    });
    // Create Ledger
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "postCompleted",
      txID: txID3,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: req.body.uuid,
      txAmount: QUEST_COMPLETED_AMOUNT,
      txData: req.body.questForeignKey,
      // txDescription : "Incentive for completing quests"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: QUEST_COMPLETED_AMOUNT, dec: true });
    // Increment the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: QUEST_COMPLETED_AMOUNT,
      inc: true,
    });

    const responsingUserEarnedFDX = await User.findOne({ uuid: req.body.uuid });
    responsingUserEarnedFDX.fdxEarned =
      responsingUserEarnedFDX.fdxEarned + QUEST_COMPLETED_AMOUNT;
    responsingUserEarnedFDX.rewardSchedual.myEngagementInPostFdx =
      responsingUserEarnedFDX.rewardSchedual.myEngagementInPostFdx +
      QUEST_COMPLETED_AMOUNT;
    await responsingUserEarnedFDX.save();

    // Create Ledger
    await createLedger({
      uuid: getInfoQuestQuestion.uuid,
      txUserAction: "postCompletedUser",
      txID: txID3,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: getInfoQuestQuestion.uuid,
      txAmount: QUEST_OWNER_ACCOUNT,
      txData: req.body.questForeignKey,
      // txDescription : "Incentive to Quest owner for completed quest"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: QUEST_OWNER_ACCOUNT, dec: true });
    // Increment the UserBalance
    await updateUserBalance({
      uuid: getInfoQuestQuestion.uuid,
      amount: QUEST_OWNER_ACCOUNT,
      inc: true,
    });
    const ownerEarnedFDX = await User.findOne({
      uuid: getInfoQuestQuestion.uuid,
    });
    ownerEarnedFDX.fdxEarned = ownerEarnedFDX.fdxEarned + QUEST_OWNER_ACCOUNT;
    ownerEarnedFDX.rewardSchedual.postParticipationFdx =
      ownerEarnedFDX.rewardSchedual.postParticipationFdx + QUEST_OWNER_ACCOUNT;
    await ownerEarnedFDX.save();

    const bookmarkExist = await BookmarkQuests.findOne({
      questForeignKey: getInfoQuestQuestion._id,
    });

    const infoQuest = await InfoQuestQuestions.find({
      _id: getInfoQuestQuestion._id,
    }).populate("getUserBadge", "badges");
    // getting the quest status
    const result = await getQuestionsWithStatus(infoQuest, req.body.uuid);
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, req.body.uuid);
    // getting the quest percentage
    const resultArray = result1.map(getPercentage);
    const selectedHasHighPercentage = hasHighPercentage(
      resultArray[0].selectedPercentage || []
    );
    const contendedHasHighPercentage = hasHighPercentage(
      resultArray[0].contendedPercentage || []
    );
    await InfoQuestQuestions.findOneAndUpdate(
      {
        _id: req.body.questForeignKey,
      },
      {
        selectedPercentage: resultArray[0].selectedPercentage,
        contendedPercentage: resultArray[0].contendedPercentage,
        isAboveThePercentage: selectedHasHighPercentage ? true : false,
      }
    );
    await QuestRagUpdate.findOneAndUpdate(
      {},
      {
        $addToSet: { dailyQuestsToEmbed: req.body.questForeignKey.toString() }, // Use $addToSet to ensure uniqueness
      },
      { new: true, upsert: true } // Return the updated document, create if it doesn't exist
    );
    let desiredArray = resultArray.map((item) => ({
      ...item._doc,
      userQuestSetting: item.userQuestSetting,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      bookmark: !!bookmarkExist,
    }));

    // desiredArray = await Promise.all(
    //   desiredArray.map(async (doc) => {
    //     const articles = await Article.find({ source: doc._id }).sort({
    //       createdAt: -1,
    //     });
    //     return { ...doc, articles }; // Attach the articles to the doc
    //   })
    // );

    if (
      req.body.articleRef &&
      req.body.articleRef.length > 8 &&
      mongoose.Types.ObjectId.isValid(req.body.articleRef)
    ) {
      await StartQuests.findOneAndUpdate(
        { _id: question._id },
        {
          articleRef: req.body.articleRef,
        },
        { new: true }
      ).exec();

      await Article.findOneAndUpdate(
        { _id: req.body.articleRef },
        {
          $addToSet: { submitEngagementsOfArticleSharedById: question._id },
        }
      ).exec();
    }

    if (req.body.articleRef && req.body.articleRef.length === 8) {
      await StartQuests.findOneAndUpdate(
        { _id: question._id },
        {
          articleRef: req.body.articleRef,
        },
        { new: true }
      ).exec();

      await ArticleSetting.findOneAndUpdate(
        { uniqueLink: req.body.articleRef },
        {
          $addToSet: {
            submitEngagementsOfArticleSharedByUniqueLink: question._id,
          },
        }
      ).exec();
    }

    const excludedPages = ["Feedback", "SharedLink", "Hidden", "Bookmark"];

    if (!excludedPages.includes(req.body.Page)) {
      desiredArray = await Promise.all(
        desiredArray.map(async (doc) => {
          const articles = await Article.find({ source: doc._id }).sort({
            createdAt: -1,
          });
          return { ...doc, articles }; // Attach the articles to the doc
        })
      );
    }

    res.status(200).json({
      message: "Start Quest Created Successfully",
      startQuestID: question._id,
      data: desiredArray[0],
    });
  } catch (err) {
    // console.error(err);
    res.status(500).json({
      message: `An error occurred while createStartQuest: ${err.message}`,
    });
  }
};

async function createStartQuestUserList(req, res) {
  try {
    // console.log("req", req);
    const alreadySubmitted = await StartQuests.findOne({
      uuid: req.body.uuid,
      questForeignKey: req.body.questForeignKey,
      $expr: { $gt: [{ $size: "$data" }, 0] }, // Check if the length of the data array is greater than 0
    });
    if (alreadySubmitted) throw new Error("Already Submitted");

    const currentDate = new Date();
    const { postLink } = req.body;
    const checkSuppression = await InfoQuestQuestions.findOne({
      _id: req.body.questForeignKey,
    });
    if (checkSuppression.suppressed) {
      throw new Error(
        "Sorry, this content has been suppressed and is not available at the moment. Please try again later or contact support for further assistance."
      );
    }
    // Update InfoQuestQuestions and get the data
    const getInfoQuestQuestion = await InfoQuestQuestions.findByIdAndUpdate(
      { _id: req.body.questForeignKey },
      {
        $set: { lastInteractedAt: currentDate.toISOString() },
        $inc: { interactingCounter: 1 },
        $inc: { submitCounter: 1 },
      },
      { new: true } // To get the updated document
    );

    if (!getInfoQuestQuestion) {
      return res.status(404).send("InfoQuestQuestions not found");
    }

    // Get the UUID of the matching record in InfoQuestQuestions
    const matchingUuid = getInfoQuestQuestion.uuid;

    // Update the User table with the matching UUID and increment 'userAnswered'
    await User.findOneAndUpdate(
      { uuid: matchingUuid },
      { $inc: { usersAnswered: 1 } }
    );
    // Your Post Engaged
    await User.findOneAndUpdate(
      { uuid: checkSuppression.uuid },
      { $inc: { yourPostEngaged: 1 } }
    );

    if (req.body.isSharedLinkAns) {
      // Increament $inc userQuest submtted count if questForeignKey exist in UserQuestSetting Model
      await UserQuestSetting.findOneAndUpdate(
        { questForeignKey: req.body.questForeignKey, link: req.body.postLink },
        { $inc: { questsCompleted: 1 } } // Increment questImpression field by 1
      );
    }

    const txID = crypto.randomBytes(11).toString("hex");
    // Process the 'contended' array and increment 'contentionsGiven'
    const contendedArray = req.body.data?.contended || [];
    const contentionsGivenIncrement = contendedArray.length;
    // if user gives contention
    if (contendedArray.length) {
      const userBalance = await getUserBalance(req.body.uuid);
      if (userBalance < QUEST_OPTION_CONTENTION_GIVEN_AMOUNT)
        throw new Error("The balance is insufficient to give the contention!");
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "User",
        txFrom: req.body.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.questForeignKey,
        // txDescription : "User gives contention to a quest answer"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "DAO",
        txFrom: req.body.uuid,
        txTo: "DAO Treasury",
        txAmount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT,
        txData: req.body.questForeignKey,
        // txDescription : "DisInsentive for giving contention"
      });
      // Increment the Treasury
      await updateTreasury({
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT,
        inc: true,
      });
      // Decrement the UserBalance
      await updateUserBalance({
        uuid: req.body.uuid,
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT,
        dec: true,
      });
      const userSpent = await User.findOne({ uuid: req.body.uuid });
      userSpent.fdxSpent =
        userSpent.fdxSpent + QUEST_OPTION_CONTENTION_GIVEN_AMOUNT;
      await userSpent.save();
    }

    await User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $inc: { contentionsGiven: contentionsGivenIncrement } }
    );

    if (
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "open choice"
    ) {
      if (req.body.isAddedAnsSelected) {
        await User.findOneAndUpdate(
          { uuid: req.body.uuid },
          {
            $inc: {
              selectionsOnAddedAns: 1,
            },
          }
        );
      } else {
        for (const item of req.body.data?.selected) {
          const matchingStartQuest = await StartQuests.findOne({
            addedAnswer: item.question,
          });

          if (matchingStartQuest) {
            await User.findOneAndUpdate(
              { uuid: matchingStartQuest.uuid },
              {
                $inc: {
                  selectionsOnAddedAns: 1,
                },
              }
            );
          }
        }
      }
    }

    if (
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "ranked choise"
    ) {
      if (req?.body?.data?.contended) {
        for (const item of req.body.data?.contended) {
          const matchingStartQuest = await StartQuests.findOne({
            addedAnswer: item.question,
          });

          if (matchingStartQuest) {
            await User.findOneAndUpdate(
              { uuid: matchingStartQuest.uuid },
              {
                $inc: {
                  contentionsOnAddedAns: 1,
                },
              }
            );
          }
        }
      }
    }

    // // Function to process an array
    // const processArray = async (array, fieldToUpdate) => {
    //   if (array && Array.isArray(array)) {
    //     for (const item of array) {
    //       // Check if item.question matches addedAnswer in StartQuests
    //       const matchingStartQuest = await StartQuests.findOne({
    //         addedAnswer: item.question,
    //       });

    //       if (matchingStartQuest) {
    //         // Get the uuid of the matching record
    //         const matchingUuid = matchingStartQuest.uuid;

    //         // Define the field to update based on the provided fieldToUpdate parameter
    //         const updateField = {};
    //         updateField[fieldToUpdate] = 1;

    //         // Increment the specified field in the User table
    //         await User.findOneAndUpdate(
    //           { uuid: matchingUuid },
    //           { $inc: updateField }
    //         );
    //       }
    //     }
    //   }
    // };

    // // Process the 'selected' array
    // await processArray(req.body.data?.selected, "selectionsOnAddedAns");

    if (req.body.isAddedAnsSelected === false) {
      req.body.data.selected = req.body.data.selected.filter(
        (entry) => !entry.addedAnswerByUser
      );
    }
    const alreadyExistRecord = await StartQuests.findOne({
      questForeignKey: req.body.questForeignKey,
      uuid: req.body.uuid,
    });
    let question;
    if (!alreadyExistRecord) {
      // Create a new StartQuests document
      question = new StartQuests({
        questForeignKey: req.body.questForeignKey,
        uuid: req.body.uuid,
        addedAnswer: req.body.addedAnswer,
        data: req.body.data,
      });
      await question.save();
    } else {
      question = await StartQuests.findOneAndUpdate(
        { questForeignKey: req.body.questForeignKey, uuid: req.body.uuid },
        {
          addedAnswer: req.body.addedAnswer,
          data: req.body.data,
        }
      ).exec();
    }

    // increment the totalStartQuest, selected and contended count
    const selectedCounter = {};
    const contendedCounter = {};
    const shareLinkSelectedCounter = {};
    const shareLinkContendedCounter = {};

    if (
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "ranked choise"
    ) {
      if (
        getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
        getInfoQuestQuestion.whichTypeQuestion === "open choice"
      ) {
        req.body.data?.selected?.forEach((item) => {
          selectedCounter[`result.selected.${item.question}`] = 1;
        });
        req.body.data?.contended?.forEach((item) => {
          contendedCounter[`result.contended.${item.question}`] = 1;
        });

        if (postLink) {
          req.body.data?.selected?.forEach((item) => {
            shareLinkSelectedCounter[`result.selected.${item.question}`] = 1;
          });
          req.body.data?.contended?.forEach((item) => {
            shareLinkContendedCounter[`result.contended.${item.question}`] = 1;
          });
        }
      }
      if (getInfoQuestQuestion.whichTypeQuestion === "ranked choise") {
        req.body.data?.selected?.forEach((item, index) => {
          const count = req.body.data?.selected.length - index - 1;
          selectedCounter[`result.selected.${item.question}`] = count;
        });
        req.body.data?.contended?.forEach((item) => {
          contendedCounter[`result.contended.${item.question}`] = 1;
        });

        if (postLink) {
          req.body.data?.selected?.forEach((item, index) => {
            const count = req.body.data?.selected.length - index - 1;
            shareLinkSelectedCounter[`result.selected.${item.question}`] =
              count;
          });
          req.body.data?.contended?.forEach((item) => {
            shareLinkContendedCounter[`result.contended.${item.question}`] = 1;
          });
        }
      }
    } else {
      selectedCounter[`result.selected.${req.body.data.selected}`] = 1;
      if (postLink) {
        shareLinkContendedCounter[
          `result.selected.${req.body.data.selected}`
        ] = 1;
      }
    }
    await getInfoQuestQuestion.updateOne({
      $inc: {
        totalStartQuest: 1,
        ...selectedCounter,
        ...contendedCounter,
      },
      // $set: {
      //   startQuestData: question._id,
      // },
    });
    await UserQuestSetting.findOneAndUpdate(
      { link: postLink },
      {
        $inc: {
          ...shareLinkSelectedCounter,
          ...shareLinkContendedCounter,
          ...(postLink && { shareLinkTotalStartQuest: 1 }),
        },
      }
    );

    // increment the result answers count
    // await getInfoQuestQuestion.updateOne({
    //   $inc: {
    //     totalStartQuest: 1,
    //     [`result.answer.${req.body.data.selected}`]: 1,
    //   },
    // });

    if (req.body.addedAnswer !== "") {
      // Increment 'addedAnswers' for the user
      await User.findOneAndUpdate(
        { uuid: req.body.uuid },
        { $inc: { addedAnswers: 1 } }
      );

      // Push the added answer to InfoQuestQuestions
      await InfoQuestQuestions.findByIdAndUpdate(
        { _id: req.body.questForeignKey },
        {
          $push: {
            QuestAnswers: {
              question: req.body.addedAnswer,
              selected: req.body.isAddedAnsSelected,
              uuid: req.body.addedAnswerUuid,
              _id: new mongoose.Types.ObjectId(),
            },
          },
        }
      );
      const txID2 = crypto.randomBytes(11).toString("hex");

      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "User",
        txFrom: req.body.questForeignKey,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.questForeignKey,
        // txDescription : "User adds an answer to a quest"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: req.body.uuid,
        txAmount: QUEST_OPTION_ADDED_AMOUNT,
        txData: req.body.questForeignKey,
        // txDescription : "Incentive for adding answer to quest"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: QUEST_OPTION_ADDED_AMOUNT, dec: true });
      // Increment the UserBalance
      await updateUserBalance({
        uuid: req.body.uuid,
        amount: QUEST_OPTION_ADDED_AMOUNT,
        inc: true,
      });
      const userEarned = await User.findOne({ uuid: req.body.uuid });
      userEarned.fdxEarned = userEarned.fdxEarned + QUEST_OPTION_ADDED_AMOUNT;
      userEarned.rewardSchedual.postParticipationFdx =
        userEarned.rewardSchedual.postParticipationFdx +
        QUEST_OPTION_ADDED_AMOUNT;
      await userEarned.save();
    }
    // Correct Answer or Wrong Answer
    const questionCorrectAnswer =
      getInfoQuestQuestion.QuestionCorrect.toLowerCase().trim();
    if (
      questionCorrectAnswer !== "no option" &&
      questionCorrectAnswer !== "not selected"
    ) {
      // For only multiple choice question
      if (questionCorrectAnswer === "selected") {
        const questionCorrectAnswerArray =
          getInfoQuestQuestion.QuestAnswersSelected.map((item) =>
            item?.answers.toLowerCase().trim()
          );
        const givenAnswersArray = req.body.data?.selected;
        const answersMatched = givenAnswersArray.every((item) =>
          questionCorrectAnswerArray.includes(
            item?.question.toLowerCase().trim()
          )
        );
        if (answersMatched) {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { correctedAnswers: 1 } }
          );
        } else {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { wrongedAnswers: 1 } }
          );
        }
      } else {
        // for Yes/No and Agree/Disagree
        const givenAnswer = req.body.data?.selected?.toLowerCase().trim();
        if (questionCorrectAnswer === givenAnswer) {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { correctedAnswers: 1 } }
          );
        } else {
          await User.findOneAndUpdate(
            { uuid: req.body.uuid },
            { $inc: { wrongedAnswers: 1 } }
          );
        }
      }
    }
    // Check if QuestionCorrect is not "Not Selected" and push the ID to completedQuests
    // if (data.QuestionCorrect !== "Not Selected") {
    await User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $addToSet: { completedQuests: getInfoQuestQuestion._id } }
    );

    const txID3 = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "postCompleted",
      txID: txID3,
      txAuth: "User",
      txFrom: req.body.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.questForeignKey,
      // txDescription : "User completes a quest"
    });
    // Create Ledger
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "postCompleted",
      txID: txID3,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: req.body.uuid,
      txAmount: QUEST_COMPLETED_AMOUNT,
      txData: req.body.questForeignKey,
      // txDescription : "Incentive for completing quests"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: QUEST_COMPLETED_AMOUNT, dec: true });
    // Increment the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: QUEST_COMPLETED_AMOUNT,
      inc: true,
    });

    const responsingUserEarnedFDX = await User.findOne({ uuid: req.body.uuid });
    responsingUserEarnedFDX.fdxEarned =
      responsingUserEarnedFDX.fdxEarned + QUEST_COMPLETED_AMOUNT;
    responsingUserEarnedFDX.rewardSchedual.myEngagementInPostFdx =
      responsingUserEarnedFDX.rewardSchedual.myEngagementInPostFdx +
      QUEST_COMPLETED_AMOUNT;
    await responsingUserEarnedFDX.save();

    // Create Ledger
    await createLedger({
      uuid: getInfoQuestQuestion.uuid,
      txUserAction: "postCompletedUser",
      txID: txID3,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: getInfoQuestQuestion.uuid,
      txAmount: QUEST_OWNER_ACCOUNT,
      txData: req.body.questForeignKey,
      // txDescription : "Incentive to Quest owner for completed quest"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: QUEST_OWNER_ACCOUNT, dec: true });
    // Increment the UserBalance
    await updateUserBalance({
      uuid: getInfoQuestQuestion.uuid,
      amount: QUEST_OWNER_ACCOUNT,
      inc: true,
    });
    const ownerEarnedFDX = await User.findOne({
      uuid: getInfoQuestQuestion.uuid,
    });
    ownerEarnedFDX.fdxEarned = ownerEarnedFDX.fdxEarned + QUEST_OWNER_ACCOUNT;
    ownerEarnedFDX.rewardSchedual.postParticipationFdx =
      ownerEarnedFDX.rewardSchedual.postParticipationFdx + QUEST_OWNER_ACCOUNT;
    await ownerEarnedFDX.save();

    const bookmarkExist = await BookmarkQuests.findOne({
      questForeignKey: getInfoQuestQuestion._id,
    });

    const infoQuest = await InfoQuestQuestions.find({
      _id: getInfoQuestQuestion._id,
    }).populate("getUserBadge", "badges");
    // getting the quest status
    const result = await getQuestionsWithStatus(infoQuest, req.body.uuid);
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, req.body.uuid);
    // getting the quest percentage
    const resultArray = result1.map(getPercentage);
    const selectedHasHighPercentage = hasHighPercentage(
      resultArray[0].selectedPercentage || []
    );
    const contendedHasHighPercentage = hasHighPercentage(
      resultArray[0].contendedPercentage || []
    );
    await InfoQuestQuestions.findOneAndUpdate(
      {
        _id: req.body.questForeignKey,
      },
      {
        selectedPercentage: resultArray[0].selectedPercentage,
        contendedPercentage: resultArray[0].contendedPercentage,
        isAboveThePercentage: selectedHasHighPercentage ? true : false,
      }
    );
    await QuestRagUpdate.findOneAndUpdate(
      {},
      {
        $addToSet: { dailyQuestsToEmbed: req.body.questForeignKey.toString() }, // Use $addToSet to ensure uniqueness
      },
      { new: true, upsert: true } // Return the updated document, create if it doesn't exist
    );
    let desiredArray = resultArray.map((item) => ({
      ...item._doc,
      userQuestSetting: item.userQuestSetting,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      bookmark: !!bookmarkExist,
    }));

    // desiredArray = await Promise.all(
    //   desiredArray.map(async (doc) => {
    //     const articles = await Article.find({ source: doc._id }).sort({
    //       createdAt: -1,
    //     });
    //     return { ...doc, articles }; // Attach the articles to the doc
    //   })
    // );

    if (
      req.body.articleRef &&
      req.body.articleRef.length > 8 &&
      mongoose.Types.ObjectId.isValid(req.body.articleRef)
    ) {
      await StartQuests.findOneAndUpdate(
        { _id: question._id },
        {
          articleRef: req.body.articleRef,
        },
        { new: true }
      ).exec();

      await Article.findOneAndUpdate(
        { _id: req.body.articleRef },
        {
          $addToSet: { submitEngagementsOfArticleSharedById: question._id },
        }
      ).exec();
    }

    if (req.body.articleRef && req.body.articleRef.length === 8) {
      await StartQuests.findOneAndUpdate(
        { _id: question._id },
        {
          articleRef: req.body.articleRef,
        },
        { new: true }
      ).exec();

      await ArticleSetting.findOneAndUpdate(
        { uniqueLink: req.body.articleRef },
        {
          $addToSet: {
            submitEngagementsOfArticleSharedByUniqueLink: question._id,
          },
        }
      ).exec();
    }

    const excludedPages = ["Feedback", "SharedLink", "Hidden", "Bookmark"];

    if (!excludedPages.includes(req.body.Page)) {
      desiredArray = await Promise.all(
        desiredArray.map(async (doc) => {
          const articles = await Article.find({ source: doc._id }).sort({
            createdAt: -1,
          });
          return { ...doc, articles }; // Attach the articles to the doc
        })
      );
    }
    // console.log("===============");
    return {
      message: "Start Quest Created Successfully",
      startQuestID: question._id,
      data: desiredArray[0],
    };
  } catch (err) {
    // console.error(err);
    res.status(500).json({
      message: `An error occurred while createStartQuest: ${err.message}`,
    });
  }
}

const updateChangeAnsStartQuest = async (req, res) => {
  try {
    const checkSuppression = await InfoQuestQuestions.findOne({
      _id: req.body.questId,
    });
    if (checkSuppression.suppressed) {
      if (checkSuppression.suppressed) {
        throw new Error(
          "Sorry, this content has been suppressed and is not available at the moment. Please try again later or contact support for further assistance."
        );
      }
    }
    const startQuestQuestion = await StartQuests.findOne({
      questForeignKey: req.body.questId,
      uuid: req.body.uuid,
    });
    const initialStartQuestData = [...startQuestQuestion.data];

    // Get the current date and time
    const currentDate = new Date();

    const getInfoQuestQuestion = await InfoQuestQuestions.findByIdAndUpdate(
      { _id: req.body.questId },
      {
        $set: { lastInteractedAt: currentDate.toISOString() },
        $inc: { interactingCounter: 1 },
        $inc: { changeCounter: 1 },
      }
    ).exec();

    User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $inc: { changedAnswers: 1 } }
    ).exec();

    // Check req.body.data and the last element's contended and selected arrays objects
    // const lastDataElement = req.body.changeAnswerAddedObj;
    // if (
    //   getInfoQuestQuestion.whichTypeQuestion === "open choice" &&
    //   getInfoQuestQuestion.whichTypeQuestion !== "ranked choise"
    // ) {
    //   const beforeAnsLength =
    //     startQuestQuestion.data[startQuestQuestion.data.length - 1].selected
    //       .length;
    //   const afterAnsLength = lastDataElement.selected.length;

    //   if (beforeAnsLength !== afterAnsLength) {
    //     const actualAnsLength = afterAnsLength - beforeAnsLength;

    //     await User.findOneAndUpdate(
    //       { uuid: getInfoQuestQuestion.uuid },
    //       {
    //         $inc: {
    //           selectionsOnAddedAns: actualAnsLength,
    //         },
    //       }
    //     );
    //   }
    // }

    //For Agreements recieved

    if (
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise"
    ) {
      //first time if user adds an option
      if (req.body.isAddedAnsSelected === true) {
        await User.findOneAndUpdate(
          { uuid: req.body.uuid },
          {
            $inc: {
              selectionsOnAddedAns: 1,
            },
          }
        );

        await StartQuests.findByIdAndUpdate(
          { _id: startQuestQuestion._id },
          {
            $set: {
              addedAnswer: req.body.addedAnswer,
            },
          }
        );
      } else {
        // Previous selected answers array
        let previousAnswers =
          startQuestQuestion?.data[startQuestQuestion.data.length - 1]
            ?.selected;

        // New selected answers array
        let newAnswers = req.body.changeAnswerAddedObj?.selected;

        // Find common elements
        const commonAnswers = previousAnswers?.filter((prevItem) =>
          newAnswers?.some((newItem) => newItem.question === prevItem.question)
        );

        // Remove common elements from both arrays
        previousAnswers = previousAnswers?.filter(
          (prevItem) =>
            !commonAnswers?.some(
              (commonItem) => commonItem.question === prevItem.question
            )
        );

        newAnswers = newAnswers?.filter(
          (newItem) =>
            !commonAnswers?.some(
              (commonItem) => commonItem.question === newItem.question
            )
        );

        previousAnswers?.map(async (item) => {
          const option = await InfoQuestQuestions.findOne(
            {
              _id: req.body.questId,
              "QuestAnswers.question": item.question,
            },
            {
              QuestAnswers: { $elemMatch: { question: item.question } },
            }
          );

          if (option?.QuestAnswers[0]?.uuid) {
            await User.findOneAndUpdate(
              { uuid: option.QuestAnswers[0].uuid },
              {
                $inc: {
                  selectionsOnAddedAns: -1,
                },
              }
            );
          }
        });

        newAnswers?.map(async (item) => {
          const option = await InfoQuestQuestions.findOne(
            {
              _id: req.body.questId,
              "QuestAnswers.question": item.question,
            },
            {
              QuestAnswers: { $elemMatch: { question: item.question } },
            }
          );
          if (option?.QuestAnswers[0]?.uuid) {
            await User.findOneAndUpdate(
              { uuid: option.QuestAnswers[0].uuid },
              {
                $inc: {
                  selectionsOnAddedAns: 1,
                },
              }
            );
          }
        });
      }
    }

    //For Contentions recieved`
    if (
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "ranked choise"
    ) {
      // Previous selected answers array
      let previousAnswers =
        startQuestQuestion?.data[startQuestQuestion.data.length - 1]?.contended;

      // New selected answers array
      let newAnswers = req.body.changeAnswerAddedObj?.contended || [];

      // Find common elements
      const commonAnswers = previousAnswers?.filter((prevItem) =>
        newAnswers?.some((newItem) => newItem.question === prevItem.question)
      );

      // Remove common elements from both arrays
      previousAnswers = previousAnswers?.filter(
        (prevItem) =>
          !commonAnswers?.some(
            (commonItem) => commonItem.question === prevItem.question
          )
      );

      newAnswers = newAnswers?.filter(
        (newItem) =>
          !commonAnswers?.some(
            (commonItem) => commonItem.question === newItem.question
          )
      );

      previousAnswers?.map(async (item) => {
        const option = await InfoQuestQuestions.findOne(
          {
            _id: req.body.questId,
            "QuestAnswers.question": item.question,
          },
          {
            QuestAnswers: { $elemMatch: { question: item.question } },
          }
        );

        if (option?.QuestAnswers[0]?.uuid) {
          await User.findOneAndUpdate(
            { uuid: option.QuestAnswers[0].uuid },
            {
              $inc: {
                contentionsOnAddedAns: -1,
              },
            }
          );
        }
      });

      newAnswers?.map(async (item) => {
        const option = await InfoQuestQuestions.findOne(
          {
            _id: req.body.questId,
            "QuestAnswers.question": item.question,
          },
          {
            QuestAnswers: { $elemMatch: { question: item.question } },
          }
        );

        if (option?.QuestAnswers[0]?.uuid) {
          await User.findOneAndUpdate(
            { uuid: option.QuestAnswers[0].uuid },
            {
              $inc: {
                contentionsOnAddedAns: 1,
              },
            }
          );
        }
      });
    }

    // INCREMENT
    // Function to process an array
    // const incrementProcessArray = async (array, fieldToUpdate) => {
    //   if (array && Array.isArray(array)) {
    //     for (const item of array) {
    //       // Check if item.question matches addedAnswer in StartQuests
    //       const matchingStartQuest = await StartQuests.findOne({
    //         addedAnswer: item.question,
    //       });

    //       if (matchingStartQuest) {
    //         // Get the uuid of the matching record
    //         const matchingUuid = matchingStartQuest.uuid;

    //         // Define the field to update based on the provided fieldToUpdate parameter
    //         const updateField = {};
    //         updateField[fieldToUpdate] = 1;

    //         // Increment the specified field in the User table
    //         await User.findOneAndUpdate(
    //           { uuid: matchingUuid },
    //           { $inc: updateField }
    //         );
    //       }
    //     }
    //   }
    // };

    // Process both 'contended' and 'selected' arrays for increment
    // await Promise.all([
    //   incrementProcessArray(lastDataElement.contended, "contentionsOnAddedAns"),
    //   incrementProcessArray(lastDataElement.selected, "selectionsOnAddedAns"),
    // ]);

    // DECREMENT
    // Function to process an array
    // const decrementProcessArray = async (array, field, fieldToUpdate) => {
    //   if (array && Array.isArray(array)) {
    //     for (const item of array) {
    //       const isMatch = lastDataElement[field].some(
    //         (contendedItem) => contendedItem.question === item.question
    //       );
    //       if (!isMatch) {
    //         // Check if item.question matches addedAnswer in StartQuests
    //         const matchingStartQuest = await StartQuests.findOne({
    //           addedAnswer: item.question,
    //         });
    //         if (matchingStartQuest) {
    //           // Get the uuid of the matching record
    //           const matchingUuid = matchingStartQuest.uuid;

    //           // Define the field to update based on the provided fieldToUpdate parameter
    //           const updateField = {};
    //           updateField[fieldToUpdate] = -1;

    //           // Increment the specified field in the User table
    //           await User.findOneAndUpdate(
    //             { uuid: matchingUuid },
    //             { $inc: updateField }
    //           );
    //         }
    //       }
    //     }
    //   }
    // };

    // // DECREMENT
    // if (startQuestQuestion?.data.length > 1) {
    //   let lstTimeSelectionsAndContentions =
    //     startQuestQuestion?.data[startQuestQuestion?.data.length - 1];

    //   // Process both 'contended' and 'selected' arrays for decrement
    //   await Promise.all([
    //     decrementProcessArray(
    //       lstTimeSelectionsAndContentions.contended,
    //       "contended",
    //       "contentionsOnAddedAns"
    //     ),
    //     decrementProcessArray(
    //       lstTimeSelectionsAndContentions.selected,
    //       "selected",
    //       "selectionsOnAddedAns"
    //     ),
    //   ]);
    // }

    // Increment 'contentionsGiven' based on the length of 'contended' array
    const contendedArray = req.body.changeAnswerAddedObj?.contended || [];
    const contentionsGivenIncrement =
      startQuestQuestion?.data[startQuestQuestion?.data.length - 1][
        "contended"
      ] && contendedArray.length === 0
        ? -1
        : contendedArray.length;
    // requested contention - saved contention
    const requestedContention = contendedArray.length;
    // const savedContention = startQuestQuestion?.data[startQuestQuestion?.data.length-1]['contended'].length;
    const savedContention =
      startQuestQuestion?.data?.[startQuestQuestion?.data.length - 1]?.contended
        ?.length ?? 0;
    let contentionGivenCounter = requestedContention - savedContention;

    //check if ledger already exists

    // Increment Counter
    if (contentionGivenCounter > 0) {
      const userBalance = await getUserBalance(req.body.uuid);
      if (
        userBalance <
        QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter
      )
        throw new Error("The balance is insufficient to give the contention!");

      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "User",
        txFrom: req.body.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.uuid,
        // txDescription : "User gives contention to a quest answer"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "DAO",
        txFrom: req.body.uuid,
        txTo: "DAO Treasury",
        txAmount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter,
        // txData : req.body.uuid,
        // txDescription : "DisInsentive for giving contention"
      });
      // increment the Treasury
      await updateTreasury({
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter,
        inc: true,
      });
      // Decrement the User Balance
      await updateUserBalance({
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter,
        dec: true,
        uuid: req.body.uuid,
      });
      const userSpent = await User.findOne({ uuid: req.body.uuid });
      userSpent.fdxSpent =
        userSpent.fdxSpent +
        QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter;
      await userSpent.save();
    } else if (contentionGivenCounter < 0) {
      const txID2 = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionRemoved",
        txID: txID2,
        txAuth: "User",
        txFrom: req.body.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.uuid,
        // txDescription : "User gives contention to a quest answer"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionRemoved",
        txID: txID2,
        txAuth: "DAO",
        txFrom: req.body.uuid,
        txTo: "DAO Treasury",
        txAmount:
          QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
          Math.abs(contentionGivenCounter),
        // txData : req.body.uuid,
        // txDescription : "DisInsentive for giving contention"
      });
      // increment the Treasury
      await updateTreasury({
        amount:
          QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
          Math.abs(contentionGivenCounter),
        dec: true,
      });
      // Decrement the User Balance
      await updateUserBalance({
        amount:
          QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
          Math.abs(contentionGivenCounter),
        inc: true,
        uuid: req.body.uuid,
      });
      const userSpent = await User.findOne({ uuid: req.body.uuid });
      userSpent.fdxSpent =
        userSpent.fdxSpent +
        QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
        Math.abs(contentionGivenCounter);
      await userSpent.save();
    }

    await User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $inc: { contentionsGiven: contentionGivenCounter } }
    );

    if (req.body.addedAnswer !== "") {
      const txID2 = crypto.randomBytes(11).toString("hex");

      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "User",
        txFrom: req.body.questForeignKey,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.questForeignKey,
        // txDescription : "User adds an answer to a quest"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: req.body.uuid,
        txAmount: QUEST_OPTION_ADDED_AMOUNT,
        txData: req.body.questForeignKey,
        // txDescription : "Incentive for adding answer to quest"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: QUEST_OPTION_ADDED_AMOUNT, dec: true });
      // Increment the UserBalance
      await updateUserBalance({
        uuid: req.body.uuid,
        amount: QUEST_OPTION_ADDED_AMOUNT,
        inc: true,
      });
      const userEarned = await User.findOne({ uuid: req.body.uuid });
      userEarned.fdxEarned = userEarned.fdxEarned + QUEST_OPTION_ADDED_AMOUNT;
      userEarned.rewardSchedual.postParticipationFdx =
        userEarned.rewardSchedual.postParticipationFdx +
        QUEST_OPTION_ADDED_AMOUNT;
      await userEarned.save();
    }

    let startQuestAnswersSelected = startQuestQuestion?.data;
    let responseMsg = "";

    let timeWhenUserUpdated = new Date(
      startQuestQuestion?.data[startQuestQuestion?.data.length - 1].created
    );

    let date1 = new Date();
    let date2 = date1.getTime();

    let dateFinal = date2 - timeWhenUserUpdated.getTime();

    if (dateFinal > 2) {
      if (
        Compare(
          startQuestQuestion?.data[startQuestQuestion?.data?.length - 1],
          req.body.changeAnswerAddedObj
        )
      ) {
        let AnswerAddedOrNot = startQuestQuestion.addedAnswerByUser;

        if (typeof req.body.changeAnswerAddedObj.selected !== "string") {
          req.body.changeAnswerAddedObj.selected.map(async (option) => {
            if (option.addedAnswerByUser === true) {
              await User.findOneAndUpdate(
                { uuid: req.body.uuid },
                { $inc: { addedAnswers: 1 } }
              );
              AnswerAddedOrNot = option.question;
              const addAnswer = {
                question: option.question,
                selected: req.body.isAddedAnsSelected,
                uuid: req.body.addedAnswerUuid,
                _id: new mongoose.Types.ObjectId(),
              };
              InfoQuestQuestions.findByIdAndUpdate(
                { _id: req.body.questId },
                { $push: { QuestAnswers: addAnswer } }
              ).exec();
            }
          });
        }

        responseMsg = "Start Quest Updated Successfully";
        if (req.body.isAddedAnsSelected === false) {
          req.body.changeAnswerAddedObj.selected =
            req.body.changeAnswerAddedObj.selected.filter(
              (entry) => !entry.addedAnswerByUser
            );
        }
        startQuestAnswersSelected.push(req.body.changeAnswerAddedObj);

        // decrement the selected and contended count
        let selectedCounter = {};
        let contendedCounter = {};
        if (
          getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
          getInfoQuestQuestion.whichTypeQuestion === "open choice"
        ) {
          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.selected?.forEach((item) => {
            selectedCounter[`result.selected.${item.question}`] = -1;
          });
          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = -1;
          });
        } else if (getInfoQuestQuestion.whichTypeQuestion === "ranked choise") {
          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.selected?.forEach((item, index) => {
            const count =
              initialStartQuestData[initialStartQuestData.length - 1]?.selected
                .length -
              index -
              1;
            selectedCounter[`result.selected.${item.question}`] = -count;
          });

          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = -1;
          });
        } else {
          selectedCounter[
            `result.selected.${initialStartQuestData[initialStartQuestData.length - 1]?.selected
            }`
          ] = -1;
        }
        // //// console.log(
        //   "🚀 ~ updateChangeAnsStartQuest ~ initialStartQuestData:",
        //   initialStartQuestData[0].selected
        // );
        // //// console.log(
        //   "🚀 ~ updateChangeAnsStartQuest ~ selectedCounter:",
        //   selectedCounter
        // );
        await InfoQuestQuestions.findByIdAndUpdate(
          { _id: req.body.questId },
          {
            $inc: {
              // totalStartQuest: 1,
              ...selectedCounter,
              ...contendedCounter,
            },
          }
        );

        await StartQuests.findByIdAndUpdate(
          { _id: startQuestQuestion._id },
          { data: startQuestAnswersSelected, addedAnswer: AnswerAddedOrNot },
          { upsert: true }
        ).exec();

        // increment the selected and contended count
        selectedCounter = {};
        contendedCounter = {};
        if (
          getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
          getInfoQuestQuestion.whichTypeQuestion === "open choice"
        ) {
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.selected?.forEach((item) => {
            selectedCounter[`result.selected.${item.question}`] = 1;
          });
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = 1;
          });
        } else if (getInfoQuestQuestion.whichTypeQuestion === "ranked choise") {
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.selected?.forEach((item, index) => {
            const count =
              startQuestQuestion.data[startQuestQuestion.data.length - 1]
                ?.selected.length -
              index -
              1;
            selectedCounter[`result.selected.${item.question}`] = count;
          });
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = 1;
          });
        } else {
          selectedCounter[
            `result.selected.${startQuestQuestion.data[startQuestQuestion.data.length - 1]
              ?.selected
            }`
          ] = 1;
        }
        await InfoQuestQuestions.findByIdAndUpdate(
          { _id: req.body.questId },
          {
            $inc: {
              // totalStartQuest: 1,
              ...selectedCounter,
              ...contendedCounter,
            },
          }
        );

        const txID3 = crypto.randomBytes(11).toString("hex");
        // Create Ledger
        await createLedger({
          uuid: req.body.uuid,
          txUserAction: "postCompletedChange",
          txID: txID3,
          txAuth: "User",
          txFrom: req.body.uuid,
          txTo: "dao",
          txAmount: "0",
          txData: startQuestQuestion._id,
          // txDescription : "User changes their answer on a quest"
        });
        // // Create Ledger
        // await createLedger({
        //   uuid: req.body.uuid,
        //   txUserAction: "postCompletedChange",
        //   txID: commonTxId,
        //   txAuth: "DAO",
        //   txFrom: "DAO Treasury",
        //   txTo: req.body.uuid,
        //   txAmount: QUEST_COMPLETED_CHANGE_AMOUNT,
        //   // txData : startQuestQuestion._id,
        //   // txDescription : "Incentive for changing a quest answer"
        // });
        // // Decrement the Treasury
        // await updateTreasury({
        //   amount: QUEST_COMPLETED_CHANGE_AMOUNT,
        //   dec: true,
        // });
        // // Increment the UserBalance
        // await updateUserBalance({
        //   uuid: req.body.uuid,
        //   amount: QUEST_COMPLETED_CHANGE_AMOUNT,
        //   inc: true,
        // });
      } else {
        responseMsg = "Answer has not changed";
        User.findOneAndUpdate(
          { uuid: req.body.uuid },
          { $inc: { changedAnswers: -1 } }
        ).exec();
      }
    } else {
      responseMsg = "You can change your answer once every 1 hour";
    }
    const bookmarkExist = await BookmarkQuests.findOne({
      questForeignKey: getInfoQuestQuestion._id,
    });
    const infoQuest = await InfoQuestQuestions.find({
      _id: req.body.questId,
    }).populate("getUserBadge", "badges");
    // getting the quest status
    const result = await getQuestionsWithStatus(infoQuest, req.body.uuid);
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, req.body.uuid);
    // getting the quest percentage
    const resultArray = result1.map(getPercentage);
    const selectedHasHighPercentage = hasHighPercentage(
      resultArray[0].selectedPercentage || []
    );
    const contendedHasHighPercentage = hasHighPercentage(
      resultArray[0].contendedPercentage || []
    );
    await InfoQuestQuestions.findOneAndUpdate(
      {
        _id: req.body.questId,
      },
      {
        selectedPercentage: resultArray[0].selectedPercentage,
        contendedPercentage: resultArray[0].contendedPercentage,
        isAboveThePercentage: selectedHasHighPercentage ? true : false,
      }
    );
    await QuestRagUpdate.findOneAndUpdate(
      {},
      {
        $addToSet: { dailyQuestsToEmbed: req.body.questId.toString() }, // Use $addToSet to ensure uniqueness
      },
      { new: true, upsert: true } // Return the updated document, create if it doesn't exist
    );
    let desiredArray = resultArray.map((item) => ({
      ...item._doc,
      userQuestSetting: item.userQuestSetting,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      bookmark: !!bookmarkExist,
    }));

    // desiredArray = await Promise.all(
    //   desiredArray.map(async (doc) => {
    //     const articles = await Article.find({ source: doc._id }).sort({
    //       createdAt: -1,
    //     });
    //     return { ...doc, articles }; // Attach the articles to the doc
    //   })
    // );

    const excludedPages = ["Feedback", "SharedLink", "Hidden", "Bookmark"];

    if (!excludedPages.includes(req.body.Page)) {
      desiredArray = await Promise.all(
        desiredArray.map(async (doc) => {
          const articles = await Article.find({ source: doc._id }).sort({
            createdAt: -1,
          });
          return { ...doc, articles }; // Attach the articles to the doc
        })
      );
    }

    res.status(200).json({
      message: responseMsg,
      startQuestID: startQuestQuestion._id,
      data: desiredArray[0],
    });
  } catch (err) {
    // console.error(err);
    res.status(500).json({
      message: `An error occurred while updateChangeAnsStartQuest: ${err.message}`,
    });
  }

  function Compare(obj1, obj2) {
    const clonedObj1 = { ...obj1 };
    const clonedObj2 = { ...obj2 };

    delete clonedObj1.created;
    delete clonedObj2.created;

    const stringifiedObj1 = JSON.stringify(clonedObj1);
    const stringifiedObj2 = JSON.stringify(clonedObj2);

    if (stringifiedObj1 === stringifiedObj2) {
      return false;
    } else {
      return true;
    }
  }
};

const updateChangeAnsStartQuestUserList = async (req) => {
  try {
    // console.log(req);
    const checkSuppression = await InfoQuestQuestions.findOne({
      _id: req.body.questId,
    });
    if (checkSuppression.suppressed) {
      if (checkSuppression.suppressed) {
        throw new Error(
          "Sorry, this content has been suppressed and is not available at the moment. Please try again later or contact support for further assistance."
        );
      }
    }
    const startQuestQuestion = await StartQuests.findOne({
      questForeignKey: req.body.questId,
      uuid: req.body.uuid,
    });
    const initialStartQuestData = [...startQuestQuestion.data];

    // Get the current date and time
    const currentDate = new Date();

    const getInfoQuestQuestion = await InfoQuestQuestions.findByIdAndUpdate(
      { _id: req.body.questId },
      {
        $set: { lastInteractedAt: currentDate.toISOString() },
        $inc: { interactingCounter: 1 },
        $inc: { changeCounter: 1 },
      }
    ).exec();

    User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $inc: { changedAnswers: 1 } }
    ).exec();

    // Check req.body.data and the last element's contended and selected arrays objects
    // const lastDataElement = req.body.changeAnswerAddedObj;
    // if (
    //   getInfoQuestQuestion.whichTypeQuestion === "open choice" &&
    //   getInfoQuestQuestion.whichTypeQuestion !== "ranked choise"
    // ) {
    //   const beforeAnsLength =
    //     startQuestQuestion.data[startQuestQuestion.data.length - 1].selected
    //       .length;
    //   const afterAnsLength = lastDataElement.selected.length;

    //   if (beforeAnsLength !== afterAnsLength) {
    //     const actualAnsLength = afterAnsLength - beforeAnsLength;

    //     await User.findOneAndUpdate(
    //       { uuid: getInfoQuestQuestion.uuid },
    //       {
    //         $inc: {
    //           selectionsOnAddedAns: actualAnsLength,
    //         },
    //       }
    //     );
    //   }
    // }

    //For Agreements recieved

    if (
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise"
    ) {
      //first time if user adds an option
      if (req.body.isAddedAnsSelected === true) {
        await User.findOneAndUpdate(
          { uuid: req.body.uuid },
          {
            $inc: {
              selectionsOnAddedAns: 1,
            },
          }
        );

        await StartQuests.findByIdAndUpdate(
          { _id: startQuestQuestion._id },
          {
            $set: {
              addedAnswer: req.body.addedAnswer,
            },
          }
        );
      } else {
        // Previous selected answers array
        let previousAnswers =
          startQuestQuestion?.data[startQuestQuestion.data.length - 1]
            ?.selected;

        // New selected answers array
        let newAnswers = req.body.changeAnswerAddedObj?.selected;

        // Find common elements
        const commonAnswers = previousAnswers?.filter((prevItem) =>
          newAnswers?.some((newItem) => newItem.question === prevItem.question)
        );

        // Remove common elements from both arrays
        previousAnswers = previousAnswers?.filter(
          (prevItem) =>
            !commonAnswers?.some(
              (commonItem) => commonItem.question === prevItem.question
            )
        );

        newAnswers = newAnswers?.filter(
          (newItem) =>
            !commonAnswers?.some(
              (commonItem) => commonItem.question === newItem.question
            )
        );

        previousAnswers?.map(async (item) => {
          const option = await InfoQuestQuestions.findOne(
            {
              _id: req.body.questId,
              "QuestAnswers.question": item.question,
            },
            {
              QuestAnswers: { $elemMatch: { question: item.question } },
            }
          );

          if (option?.QuestAnswers[0]?.uuid) {
            await User.findOneAndUpdate(
              { uuid: option.QuestAnswers[0].uuid },
              {
                $inc: {
                  selectionsOnAddedAns: -1,
                },
              }
            );
          }
        });

        newAnswers?.map(async (item) => {
          const option = await InfoQuestQuestions.findOne(
            {
              _id: req.body.questId,
              "QuestAnswers.question": item.question,
            },
            {
              QuestAnswers: { $elemMatch: { question: item.question } },
            }
          );
          if (option?.QuestAnswers[0]?.uuid) {
            await User.findOneAndUpdate(
              { uuid: option.QuestAnswers[0].uuid },
              {
                $inc: {
                  selectionsOnAddedAns: 1,
                },
              }
            );
          }
        });
      }
    }

    //For Contentions recieved`
    if (
      getInfoQuestQuestion.whichTypeQuestion === "open choice" ||
      getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
      getInfoQuestQuestion.whichTypeQuestion === "ranked choise"
    ) {
      // Previous selected answers array
      let previousAnswers =
        startQuestQuestion?.data[startQuestQuestion.data.length - 1]?.contended;

      // New selected answers array
      let newAnswers = req.body.changeAnswerAddedObj?.contended || [];

      // Find common elements
      const commonAnswers = previousAnswers?.filter((prevItem) =>
        newAnswers?.some((newItem) => newItem.question === prevItem.question)
      );

      // Remove common elements from both arrays
      previousAnswers = previousAnswers?.filter(
        (prevItem) =>
          !commonAnswers?.some(
            (commonItem) => commonItem.question === prevItem.question
          )
      );

      newAnswers = newAnswers?.filter(
        (newItem) =>
          !commonAnswers?.some(
            (commonItem) => commonItem.question === newItem.question
          )
      );

      previousAnswers?.map(async (item) => {
        const option = await InfoQuestQuestions.findOne(
          {
            _id: req.body.questId,
            "QuestAnswers.question": item.question,
          },
          {
            QuestAnswers: { $elemMatch: { question: item.question } },
          }
        );

        if (option?.QuestAnswers[0]?.uuid) {
          await User.findOneAndUpdate(
            { uuid: option.QuestAnswers[0].uuid },
            {
              $inc: {
                contentionsOnAddedAns: -1,
              },
            }
          );
        }
      });

      newAnswers?.map(async (item) => {
        const option = await InfoQuestQuestions.findOne(
          {
            _id: req.body.questId,
            "QuestAnswers.question": item.question,
          },
          {
            QuestAnswers: { $elemMatch: { question: item.question } },
          }
        );

        if (option?.QuestAnswers[0]?.uuid) {
          await User.findOneAndUpdate(
            { uuid: option.QuestAnswers[0].uuid },
            {
              $inc: {
                contentionsOnAddedAns: 1,
              },
            }
          );
        }
      });
    }

    // INCREMENT
    // Function to process an array
    // const incrementProcessArray = async (array, fieldToUpdate) => {
    //   if (array && Array.isArray(array)) {
    //     for (const item of array) {
    //       // Check if item.question matches addedAnswer in StartQuests
    //       const matchingStartQuest = await StartQuests.findOne({
    //         addedAnswer: item.question,
    //       });

    //       if (matchingStartQuest) {
    //         // Get the uuid of the matching record
    //         const matchingUuid = matchingStartQuest.uuid;

    //         // Define the field to update based on the provided fieldToUpdate parameter
    //         const updateField = {};
    //         updateField[fieldToUpdate] = 1;

    //         // Increment the specified field in the User table
    //         await User.findOneAndUpdate(
    //           { uuid: matchingUuid },
    //           { $inc: updateField }
    //         );
    //       }
    //     }
    //   }
    // };

    // Process both 'contended' and 'selected' arrays for increment
    // await Promise.all([
    //   incrementProcessArray(lastDataElement.contended, "contentionsOnAddedAns"),
    //   incrementProcessArray(lastDataElement.selected, "selectionsOnAddedAns"),
    // ]);

    // DECREMENT
    // Function to process an array
    // const decrementProcessArray = async (array, field, fieldToUpdate) => {
    //   if (array && Array.isArray(array)) {
    //     for (const item of array) {
    //       const isMatch = lastDataElement[field].some(
    //         (contendedItem) => contendedItem.question === item.question
    //       );
    //       if (!isMatch) {
    //         // Check if item.question matches addedAnswer in StartQuests
    //         const matchingStartQuest = await StartQuests.findOne({
    //           addedAnswer: item.question,
    //         });
    //         if (matchingStartQuest) {
    //           // Get the uuid of the matching record
    //           const matchingUuid = matchingStartQuest.uuid;

    //           // Define the field to update based on the provided fieldToUpdate parameter
    //           const updateField = {};
    //           updateField[fieldToUpdate] = -1;

    //           // Increment the specified field in the User table
    //           await User.findOneAndUpdate(
    //             { uuid: matchingUuid },
    //             { $inc: updateField }
    //           );
    //         }
    //       }
    //     }
    //   }
    // };

    // // DECREMENT
    // if (startQuestQuestion?.data.length > 1) {
    //   let lstTimeSelectionsAndContentions =
    //     startQuestQuestion?.data[startQuestQuestion?.data.length - 1];

    //   // Process both 'contended' and 'selected' arrays for decrement
    //   await Promise.all([
    //     decrementProcessArray(
    //       lstTimeSelectionsAndContentions.contended,
    //       "contended",
    //       "contentionsOnAddedAns"
    //     ),
    //     decrementProcessArray(
    //       lstTimeSelectionsAndContentions.selected,
    //       "selected",
    //       "selectionsOnAddedAns"
    //     ),
    //   ]);
    // }

    // Increment 'contentionsGiven' based on the length of 'contended' array
    const contendedArray = req.body.changeAnswerAddedObj?.contended || [];
    const contentionsGivenIncrement =
      startQuestQuestion?.data[startQuestQuestion?.data.length - 1][
        "contended"
      ] && contendedArray.length === 0
        ? -1
        : contendedArray.length;
    // requested contention - saved contention
    const requestedContention = contendedArray.length;
    // const savedContention = startQuestQuestion?.data[startQuestQuestion?.data.length-1]['contended'].length;
    const savedContention =
      startQuestQuestion?.data?.[startQuestQuestion?.data.length - 1]?.contended
        ?.length ?? 0;
    let contentionGivenCounter = requestedContention - savedContention;

    //check if ledger already exists

    // Increment Counter
    if (contentionGivenCounter > 0) {
      const userBalance = await getUserBalance(req.body.uuid);
      if (
        userBalance <
        QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter
      )
        throw new Error("The balance is insufficient to give the contention!");

      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "User",
        txFrom: req.body.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.uuid,
        // txDescription : "User gives contention to a quest answer"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionGiven",
        txID: txID,
        txAuth: "DAO",
        txFrom: req.body.uuid,
        txTo: "DAO Treasury",
        txAmount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter,
        // txData : req.body.uuid,
        // txDescription : "DisInsentive for giving contention"
      });
      // increment the Treasury
      await updateTreasury({
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter,
        inc: true,
      });
      // Decrement the User Balance
      await updateUserBalance({
        amount: QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter,
        dec: true,
        uuid: req.body.uuid,
      });
      const userSpent = await User.findOne({ uuid: req.body.uuid });
      userSpent.fdxSpent =
        userSpent.fdxSpent +
        QUEST_OPTION_CONTENTION_GIVEN_AMOUNT * contentionGivenCounter;
      await userSpent.save();
    } else if (contentionGivenCounter < 0) {
      const txID2 = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionRemoved",
        txID: txID2,
        txAuth: "User",
        txFrom: req.body.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.uuid,
        // txDescription : "User gives contention to a quest answer"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionContentionRemoved",
        txID: txID2,
        txAuth: "DAO",
        txFrom: req.body.uuid,
        txTo: "DAO Treasury",
        txAmount:
          QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
          Math.abs(contentionGivenCounter),
        // txData : req.body.uuid,
        // txDescription : "DisInsentive for giving contention"
      });
      // increment the Treasury
      await updateTreasury({
        amount:
          QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
          Math.abs(contentionGivenCounter),
        dec: true,
      });
      // Decrement the User Balance
      await updateUserBalance({
        amount:
          QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
          Math.abs(contentionGivenCounter),
        inc: true,
        uuid: req.body.uuid,
      });
      const userSpent = await User.findOne({ uuid: req.body.uuid });
      userSpent.fdxSpent =
        userSpent.fdxSpent +
        QUEST_OPTION_CONTENTION_REMOVED_AMOUNT *
        Math.abs(contentionGivenCounter);
      await userSpent.save();
    }

    await User.findOneAndUpdate(
      { uuid: req.body.uuid },
      { $inc: { contentionsGiven: contentionGivenCounter } }
    );

    if (req.body.addedAnswer !== "") {
      const txID2 = crypto.randomBytes(11).toString("hex");

      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "User",
        txFrom: req.body.questForeignKey,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.questForeignKey,
        // txDescription : "User adds an answer to a quest"
      });
      // Create Ledger
      await createLedger({
        uuid: req.body.uuid,
        txUserAction: "postOptionAdded",
        txID: txID2,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: req.body.uuid,
        txAmount: QUEST_OPTION_ADDED_AMOUNT,
        txData: req.body.questForeignKey,
        // txDescription : "Incentive for adding answer to quest"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: QUEST_OPTION_ADDED_AMOUNT, dec: true });
      // Increment the UserBalance
      await updateUserBalance({
        uuid: req.body.uuid,
        amount: QUEST_OPTION_ADDED_AMOUNT,
        inc: true,
      });
      const userEarned = await User.findOne({ uuid: req.body.uuid });
      userEarned.fdxEarned = userEarned.fdxEarned + QUEST_OPTION_ADDED_AMOUNT;
      userEarned.rewardSchedual.postParticipationFdx =
        userEarned.rewardSchedual.postParticipationFdx +
        QUEST_OPTION_ADDED_AMOUNT;
      await userEarned.save();
    }

    let startQuestAnswersSelected = startQuestQuestion?.data;
    let responseMsg = "";

    let timeWhenUserUpdated = new Date(
      startQuestQuestion?.data[startQuestQuestion?.data.length - 1].created
    );

    let date1 = new Date();
    let date2 = date1.getTime();

    let dateFinal = date2 - timeWhenUserUpdated.getTime();

    if (dateFinal > 2) {
      if (
        Compare(
          startQuestQuestion?.data[startQuestQuestion?.data?.length - 1],
          req.body.changeAnswerAddedObj
        )
      ) {
        let AnswerAddedOrNot = startQuestQuestion.addedAnswerByUser;

        if (typeof req.body.changeAnswerAddedObj.selected !== "string") {
          req.body.changeAnswerAddedObj.selected.map(async (option) => {
            if (option.addedAnswerByUser === true) {
              await User.findOneAndUpdate(
                { uuid: req.body.uuid },
                { $inc: { addedAnswers: 1 } }
              );
              AnswerAddedOrNot = option.question;
              const addAnswer = {
                question: option.question,
                selected: req.body.isAddedAnsSelected,
                uuid: req.body.addedAnswerUuid,
                _id: new mongoose.Types.ObjectId(),
              };
              InfoQuestQuestions.findByIdAndUpdate(
                { _id: req.body.questId },
                { $push: { QuestAnswers: addAnswer } }
              ).exec();
            }
          });
        }

        responseMsg = "Start Quest Updated Successfully";
        if (req.body.isAddedAnsSelected === false) {
          req.body.changeAnswerAddedObj.selected =
            req.body.changeAnswerAddedObj.selected.filter(
              (entry) => !entry.addedAnswerByUser
            );
        }
        startQuestAnswersSelected.push(req.body.changeAnswerAddedObj);

        // decrement the selected and contended count
        let selectedCounter = {};
        let contendedCounter = {};
        if (
          getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
          getInfoQuestQuestion.whichTypeQuestion === "open choice"
        ) {
          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.selected?.forEach((item) => {
            selectedCounter[`result.selected.${item.question}`] = -1;
          });
          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = -1;
          });
        } else if (getInfoQuestQuestion.whichTypeQuestion === "ranked choise") {
          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.selected?.forEach((item, index) => {
            const count =
              initialStartQuestData[initialStartQuestData.length - 1]?.selected
                .length -
              index -
              1;
            selectedCounter[`result.selected.${item.question}`] = -count;
          });

          initialStartQuestData[
            initialStartQuestData.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = -1;
          });
        } else {
          selectedCounter[
            `result.selected.${initialStartQuestData[initialStartQuestData.length - 1]?.selected
            }`
          ] = -1;
        }
        // //// console.log(
        //   "🚀 ~ updateChangeAnsStartQuest ~ initialStartQuestData:",
        //   initialStartQuestData[0].selected
        // );
        // //// console.log(
        //   "🚀 ~ updateChangeAnsStartQuest ~ selectedCounter:",
        //   selectedCounter
        // );
        await InfoQuestQuestions.findByIdAndUpdate(
          { _id: req.body.questId },
          {
            $inc: {
              // totalStartQuest: 1,
              ...selectedCounter,
              ...contendedCounter,
            },
          }
        );

        await StartQuests.findByIdAndUpdate(
          { _id: startQuestQuestion._id },
          { data: startQuestAnswersSelected, addedAnswer: AnswerAddedOrNot },
          { upsert: true }
        ).exec();

        // increment the selected and contended count
        selectedCounter = {};
        contendedCounter = {};
        if (
          getInfoQuestQuestion.whichTypeQuestion === "multiple choise" ||
          getInfoQuestQuestion.whichTypeQuestion === "open choice"
        ) {
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.selected?.forEach((item) => {
            selectedCounter[`result.selected.${item.question}`] = 1;
          });
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = 1;
          });
        } else if (getInfoQuestQuestion.whichTypeQuestion === "ranked choise") {
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.selected?.forEach((item, index) => {
            const count =
              startQuestQuestion.data[startQuestQuestion.data.length - 1]
                ?.selected.length -
              index -
              1;
            selectedCounter[`result.selected.${item.question}`] = count;
          });
          startQuestQuestion.data[
            startQuestQuestion.data.length - 1
          ]?.contended?.forEach((item) => {
            contendedCounter[`result.contended.${item.question}`] = 1;
          });
        } else {
          selectedCounter[
            `result.selected.${startQuestQuestion.data[startQuestQuestion.data.length - 1]
              ?.selected
            }`
          ] = 1;
        }
        await InfoQuestQuestions.findByIdAndUpdate(
          { _id: req.body.questId },
          {
            $inc: {
              // totalStartQuest: 1,
              ...selectedCounter,
              ...contendedCounter,
            },
          }
        );

        const txID3 = crypto.randomBytes(11).toString("hex");
        // Create Ledger
        await createLedger({
          uuid: req.body.uuid,
          txUserAction: "postCompletedChange",
          txID: txID3,
          txAuth: "User",
          txFrom: req.body.uuid,
          txTo: "dao",
          txAmount: "0",
          txData: startQuestQuestion._id,
          // txDescription : "User changes their answer on a quest"
        });
        // // Create Ledger
        // await createLedger({
        //   uuid: req.body.uuid,
        //   txUserAction: "postCompletedChange",
        //   txID: commonTxId,
        //   txAuth: "DAO",
        //   txFrom: "DAO Treasury",
        //   txTo: req.body.uuid,
        //   txAmount: QUEST_COMPLETED_CHANGE_AMOUNT,
        //   // txData : startQuestQuestion._id,
        //   // txDescription : "Incentive for changing a quest answer"
        // });
        // // Decrement the Treasury
        // await updateTreasury({
        //   amount: QUEST_COMPLETED_CHANGE_AMOUNT,
        //   dec: true,
        // });
        // // Increment the UserBalance
        // await updateUserBalance({
        //   uuid: req.body.uuid,
        //   amount: QUEST_COMPLETED_CHANGE_AMOUNT,
        //   inc: true,
        // });
      } else {
        responseMsg = "Answer has not changed";
        User.findOneAndUpdate(
          { uuid: req.body.uuid },
          { $inc: { changedAnswers: -1 } }
        ).exec();
      }
    } else {
      responseMsg = "You can change your answer once every 1 hour";
    }
    const bookmarkExist = await BookmarkQuests.findOne({
      questForeignKey: getInfoQuestQuestion._id,
    });
    const infoQuest = await InfoQuestQuestions.find({
      _id: req.body.questId,
    }).populate("getUserBadge", "badges");
    // getting the quest status
    const result = await getQuestionsWithStatus(infoQuest, req.body.uuid);
    // getQuestionsWithUserSettings
    const result1 = await getQuestionsWithUserSettings(result, req.body.uuid);
    // getting the quest percentage
    const resultArray = result1.map(getPercentage);
    const selectedHasHighPercentage = hasHighPercentage(
      resultArray[0].selectedPercentage || []
    );
    const contendedHasHighPercentage = hasHighPercentage(
      resultArray[0].contendedPercentage || []
    );
    await InfoQuestQuestions.findOneAndUpdate(
      {
        _id: req.body.questId,
      },
      {
        selectedPercentage: resultArray[0].selectedPercentage,
        contendedPercentage: resultArray[0].contendedPercentage,
        isAboveThePercentage: selectedHasHighPercentage ? true : false,
      }
    );
    await QuestRagUpdate.findOneAndUpdate(
      {},
      {
        $addToSet: { dailyQuestsToEmbed: req.body.questId.toString() }, // Use $addToSet to ensure uniqueness
      },
      { new: true, upsert: true } // Return the updated document, create if it doesn't exist
    );
    let desiredArray = resultArray.map((item) => ({
      ...item._doc,
      userQuestSetting: item.userQuestSetting,
      selectedPercentage: item.selectedPercentage,
      contendedPercentage: item.contendedPercentage,
      bookmark: !!bookmarkExist,
    }));

    // desiredArray = await Promise.all(
    //   desiredArray.map(async (doc) => {
    //     const articles = await Article.find({ source: doc._id }).sort({
    //       createdAt: -1,
    //     });
    //     return { ...doc, articles }; // Attach the articles to the doc
    //   })
    // );

    const excludedPages = ["Feedback", "SharedLink", "Hidden", "Bookmark"];

    if (!excludedPages.includes(req.body.Page)) {
      desiredArray = await Promise.all(
        desiredArray.map(async (doc) => {
          const articles = await Article.find({ source: doc._id }).sort({
            createdAt: -1,
          });
          return { ...doc, articles }; // Attach the articles to the doc
        })
      );
    }

    // // console.log(req);

    return {
      message: responseMsg,
      startQuestID: startQuestQuestion._id,
      data: desiredArray[0],
    };
  } catch (err) {
    // console.error(err);
    res.status(500).json({
      message: `An error occurred while updateChangeAnsStartQuest: ${err.message}`,
    });
  }

  function Compare(obj1, obj2) {
    const clonedObj1 = { ...obj1 };
    const clonedObj2 = { ...obj2 };

    delete clonedObj1.created;
    delete clonedObj2.created;

    const stringifiedObj1 = JSON.stringify(clonedObj1);
    const stringifiedObj2 = JSON.stringify(clonedObj2);

    if (stringifiedObj1 === stringifiedObj2) {
      return false;
    } else {
      return true;
    }
  }
};

const getRankedQuestPercent = async (req, res) => {
  try {
    const StartQuestsData = await StartQuests.find({
      questForeignKey: req.body.questForeignKey,
    });
    const optionsCount = {};
    let totalCount = 0;
    const mapExecution = StartQuestsData.map(async (res) => {
      let i = 1;

      res.data[res.data.length - 1].selected?.map((option) => {
        const question = option.question.trim();
        if (optionsCount[question]) {
          optionsCount[question] +=
            res.data[res.data.length - 1].selected.length - i;
          //// console.log("selected option" + optionsCount[question]);
          //// console.log(question);
        } else {
          optionsCount[question] =
            res.data[res.data.length - 1].selected.length - i;
          //// console.log("selected option first" + optionsCount[question]);
          //// console.log(question);
        }
        totalCount += res.data[res.data.length - 1].selected.length - i;
        i++;
        //// console.log("Total responses :" + totalCount);
      });
    });

    return Promise.all(mapExecution).then(() => {
      const percentageOfOptions = {};

      for (const option in optionsCount) {
        const percentage = (optionsCount[option] / totalCount) * 100;

        percentageOfOptions[option] = isNaN(percentage)
          ? 0
          : Number(Math.round(percentage));
      }

      //// console.log("🚀 ~ returnPromise.all ~ optionsCount:", optionsCount);
      //// console.log("🚀 ~ returnPromise.all ~ totalCount:", totalCount);
      const responseObj = {
        rankedPercentage: percentageOfOptions,
      };
      res.status(200).json([responseObj]);
    });
  } catch (err) {
    res.status(500).send("Not Created 2");
  }
};

const getStartQuestPercent = async (req, res) => {
  try {
    const StartQuestsData = await StartQuests.find({
      questForeignKey: req.body.questForeignKey,
      // questForeignKey: "64a6d5a9313105966b9682f2",
    });
    // //// console.log("StartQuestsData", StartQuestsData);

    let startQuestWithNagativeAns = 0,
      startQuestWithPositiveAns = 0; //length of total length
    let startQuestWithNagativeConAns = 0,
      startQuestWithPositiveConAns = 0;
    const selectedOptionsCount = {}; // Object to store the count of each option
    const contendedOptionsCount = {}; // Object to store the count of each option
    let totalSelectedResponses = 0;
    let totalContendedResponses = 0;
    let questype;

    const mapExecution = StartQuestsData.map(async (res) => {
      if (typeof res.data[res.data.length - 1].selected === "string") {
        questype = 1;
        if (
          res.data[res.data.length - 1].selected === "Yes" ||
          res.data[res.data.length - 1].selected === "Agree" ||
          res.data[res.data.length - 1].selected === "Like"
        ) {
          startQuestWithPositiveAns += 1;
          if (
            res.data[res.data.length - 1].contended === "Yes" ||
            res.data[res.data.length - 1].contended === "Agree" ||
            res.data[res.data.length - 1].contended === "Like"
          ) {
            startQuestWithPositiveConAns += 1;
          } else if (
            res.data[res.data.length - 1].contended === "No" ||
            res.data[res.data.length - 1].contended === "Disagree" ||
            res.data[res.data.length - 1].contended === "Unlike"
          ) {
            startQuestWithNagativeConAns += 1;
          }
        } else if (
          res.data[res.data.length - 1].selected === "No" ||
          res.data[res.data.length - 1].selected === "Disagree" ||
          res.data[res.data.length - 1].selected === "Unlike"
        ) {
          startQuestWithNagativeAns += 1;
          if (
            res.data[res.data.length - 1].contended === "No" ||
            res.data[res.data.length - 1].contended === "Disagree" ||
            res.data[res.data.length - 1].contended === "Unlike"
          ) {
            startQuestWithNagativeConAns += 1;
          } else if (
            res.data[res.data.length - 1].contended === "Yes" ||
            res.data[res.data.length - 1].contended === "Agree" ||
            res.data[res.data.length - 1].contended === "Unlike"
          ) {
            startQuestWithPositiveConAns += 1;
          }
        }
      } else {
        if (res.data[res.data.length - 1].selected) {
          res.data[res.data.length - 1].selected?.map((option) => {
            const question = option.question.trim();
            if (selectedOptionsCount[question]) {
              selectedOptionsCount[question]++;
              //// console.log("selected option" + selectedOptionsCount[question]);
              //// console.log(question);
            } else {
              selectedOptionsCount[question] = 1;
              //// console.log("selected option first" + selectedOptionsCount[question]);
              //// console.log(question);
            }
          });
          totalSelectedResponses++;
        }
        //// console.log("Total Selected responses :" + totalSelectedResponses);

        if (res.data[res.data.length - 1].contended) {
          res.data[res.data.length - 1].contended.map((option) => {
            const question = option.question.trim();
            if (contendedOptionsCount[question]) {
              contendedOptionsCount[question]++;
              //// console.log("contended option" + contendedOptionsCount[question]);
              //// console.log(question);
            } else {
              contendedOptionsCount[question] = 1;
              //// console.log("First contended option" + contendedOptionsCount[question]);
              //// console.log(question);
            }
          });
          totalContendedResponses++;
        }
        //// console.log("Total Contended responses :" + totalContendedResponses);
      }
    });

    return Promise.all(mapExecution).then(() => {
      if (questype === 1) {
        let TotalNumberOfAns =
          startQuestWithPositiveAns + startQuestWithNagativeAns;
        //// console.log("TotalNumberOfAns", TotalNumberOfAns);

        let percentageOfYesAns =
          startQuestWithPositiveAns === 0
            ? 0
            : (startQuestWithPositiveAns * 100) / TotalNumberOfAns;
        //// console.log("startQuestWithPositiveAns", percentageOfYesAns);

        let percentageOfNoAns =
          startQuestWithNagativeAns === 0
            ? 0
            : (startQuestWithNagativeAns * 100) / TotalNumberOfAns;
        //// console.log("startQuestWithNagativeAns", percentageOfNoAns);

        let TotalNumberOfConAns =
          startQuestWithPositiveConAns + startQuestWithNagativeConAns;
        //// console.log("TotalNumberOfConAns", TotalNumberOfConAns);

        let percentageOfYesConAns =
          startQuestWithPositiveConAns === 0
            ? 0
            : (startQuestWithPositiveConAns * 100) / TotalNumberOfConAns;
        //// console.log("startQuestWithPositiveConAns", percentageOfYesConAns);

        let percentageOfNoConAns =
          startQuestWithNagativeConAns === 0
            ? 0
            : (startQuestWithNagativeConAns * 100) / TotalNumberOfConAns;

        const responseObj = {
          selectedPercentage: {
            Yes: isNaN(percentageOfYesAns)
              ? 0
              : percentageOfYesAns % 1 === 0
                ? percentageOfYesAns
                : parseFloat(percentageOfYesAns.toFixed(1)),
            No: isNaN(percentageOfNoAns)
              ? 0
              : percentageOfNoAns % 1 === 0
                ? percentageOfNoAns
                : parseFloat(percentageOfNoAns.toFixed(1)),
          },
          contendedPercentage: {
            Yes: isNaN(percentageOfYesConAns)
              ? 0
              : percentageOfYesConAns % 1 === 0
                ? percentageOfYesConAns
                : parseFloat(percentageOfYesConAns.toFixed(1)),
            No: isNaN(percentageOfNoConAns)
              ? 0
              : percentageOfNoConAns % 1 === 0
                ? percentageOfNoConAns
                : parseFloat(percentageOfNoConAns.toFixed(1)),
          },
        };

        //// console.log(responseObj);
        res.status(200).json([responseObj]);
      } else {
        const percentageOfSelectedOptions = {};
        const percentageOfContendedOptions = {};
        let responses;
        if (totalSelectedResponses > totalContendedResponses) {
          responses = totalSelectedResponses;
        } else {
          responses = totalContendedResponses;
        }
        // Calculate the percentage for each option
        for (const option in selectedOptionsCount) {
          const percentage = (selectedOptionsCount[option] / responses) * 100;

          percentageOfSelectedOptions[option] = isNaN(percentage)
            ? 0
            : percentage % 1 === 0
              ? percentage
              : parseFloat(percentage.toFixed(1));
        }

        for (const option in contendedOptionsCount) {
          const percentage = (contendedOptionsCount[option] / responses) * 100;

          percentageOfContendedOptions[option] = isNaN(percentage)
            ? 0
            : percentage % 1 === 0
              ? percentage
              : parseFloat(percentage.toFixed(1));
        }

        const responseObj = {
          selectedPercentage: percentageOfSelectedOptions,
          contendedPercentage: percentageOfContendedOptions,
        };
        //// console.log(responseObj);
        res.status(200).json([responseObj]);
      }
    });
  } catch (err) {
    res.status(500).send("Not Created 2");
  }
};

const getStartQuestInfo = async (req, res) => {
  try {
    const startQuestQuestion = await StartQuests.findOne({
      questForeignKey: req.body.questForeignKey,
      uuid: req.body.uuid,
    });

    res.status(200).json(startQuestQuestion);
  } catch (err) {
    res.status(500).send("Not Created 2");
  }
};

const revealMyAnswers = async (req, res) => {
  try {
    const { uuid, questForeignKey, revealMyAnswers } = req.body;
    const startQuest = await StartQuests.findOne(
      {
        uuid: uuid,
        questForeignKey: questForeignKey,
      }
    );
    if (!startQuest) throw new Error("Please Participate first");
    const startQuestQuestion = await StartQuests.findOneAndUpdate(
      {
        uuid: uuid,
        questForeignKey: questForeignKey,
      },
      {
        revealMyAnswers: revealMyAnswers === "true" ? true : false,
      },
      {
        new: true,
      }
    );
    if (!startQuestQuestion) throw new Error("No Response against Post found!");

    res.status(200).json({ message: "Success", data: { revealMyAnswers: startQuestQuestion?.revealMyAnswers } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  updateViolationCounter,
  handleGetFrame,
  handleChangeFrame,
  submitThroughFrames,
  viewFarcasterResults,
  fidRedirect,
  createStartQuest,
  updateChangeAnsStartQuest,
  getRankedQuestPercent,
  getStartQuestPercent,
  getStartQuestInfo,
  createStartQuestUserList,
  updateChangeAnsStartQuestUserList,
  revealMyAnswers,
};
