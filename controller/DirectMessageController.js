const SendMessage = require("../models/SendMessage");
const ReceiveMessage = require("../models/ReceiveMessage");
const UserModel = require("../models/UserModel");
const { createLedger } = require("../utils/createLedger");
const { updateUserBalance, getUserBalance } = require("../utils/userServices");
const crypto = require("crypto");
const { sendEmail } = require("./DevScriptController");
const { AdvanceAnalytics } = require("../models/Analyze");
const StartQuests = require("../models/StartQuests");
const Email = require("../models/Email");
const { MESSAGE_SENDING_AMOUNT, MINIMUM_READ_REWARD } = require("../constants");
const Treasury = require("../models/Treasury");
const { updateTreasury } = require("../utils/treasuryService");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const { isLinkValid } = require("../service/userQuestSettings");
const { encryptData, decryptData } = require("../utils/security");

const send = async (req, res) => {
  try {
    const {
      from,
      to,
      subject,
      message,
      draftId,
      questForeignKey,
      uuid,
      readReward,
      options,
      platform,
      sharedLinkOnly,
    } = req.body;

    if (readReward && readReward < MINIMUM_READ_REWARD) return res.status(403).json({ message: "Cannot send message, Read reward is not sufficient" });

    let advanceAnalytics = null;
    let aaUsersUuids = [];
    advanceAnalytics = await AdvanceAnalytics.findOne({
      userUuid: uuid,
      questForeignKey: questForeignKey,
    });
    if (options && questForeignKey && uuid && to === "Participants") {
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
            recentData: {
              $arrayElemAt: [
                {
                  $sortArray: {
                    input: "$data",
                    sortBy: { created: -1 },
                  },
                },
                0,
              ],
            }, // Get the most recent data from the sorted array
          },
        },
        {
          $match: {
            $or: [
              // Case 1: `selected` is a string and must match one of the `options`
              {
                $and: [
                  { "recentData.selected": { $type: "string" } }, // Ensure it's a string
                  { "recentData.selected": { $in: options } }, // Must match `options`
                ],
              },
              // Case 2: `selected` is an array of objects and all `question` values must be in `options`
              {
                $and: [
                  { "recentData.selected": { $type: "array" } }, // Ensure it's an array
                  {
                    "recentData.selected": {
                      $not: {
                        $elemMatch: {
                          question: { $nin: options }, // Ensure all questions are in `options`
                        },
                      },
                    },
                  },
                ],
              },
              // Handle `contended` conditions if needed
              {
                $and: [
                  { "recentData.contended": { $type: "array" } }, // Ensure it's an array
                  {
                    "recentData.contended": {
                      $not: {
                        $elemMatch: {
                          question: { $nin: options }, // Ensure all questions are in `options`
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
      // Further filter the results if needed
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
          // Case where `selected` is a string and must match one of the `options`
          selectedValid = options.includes(recentData.selected);
        } else if (Array.isArray(recentData.selected)) {
          // Case where `selected` is an array of objects and all `question` values must be in `options`
          selectedValid = recentData.selected.some(
            (selection) =>
              selection &&
              typeof selection === "object" &&
              options.includes(selection.question)
          );
        }

        // Handle the `contended` structure
        if (Array.isArray(recentData.contended)) {
          // Case where `contended` is an array of objects and all `question` values must be in `options`
          contendedValid = recentData.contended.some(
            (contention) =>
              contention &&
              typeof contention === "object" &&
              options.includes(contention.question)
          );
        } else {
          // No `contended` condition for string type based on the provided information
          contendedValid = true; // or other conditions if needed
        }

        // Only include documents where both `selected` and `contended` are valid
        return selectedValid || contendedValid;
      });
      if (advanceAnalytics && advanceAnalytics?.userUuids?.length > 0 && advanceAnalytics?.advanceAnalytics?.length > 0) {
        const foundUuids = startQuests.map((doc) => doc.uuid);
        // Find matching UUIDs between foundUuids and advanceAnalytics.userUuid
        aaUsersUuids = foundUuids.filter((uuid) =>
          advanceAnalytics.usersUuids.includes(uuid)
        );
      } else {
        aaUsersUuids = startQuests.map((doc) => doc.uuid);
      }
    }
    if (!options && questForeignKey && uuid && to === "Participants") {
      if (!advanceAnalytics) {
        // Query to find documents with the specified questForeignKey
        const results = await StartQuests.find(
          { questForeignKey: questForeignKey },
          { uuid: 1, _id: 0 } // Projection to include only 'uuid' and exclude '_id'
        );
        aaUsersUuids = results.map((doc) => doc.uuid);
      } else {
        aaUsersUuids = advanceAnalytics.usersUuids;
      }
    }

    let receiversCount;
    if (to === "All") {
      const users = await UserModel.find({});
      receiversCount = users.length;
    }
    // if(to === "List"){
    //   const users = await Email.find({});
    //   receiversCount = users.length;
    // }
    if (to === "Participants") {
      receiversCount = aaUsersUuids.length;
    }
    if (to.includes("@")) {
      receiversCount = 1;
    }
    const user = await UserModel.findOne({
      uuid: uuid,
    });
    const totalCharges = MESSAGE_SENDING_AMOUNT * receiversCount;
    if (user && user.balance <= totalCharges)
      return res
        .status(403)
        .json({ message: "Can't send message, Balance is not enough." });

    // check user exist Sender
    const senderUser = await UserModel.findOne({ email: from });
    if (!senderUser) throw new Error("No such User!");

    // check user exist Receiver
    let receiverUser;
    let receiverUsers;
    if (to && to !== "All" && to !== "List" && to !== "Participants") {
      receiverUser = await UserModel.findOne({ email: to });
      if (!receiverUser) throw new Error("No such User!");
    } else if (to === "All") {
      receiverUsers = await UserModel.find({});
      if (receiverUsers.length === 0) throw new Error("No Users Found!");
    } else {
      if (to !== "List" && to !== "Participants")
        return res.status(403).json({ message: "Wrong Email used" });
    }

    // check user balance
    // const userBalance = await getUserBalance(req.body.uuid);
    // if (userBalance <= amount)
    //   throw new Error("Your balance is insufficient to create this redemption");
    // // Create Ledger
    // await createLedger({
    //   uuid: req.body.uuid,
    //   txUserAction: "redemptionCreated",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "DAO",
    //   txFrom: req.body.uuid,
    //   txTo: req.body.uuid,
    //   txAmount: amount,
    //   // txDescription : "User create redemption code"
    //   type: "redemption",
    // });
    // // Decrement the UserBalance
    // await updateUserBalance({
    //   uuid: req.body.uuid,
    //   amount: amount,
    //   dec: true,
    // });

    let savedSendMessage;
    if (draftId === "") {
      let sendMessage;
      if (readReward >= MINIMUM_READ_REWARD) {
        sendMessage = await new SendMessage({
          from: from,
          to: to,
          subject: subject,
          message: message,
          type: "sent",
          readReward: readReward,
          platform: platform,
          uuid: uuid
        });
      } else {
        sendMessage = await new SendMessage({
          from: from,
          to: to,
          subject: subject,
          message: message,
          type: "sent",
          platform: platform,
          uuid: uuid
        });
      }
      savedSendMessage = await sendMessage.save();
    } else {
      savedSendMessage = await SendMessage.findOneAndUpdate(
        {
          _id: draftId,
        },
        {
          type: "sent",
        }
      );
    }
    if (!savedSendMessage) throw new Error("Message Not Send Successfully!");

    if (to && to !== "All" && to !== "List" && to !== "Participants") {
      const receiveMessage = await new ReceiveMessage({
        sender: senderUser.uuid,
        receiver: receiverUser.uuid,
        shortMessage: message,
        subject,
        senderMessageId: savedSendMessage._id,
        platform: platform,
        // readReward: readReward,
      });
      const savedReceiveMessage = await receiveMessage.save();
      if (!savedReceiveMessage)
        throw new Error("Message Not Receive Successfully!");

      // update the sender Message
      savedSendMessage.unView = savedSendMessage.unView + 1;
      savedSendMessage.receiversIds = [receiveMessage._id];
      await savedSendMessage.save();
    } else if (to === "All") {
      // If 'to' is not provided, send the message to all users
      receiverUsers = await UserModel.find({});
      if (receiverUsers.length === 0) throw new Error("No Users Found!");

      // Create a new ReceiveMessage instance for each receiver
      const receiveMessages = receiverUsers.map((user) => ({
        sender: senderUser.uuid,
        receiver: user.uuid,
        shortMessage: message,
        subject,
        senderMessageId: savedSendMessage._id,
        readReward: readReward,
        platform: platform,
      }));

      // Bulk insert ReceiveMessages
      const savedReceiveMessages = await ReceiveMessage.insertMany(
        receiveMessages
      );
      if (savedReceiveMessages.length !== receiveMessages.length)
        throw new Error("Not All Messages Were Received Successfully!");
      // Extract _ids of all inserted documents
      const insertedIds = savedReceiveMessages.map((doc) => doc._id);

      // Update the sender Message
      savedSendMessage.unView = savedSendMessage.unView + receiverUsers.length;
      savedSendMessage.receiversIds = insertedIds;
      await savedSendMessage.save();
    } else if (to === "List") {
      const mails = await sendEmail(
        {
          body: {
            subject: subject,
            message: message,
            sender: from,
            service: true,
          },
        },
        null
      );
      if (!mails) throw new Error("No mails sent");
      const uuids = await Email.find({ subscribed: true }, "userUuid").exec();
      const uuidArray = uuids.map((email) => email.userUuid);
      savedSendMessage.receiversIds = uuidArray;
      await savedSendMessage.save();
    } else if (to === "Participants") {
      const infoQuest = await InfoQuestQuestions.findOne({
        _id: questForeignKey,
      });
      // Create a new ReceiveMessage instance for each receiver UUID
      const receiveMessages = await Promise.all(
        aaUsersUuids.map(async (uuid) => {
          // Find relevant StartQuests for the current UUID
          let startQuest;

          if (sharedLinkOnly && sharedLinkOnly !== "") {
            startQuest = await StartQuests.findOne({
              uuid: uuid,
              questForeignKey: questForeignKey, // Adjust based on your context
              userQuestSettingRef: sharedLinkOnly,
              $expr: { $gt: [{ $size: "$data" }, 0] }, // Ensure data array length is greater than 0
            });
          }
          else {
            startQuest = await StartQuests.findOne({
              uuid: uuid,
              questForeignKey: questForeignKey, // Adjust based on your context
              $expr: { $gt: [{ $size: "$data" }, 0] }, // Ensure data array length is greater than 0
            });
          }

          let recentData = null;

          if (startQuest && startQuest.data.length > 0) {
            // Sort the data array by created field to find the most recent object
            recentData = startQuest.data.sort(
              (a, b) => new Date(b.created) - new Date(a.created)
            )[0];
          }

          return {
            sender: senderUser.uuid,
            receiver: uuid,
            shortMessage: message,
            subject,
            senderMessageId: savedSendMessage._id,
            readReward: readReward,
            postQuestion: infoQuest.Question,
            postId: questForeignKey,
            whichTypeQuestion: infoQuest.whichTypeQuestion,
            opinion: recentData, // Assign the most recent data object to opinion
            platform: platform,
          };
        })
      );

      // Bulk insert ReceiveMessages
      const savedReceiveMessages = await ReceiveMessage.insertMany(
        receiveMessages
      );
      if (savedReceiveMessages.length !== receiveMessages.length) {
        throw new Error("Not All Messages Were Received Successfully!");
      }

      // Extract _ids of all inserted documents
      const insertedIds = savedReceiveMessages.map((doc) => doc._id);

      // Update the sender Message
      savedSendMessage.unView = savedSendMessage.unView + aaUsersUuids.length;
      savedSendMessage.receiversIds = insertedIds;
      await savedSendMessage.save();
    } else {
      return res.status(403).json({ message: "Not To type defined" });
    }

    if (to !== "List") {
      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "messageSent",
        txID: txID,
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "DAO",
        txAmount: 0,
        txDate: Date.now(),
        txDescription: "User sent a message.",
      });
      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "messageSent",
        txID: txID,
        txAuth: "DAO",
        txFrom: user.uuid,
        txTo: "DAO Treasury",
        txAmount: totalCharges,
        txDate: Date.now(),
        txDescription: "User sent a message.",
      });
      // Increment the Treasury
      await updateTreasury({ amount: totalCharges, inc: true });
      // Decrement the UserBalance
      await updateUserBalance({
        uuid: user.uuid,
        amount: totalCharges,
        dec: true,
      });
      user.fdxSpent = user.fdxSpent + totalCharges;
      await user.save();
    }

    res.status(201).json({ data: savedSendMessage });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while send DirectMessage: ${error.message}`,
    });
  }
};

const sendPublic = async (req, res) => {
  try {
    const {
      from,
      to,
      subject,
      message,
      platform,
      draftId,
      messageContext,
      sendFdxAmount,
    } = req.body;

    let receiver = await UserModel.findOne({
      badges: {
        $elemMatch: {
          "domain.name": to,
          domain: { $exists: true, $ne: null },
        },
      },
    });
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    const sender = await UserModel.findOne({ uuid: from });
    if (!sender) throw new Error("Sender Not Found!");
    if (sender.balance <= sendFdxAmount) {
      return res.status(403).json({ message: "Sender have Insufficient Balance, Request Can't be accepted for now!" });
    }

    let savedSendMessage;
    if (!draftId || draftId === "") {
      const sendMessage = await new SendMessage({
        from: from,
        to: receiver.uuid,
        subject: messageContext === "ByDomainRequestBadgeData" ? `Request for ${to}'s ${subject} badge.` : subject,
        message: messageContext === "ByDomainRequestBadgeData" ? `You requested for ${to}'s ${subject} badge.` : message,
        type: "sent",
        messageContext: messageContext,
        sendFdxAmount: sendFdxAmount,
        domain: to,
        ...(messageContext === "ByDomainRequestBadgeData" && { requestStatus: "Pending", requestedBadgeType: subject }),
      });
      savedSendMessage = await sendMessage.save();
    }
    else {
      savedSendMessage = await SendMessage.findOneAndUpdate(
        {
          _id: draftId,
        },
        {
          type: "sent",
        }
      );
    }
    if (!savedSendMessage) throw new Error("Message Not Sent!");

    const receiveMessage = await new ReceiveMessage({
      sender: from,
      receiver: receiver.uuid,
      subject: messageContext === "ByDomainRequestBadgeData" ? `Request for ${subject} badge data.` : subject,
      shortMessage: message,
      senderMessageId: savedSendMessage._id,
      platform: platform,
      messageContext: messageContext,
      sendFdxAmount: sendFdxAmount,
      domain: to,
      ...(messageContext === "ByDomainRequestBadgeData" && { requestStatus: "Pending", requestedBadgeType: subject }),
    });
    const savedReceiveMessage = await receiveMessage.save();
    if (!savedReceiveMessage) throw new Error("Message Not Receive!");

    if (messageContext === "ByDomain") {
      // Create Ledger Sender
      const txID = crypto.randomBytes(11).toString("hex");
      await createLedger({
        uuid: sender.uuid,
        txUserAction: "messageSent",
        txID: txID,
        txAuth: "User",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: 0,
        txDate: Date.now(),
        txDescription: "User sent a message.",
      });
      await createLedger({
        uuid: sender.uuid,
        txUserAction: "messageSent",
        txID: txID,
        txAuth: "DAO",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: sendFdxAmount,
        txDate: Date.now(),
        txDescription: "User sent a message.",
      });
      await updateUserBalance({
        uuid: sender.uuid,
        amount: sendFdxAmount,
        dec: true,
      });
      sender.fdxSpent = sender.fdxSpent + sendFdxAmount;
      await sender.save();

      // Create Ledger Receiver
      const txID2 = crypto.randomBytes(11).toString("hex");
      await createLedger({
        uuid: receiver.uuid,
        txUserAction: "messageFDXReceived",
        txID: txID2,
        txAuth: "User",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: 0,
        txDate: Date.now(),
        txDescription: "User get a read Reward.",
      });
      await createLedger({
        uuid: receiver.uuid,
        txUserAction: "messageFDXReceived",
        txID: txID2,
        txAuth: "DAO",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: sendFdxAmount,
        txDate: Date.now(),
        txDescription: "User get a read Reward.",
      });
      await updateUserBalance({
        uuid: receiver.uuid,
        amount: sendFdxAmount,
        inc: true,
      });
      receiver.fdxEarned = receiver.fdxEarned + sendFdxAmount;
      await receiver.save();
    }

    res.status(201).json({ data: savedSendMessage });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({ message: error.message });
  }
}

const requestStatus = async (req, res) => {
  try {
    const {
      badge,
      status,
      id,
      platform,
    } = req.body;

    let receivedMessage;

    if (status === "Accepted") {
      const receivedMessagePrev = await ReceiveMessage.findOne({ _id: id, });
      const sentMessageId = receivedMessagePrev?.senderMessageId;
      const sentMessagePrev = await SendMessage.findOne({ _id: sentMessageId, });
      if (!receivedMessagePrev || !sentMessagePrev) throw new Error("Message Not Found!");
      receivedMessage = await ReceiveMessage.findOneAndUpdate({ _id: id, }, { requestStatus: "Accepted" }, { new: true });
      const sentMessage = await SendMessage.findOneAndUpdate({ _id: sentMessageId, }, { requestStatus: "Accepted", }, { new: true });

      const sender = await UserModel.findOne({ uuid: sentMessage.from });
      const receiver = await UserModel.findOne({ uuid: sentMessage.to });
      if (!sender || !receiver) throw new Error("User Not Found!");
      if (sender.balance <= receivedMessage.sendFdxAmount) {
        return res.status(403).json({ message: "Sender have Insufficient Balance, Request Can't be accepted for now!" });
      }

      const sendMessage = await new SendMessage({
        from: sentMessage.to,
        to: sentMessage.from,
        subject: `${sentMessage?.requestedBadgeType} data request accepted.`,
        message: `You accepted request for badge ${sentMessage?.requestedBadgeType} data.`,
        type: "sent",
        platform: platform,
        uuid: sentMessage.to,
        requestStatus: "Accepted",
        requestData: encryptData(badge),
        messageContext: "ByDomainRequestBadgeData",
        sendFdxAmount: receivedMessage.sendFdxAmount,
        domain: receivedMessage.domain,
      });
      const savedSendMessage = await sendMessage.save();
      if (!savedSendMessage) throw new Error("Message Not Sent!");

      const receiveMessage = await new ReceiveMessage({
        sender: sentMessage.to,
        receiver: sentMessage.from,
        subject: `${sentMessage?.domain} accepted request.`,
        shortMessage: `Your request for badge ${sentMessage?.requestedBadgeType} to ${sentMessage?.domain} got accepted`,
        senderMessageId: savedSendMessage._id,
        platform: platform,
        requestStatus: "Accepted",
        requestData: encryptData(badge),
        messageContext: "ByDomainRequestBadgeData",
        sendFdxAmount: receivedMessage.sendFdxAmount,
        domain: receivedMessage.domain,
      });
      const savedReceiveMessage = await receiveMessage.save();
      if (!savedReceiveMessage) throw new Error("Message Not Receive!");

      // Create Ledger Sender
      const txID = crypto.randomBytes(11).toString("hex");
      await createLedger({
        uuid: sender.uuid,
        txUserAction: "messageFdxSent",
        txID: txID,
        txAuth: "User",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: 0,
        txDate: Date.now(),
        txDescription: "User sent a message.",
      });
      await createLedger({
        uuid: sender.uuid,
        txUserAction: "messageFdxSent",
        txID: txID,
        txAuth: "DAO",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: receivedMessage.sendFdxAmount,
        txDate: Date.now(),
        txDescription: "User sent a message.",
      });
      await updateUserBalance({
        uuid: sender.uuid,
        amount: receivedMessage.sendFdxAmount,
        dec: true,
      });
      sender.fdxSpent = sender.fdxSpent + receivedMessage.sendFdxAmount;
      await sender.save();

      // Create Ledger Receiver
      const txID2 = crypto.randomBytes(11).toString("hex");
      await createLedger({
        uuid: receiver.uuid,
        txUserAction: "messageFDXReceived",
        txID: txID2,
        txAuth: "User",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: 0,
        txDate: Date.now(),
        txDescription: "User received a message.",
      });
      await createLedger({
        uuid: receiver.uuid,
        txUserAction: "messageFDXReceived",
        txID: txID2,
        txAuth: "DAO",
        txFrom: sender.uuid,
        txTo: receiver.uuid,
        txAmount: receivedMessage.sendFdxAmount,
        txDate: Date.now(),
        txDescription: "User received a message.",
      });
      await updateUserBalance({
        uuid: receiver.uuid,
        amount: receivedMessage.sendFdxAmount,
        inc: true,
      });
      receiver.fdxEarned = receiver.fdxEarned + receivedMessage.sendFdxAmount;
      await receiver.save();
    }
    else if (status === "Rejected") {
      const receivedMessagePrev = await ReceiveMessage.findOne({ _id: id, });
      const sentMessageId = receivedMessagePrev?.senderMessageId;
      const sentMessagePrev = await SendMessage.findOne({ _id: sentMessageId, });
      if (!receivedMessagePrev || !sentMessagePrev) throw new Error("Message Not Found!");
      receivedMessage = await ReceiveMessage.findOneAndUpdate({ _id: id, }, { requestStatus: "Rejected" }, { new: true });
      const sentMessage = await SendMessage.findOneAndUpdate({ _id: sentMessageId, }, { requestStatus: "Rejected", }, { new: true });
      if (!receivedMessage || !sentMessage) throw new Error("Message Not Found!");

      const sendMessage = await new SendMessage({
        from: sentMessage.to,
        to: sentMessage.from,
        subject: `${sentMessage?.requestedBadgeType} data request rejected.`,
        message: `You rejected request for badge ${sentMessage?.requestedBadgeType} data.`,
        type: "sent",
        platform: platform,
        uuid: sentMessage.to,
        requestStatus: "Rejected",
        messageContext: "ByDomainRequestBadgeData",
        sendFdxAmount: receivedMessage.sendFdxAmount,
        domain: receivedMessage.domain,
      });
      const savedSendMessage = await sendMessage.save();
      if (!savedSendMessage) throw new Error("Message Not Sent Successfully!");

      const receiveMessage = await new ReceiveMessage({
        sender: sentMessage.to,
        receiver: sentMessage.from,
        subject: `${sentMessage?.domain} rejected request.`,
        shortMessage: `Your request for badge ${sentMessage?.requestedBadgeType} to ${sentMessage?.domain} got rejected`,
        senderMessageId: savedSendMessage._id,
        platform: platform,
        requestStatus: "Rejected",
        messageContext: "ByDomainRequestBadgeData",
        sendFdxAmount: receivedMessage.sendFdxAmount,
        domain: receivedMessage.domain,
      });
      const savedReceiveMessage = await receiveMessage.save();
      if (!savedReceiveMessage) throw new Error("Message Not Receive Successfully!");
    }
    else {
      return res.status(404).json({ message: `No such status: ${status}` });
    }

    return res.status(200).json({ data: receivedMessage });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
}

const getAllSend = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const uuid = req.params.uuid;

    const user = await UserModel.findOne({ uuid });

    const sendMessage = await SendMessage.find({
      from: [user.email, user.uuid],
      type: { $ne: "draft" },
    }).sort({
      _id: -1,
    });

    res.status(200).json({
      data: sendMessage,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllSend DirectMessage: ${error.message}`,
    });
  }
};

const getAllReceive = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const uuid = req.params.uuid;

    const user = await UserModel.findOne({ uuid });

    const receiveMessage = await ReceiveMessage.find({
      receiver: uuid,
      isDeleted: false,
    }).sort({ _id: -1 });

    // Iterate through the array and decrypt requestData if it exists
    const updatedMessages = receiveMessage.map((doc) => {
      if (doc.requestData) {
        return {
          ...doc.toObject(), // Ensure compatibility if it's a Mongoose document
          requestData: decryptData(doc.requestData),
        };
      }
      return doc;
    });

    res.status(200).json({
      data: updatedMessages,
      count: await ReceiveMessage.countDocuments({
        receiver: uuid,
        viewed: false,
        isDeleted: false,
      }),
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllReceive DirectMessage: ${error.message}`,
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageType, _id } = req.body;
    if (messageType === "sent") {
      const sendMessage = await SendMessage.findOneAndDelete({ _id });
      if (!sendMessage) throw new Error("Deletion failed!");
    } else {
      const receiveMessage = await ReceiveMessage.findOneAndDelete({ _id });
      if (!receiveMessage) throw new Error("Deletion failed!");
    }
    res.status(200).json({ data: "", msg: "Successfully deleted!" });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while deleteMessage DirectMessage: ${error.message}`,
    });
  }
};

const view = async (req, res) => {
  try {
    const { sender, receiver, _id } = req.body;
    // check user exist Sender
    const senderUser = await UserModel.findOne({ uuid: sender });
    if (!senderUser) throw new Error("No such User!");

    // check user exist Receiver
    const receiverUser = await UserModel.findOne({ uuid: receiver });
    if (!receiverUser) throw new Error("No such User!");

    //   Fetch the receiveMessage data
    const receiveMessage = await ReceiveMessage.findOne({ _id });
    if (!receiveMessage) throw new Error("Message Not Found!");

    if (receiveMessage.sender !== receiveMessage.receiver) {
      if (
        receiveMessage.readReward &&
        receiveMessage.readReward >= MINIMUM_READ_REWARD
      ) {
        if (senderUser.balance <= receiveMessage.readReward)
          return res
            .status(403)
            .json({ message: "Message is not allowed to veiw yet!" });
      }
    }

    // check user balance
    // const userBalance = await getUserBalance(req.body.uuid);
    // if (userBalance <= amount)
    //   throw new Error("Your balance is insufficient to create this redemption");
    // // Create Ledger
    // await createLedger({
    //   uuid: req.body.uuid,
    //   txUserAction: "redemptionCreated",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "DAO",
    //   txFrom: req.body.uuid,
    //   txTo: req.body.uuid,
    //   txAmount: amount,
    //   // txDescription : "User create redemption code"
    //   type: "redemption",
    // });
    // // Decrement the UserBalance
    // await updateUserBalance({
    //   uuid: req.body.uuid,
    //   amount: amount,
    //   dec: true,
    // });

    // update the send Message
    const updatedSendMessage = await SendMessage.findOneAndUpdate(
      { _id: receiveMessage.senderMessageId },
      { $inc: { view: 1, unView: -1 } }
    );
    if (!updatedSendMessage)
      throw new Error("Message Not Updated Successfully!");

    // update the receive Message
    receiveMessage.viewed = true;
    await receiveMessage.save();

    if (receiveMessage.sender !== receiveMessage.receiver && receiveMessage.messageContext !== "ByDomain" && receiveMessage.messageContext !== "ByDomainRequestBadgeData") {
      if (
        receiveMessage.readReward &&
        receiveMessage.readReward >= MINIMUM_READ_REWARD
      ) {
        const txID1 = crypto.randomBytes(11).toString("hex");
        // Create Ledger
        await createLedger({
          uuid: senderUser.uuid,
          txUserAction: "readRewardSent",
          txID: txID1,
          txAuth: "User",
          txFrom: senderUser.uuid,
          txTo: "DAO",
          txAmount: 0,
          txDate: Date.now(),
          txDescription: "User sent a read Reward.",
        });
        // Create Ledger
        await createLedger({
          uuid: senderUser.uuid,
          txUserAction: "readRewardSent",
          txID: txID1,
          txAuth: "DAO",
          txFrom: senderUser.uuid,
          txTo: receiverUser.uuid,
          txAmount: receiveMessage.readReward,
          txDate: Date.now(),
          txDescription: "User sent a read Reward.",
        });
        // Decrement the UserBalance
        await updateUserBalance({
          uuid: senderUser.uuid,
          amount: receiveMessage.readReward,
          dec: true,
        });
        senderUser.fdxSpent = senderUser.fdxSpent + receiveMessage.readReward;
        await senderUser.save();

        const txID2 = crypto.randomBytes(11).toString("hex");
        // Create Ledger
        await createLedger({
          uuid: receiverUser.uuid,
          txUserAction: "readRewardReceived",
          txID: txID2,
          txAuth: "User",
          txFrom: receiverUser.uuid,
          txTo: "DAO",
          txAmount: 0,
          txDate: Date.now(),
          txDescription: "User get a read Reward.",
        });
        // Create Ledger
        await createLedger({
          uuid: receiverUser.uuid,
          txUserAction: "readRewardReceived",
          txID: txID2,
          txAuth: "DAO",
          txFrom: senderUser.uuid,
          txTo: receiverUser.uuid,
          txAmount: receiveMessage.readReward,
          txDate: Date.now(),
          txDescription: "User get a read Reward.",
        });
        // Decrement the UserBalance
        await updateUserBalance({
          uuid: receiverUser.uuid,
          amount: receiveMessage.readReward,
          inc: true,
        });
        receiverUser.fdxEarned =
          receiverUser.fdxEarned + receiveMessage.readReward;
        await receiverUser.save();
        receiveMessage.readReward = 0;
        await receiveMessage.save();
      }
    }

    // const receiveMessage = await new ReceiveMessage({ sender: senderUser.uuid, receiver: receiverUser.uuid, shortMessage: message  });
    // const savedReceiveMessage = await receiveMessage.save();
    // if (!savedReceiveMessage) throw new Error("Message Not Receive Successfully!");

    if (receiveMessage?.requestData) {
      receiveMessage.requestData = decryptData(receiveMessage.requestData);
    }

    res.status(201).json({ data: receiveMessage });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while view DirectMessage: ${error.message}`,
    });
  }
};

const trashMessage = async (req, res) => {
  try {
    const { _id, messageType } = req.body;
    let message;
    if (messageType === "sent" || messageType === "draft") {
      message = await SendMessage.findOneAndUpdate(
        { _id },
        { $set: { isDeleted: true } },
        { new: true }
      );
      if (!message) throw new Error("Trash e failed!");
    } else {
      message = await ReceiveMessage.findOneAndUpdate(
        { _id },
        { $set: { isDeleted: true } },
        { new: true }
      );
      const sentId = message.senderMessageId;
      const sentMessageDeleteCount = await SendMessage.findOneAndUpdate(
        { _id: sentId },
        { $inc: { deleteCount: 1 } },
        { new: true }
      );
      if (!message || !sentMessageDeleteCount) throw new Error("Trash failed!");
    }
    res.status(200).json({ data: message, msg: "Successfully trashed!" });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while trashMessage DirectMessage: ${error.message}`,
    });
  }
};

const restoreMessage = async (req, res) => {
  try {
    const { _id, messageType } = req.body;
    let message;
    if (messageType === "sent") {
      message = await SendMessage.findOneAndUpdate(
        { _id },
        { $set: { isDeleted: false } },
        { new: true }
      );
      if (!message) throw new Error("Deletion failed!");
    } else {
      message = await ReceiveMessage.findOneAndUpdate(
        { _id },
        { $set: { isDeleted: false } },
        { new: true }
      );
      if (!message) throw new Error("Deletion failed!");
    }

    res.status(200).json({ data: message, msg: "Successfully restored!" });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while restoreMessage DirectMessage: ${error.message}`,
    });
  }
};

const getAllDeletedMessage = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const uuid = req.params.uuid;

    const user = await UserModel.findOne({ uuid });

    const receiveMessage = await ReceiveMessage.find({
      receiver: uuid,
      isDeleted: true,
    }).sort({ _id: -1 });

    res.status(200).json({
      data: receiveMessage,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllDeletedMessage DirectMessage: ${error.message}`,
    });
  }
};

const draft = async (req, res) => {
  try {
    let { from, to, subject, message, platform, messageContext, sendFdxAmount, id, uuid, questForeignKey, options, readReward } = req.body;

    // check user exist Sender
    let senderUser;
    let domain;
    if (messageContext) {
      domain = to;
      senderUser = await UserModel.findOne({ uuid: from });
      let user = await UserModel.findOne({
        badges: {
          $elemMatch: {
            "domain.name": to,
            domain: { $exists: true, $ne: null },
          },
        },
      }).lean();
      if (!user) return res.status(404).json({ message: "User not found" });
      to = user.uuid;
    }
    else {
      senderUser = await UserModel.findOne({ email: from });
    }
    if (!senderUser) throw new Error("No such User!");

    let draftExist = null;
    if (id && id !== "") {
      draftExist = await SendMessage.findOne({
        _id: id,
        type: "draft",
      });
    }

    if (draftExist) {
      draftExist.from = from;
      draftExist.to = to;
      draftExist.subject = subject;
      draftExist.message = message;
      draftExist.type = "draft";
      draftExist.uuid = uuid;
      draftExist.platform = platform;
      draftExist.questForeignKey = questForeignKey;
      draftExist.options = options;
      draftExist.readReward = readReward;
      draftExist.messageContext = messageContext;
      draftExist.sendFdxAmount = sendFdxAmount;
      draftExist.domain = domain;
      await draftExist.save();
      const updatedDraft = await SendMessage.findOne({
        _id: id,
      });
      return res.status(201).json({ data: updatedDraft });
    } else {
      const sendMessage = await new SendMessage({
        from: from,
        to: to,
        subject: subject,
        message: message,
        type: "draft",
        uuid: uuid,
        questForeignKey: questForeignKey,
        options: options,
        platform: platform,
        readReward: readReward,
        messageContext: messageContext,
        sendFdxAmount: sendFdxAmount,
        domain: domain,
      });
      const savedDraftedMessage = await sendMessage.save();
      if (!savedDraftedMessage)
        throw new Error("Message Not drafted Successfully!");

      return res.status(201).json({ data: savedDraftedMessage });
    }
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while draft DirectMessage: ${error.message}`,
    });
  }
};

const getAllDraft = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const uuid = req.params.uuid;

    const user = await UserModel.findOne({ uuid });

    const sendMessage = await SendMessage.find({
      from: [user.email, user.uuid],
      type: "draft",
      isDeleted: false,
    }).sort({
      _id: -1,
    });

    res.status(200).json({
      data: sendMessage,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllDraft DirectMessage: ${error.message}`,
    });
  }
};

const cancleMessage = async (req, res) => {
  try {
    const { uuid, id } = req.params;
    const sentMessage = await SendMessage.findOne({
      _id: id,
    });

    // Count the documents that match the criteria
    const countDocs = await ReceiveMessage.countDocuments({
      _id: { $in: sentMessage.receiversIds },
      viewed: false,
    });
    const totalCharges = MESSAGE_SENDING_AMOUNT * countDocs;
    const user = await UserModel.findOne({
      uuid: uuid,
    });

    const deleteMessages = await ReceiveMessage.deleteMany({
      _id: { $in: sentMessage.receiversIds },
      viewed: false,
    });
    if (!deleteMessages) throw new Error("No message deleted");

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "cancelSentMessageRefund",
      txID: txID,
      txAuth: "User",
      txFrom: uuid,
      txTo: "DAO",
      txAmount: 0,
      txDate: Date.now(),
      txDescription: "User sent a message, Cancel refund.",
    });
    // Create Ledger
    await createLedger({
      uuid: uuid,
      txUserAction: "cancelSentMessageRefund",
      txID: txID,
      txAuth: "DAO",
      txFrom: uuid,
      txTo: "DAO Treasury",
      txAmount: totalCharges,
      txDate: Date.now(),
      txDescription: "User sent a message, Cancel refund.",
    });
    // Increment the Treasury
    await updateTreasury({ amount: totalCharges, dec: true });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: uuid,
      amount: totalCharges,
      inc: true,
    });
    user.fdxEarned = user.fdxEarned + totalCharges;
    await user.save();

    res.status(200).json({
      data: sentMessage,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllDraft DirectMessage: ${error.message}`,
    });
  }
};

const getCountForOptions = async (req, res) => {
  try {
    const { uuid, questForeignKey, options, sharedLinkOnly } = req.body;

    let advanceAnalytics = null;
    let aaUsersUuids = [];
    advanceAnalytics = await AdvanceAnalytics.findOne({
      userUuid: uuid,
      questForeignKey: questForeignKey,
    });
    if (options && questForeignKey && uuid) {
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
            recentData: {
              $arrayElemAt: [
                {
                  $sortArray: {
                    input: "$data",
                    sortBy: { created: -1 },
                  },
                },
                0,
              ],
            }, // Get the most recent data from the sorted array
          },
        },
        {
          $match: {
            $or: [
              // Case 1: `selected` is a string and must match one of the `options`
              {
                $and: [
                  { "recentData.selected": { $type: "string" } }, // Ensure it's a string
                  { "recentData.selected": { $in: options } }, // Must match `options`
                ],
              },
              // Case 2: `selected` is an array of objects and all `question` values must be in `options`
              {
                $and: [
                  { "recentData.selected": { $type: "array" } }, // Ensure it's an array
                  {
                    "recentData.selected": {
                      $not: {
                        $elemMatch: {
                          question: { $nin: options }, // Ensure all questions are in `options`
                        },
                      },
                    },
                  },
                ],
              },
              // Handle `contended` conditions if needed
              {
                $and: [
                  { "recentData.contended": { $type: "array" } }, // Ensure it's an array
                  {
                    "recentData.contended": {
                      $not: {
                        $elemMatch: {
                          question: { $nin: options }, // Ensure all questions are in `options`
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
      // Further filter the results if needed
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
          // Case where `selected` is a string and must match one of the `options`
          selectedValid = options.includes(recentData.selected);
        } else if (Array.isArray(recentData.selected)) {
          // Case where `selected` is an array of objects and all `question` values must be in `options`
          selectedValid = recentData.selected.some(
            (selection) =>
              selection &&
              typeof selection === "object" &&
              options.includes(selection.question)
          );
        }

        // Handle the `contended` structure
        if (Array.isArray(recentData.contended)) {
          // Case where `contended` is an array of objects and all `question` values must be in `options`
          contendedValid = recentData.contended.some(
            (contention) =>
              contention &&
              typeof contention === "object" &&
              options.includes(contention.question)
          );
        } else {
          // No `contended` condition for string type based on the provided information
          contendedValid = true; // or other conditions if needed
        }

        // Only include documents where both `selected` and `contended` are valid
        return selectedValid || contendedValid;
      });
      if (advanceAnalytics && advanceAnalytics?.userUuids?.length > 0 && advanceAnalytics?.advanceAnalytics?.length > 0) {
        const foundUuids = startQuests.map((doc) => doc.uuid);
        // Find matching UUIDs between foundUuids and advanceAnalytics.userUuid
        aaUsersUuids = foundUuids.filter((uuid) =>
          advanceAnalytics.usersUuids.includes(uuid)
        );
      } else {
        aaUsersUuids = startQuests.map((doc) => doc.uuid);
      }
    }
    if (questForeignKey && uuid && !options) {
      if (!advanceAnalytics) {
        // Query to find documents with the specified questForeignKey
        const results = await StartQuests.find(
          { questForeignKey: questForeignKey },
          { uuid: 1, _id: 0 } // Projection to include only 'uuid' and exclude '_id'
        );
        aaUsersUuids = results.map((doc) => doc.uuid);
      } else {
        aaUsersUuids = advanceAnalytics.usersUuids;
      }
    }

    res.status(200).json({
      dynamicParticipantsCount: aaUsersUuids.length,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while getAllDraft DirectMessage: ${error.message}`,
    });
  }
};

module.exports = {
  send,
  sendPublic,
  requestStatus,
  draft,
  getAllDraft,
  getAllSend,
  getAllReceive,
  view,
  deleteMessage,
  trashMessage,
  restoreMessage,
  getAllDeletedMessage,
  cancleMessage,
  getCountForOptions,
};
