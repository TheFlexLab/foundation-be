const Ledgers = require("../models/Ledgers");
const Users = require("../models/UserModel");
const AWS = require("aws-sdk");
const { createLedger } = require("../utils/createLedger");
const { updateTreasury } = require("../utils/treasuryService");
const { updateUserBalance } = require("../utils/userServices");
const crypto = require("crypto");
const { encryptData } = require("../utils/security");

const create = async (req, res) => {
  try {
    const ledger = await new Ledgers({ ...req.body });
    const savedLedger = await ledger.save();
    if (!savedLedger) throw new Error("Ledger Not Created Successfully!");
    res.status(201).json({ data: savedLedger });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while create Ledger: ${error.message}`,
    });
  }
};

const getById = async (req, res) => {
  try {
    const { page, limit, txAuth, uuid } = req.query;
    // const uuid = req.cookies.uuid || req.body.uuid;
    // filter Object
    const filterObj = {};
    if (txAuth) {
      filterObj.txAuth = txAuth;
      // filterObj.$or = [
      //   { txFrom: { $regex: "DAO Treasury", $options: "i" } }, // Case-insensitive match for txFrom
      //   { txTo: { $regex: "DAO Treasury", $options: "i" } }    // Case-insensitive match for txTo
      // ]
    } else {
      filterObj.uuid = uuid;
    }

    if (req.query.type) filterObj.type = req.query.type;

    const skip = (page - 1) * limit;

    const ledger = await Ledgers.find(filterObj)
      // .sort({ _id: 1 }) // Adjust the sorting based on your needs
      .sort(req.query.sort === "newest" ? { _id: -1 } : { _id: 1 }) // Adjust the sorting based on your needs
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Ledgers.countDocuments(filterObj);
    const pageCount = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: ledger,
      pageCount,
      totalCount,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while getById Ledger: ${error.message}`,
    });
  }
};

const getAll = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const ledger = await Ledgers.find({})
      .sort(req.query.sort === "newest" ? { _id: 1 } : { _id: -1 }) // Adjust the sorting based on your needs
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Ledgers.countDocuments();
    const pageCount = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: ledger,
      pageCount,
      totalCount,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: ` An error occurred while getAll Ledger: ${error.message}`,
    });
  }
};

const search = async (req, res) => {
  try {
    const { page, limit, sort, term, txAuth, uuid } = req.body.params;
    const skip = (page - 1) * limit;
    const searchTerm = term || "";

    if (txAuth) {
      const ledger = await Ledgers.find({
        txAuth,
        $or: [
          { txUserAction: { $regex: searchTerm, $options: "i" } },
          { txID: { $regex: searchTerm, $options: "i" } },
          { txData: { $regex: searchTerm, $options: "i" } },
        ],
      })
        .sort(sort === "newest" ? { _id: -1 } : { _id: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalCount = await Ledgers.countDocuments({
        txAuth,
        $or: [
          { txUserAction: { $regex: searchTerm, $options: "i" } },
          { txID: { $regex: searchTerm, $options: "i" } },
          { txData: { $regex: searchTerm, $options: "i" } },
        ],
      });
      const pageCount = Math.ceil(totalCount / limit);
      //// console.log(pageCount);
      //// console.log(totalCount);

      res.status(200).json({
        data: ledger,
        pageCount,
        totalCount,
      });
    } else {
      const ledger = await Ledgers.find({
        uuid,
        $or: [
          { txUserAction: { $regex: searchTerm, $options: "i" } },
          { txID: { $regex: searchTerm, $options: "i" } },
          { txData: { $regex: searchTerm, $options: "i" } },
        ],
      })
        .sort(sort === "newest" ? { _id: -1 } : { _id: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalCount = await Ledgers.countDocuments({
        uuid,
        $or: [
          { txUserAction: { $regex: searchTerm, $options: "i" } },
          { txID: { $regex: searchTerm, $options: "i" } },
          { txData: { $regex: searchTerm, $options: "i" } },
        ],
      });
      const pageCount = Math.ceil(totalCount / limit);
      //// console.log(pageCount);
      //// console.log(totalCount);

      res.status(200).json({
        data: ledger,
        pageCount,
        totalCount,
      });
    }
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: ` An error occurred while search Ledger: ${error.message}`,
    });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const ledger = Ledgers.findByIdAndDelete(id);
    res.status(200).json({ data: ledger });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while remove Ledger: ${error.message}`,
    });
  }
};

const deleteGuestOver30Days = async () => {
  try {
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

    // Find guest users who need to be deleted
    const users = await Users.find({
      role: "guest",
      created: { $lte: date30DaysAgo },
    });

    users.map(async (item) => {
      await createLedger({
        uuid: item.uuid,
        txUserAction: "accountExpiredGuest",
        txID: crypto.randomBytes(11).toString("hex"),
        txAuth: "User",
        txFrom: item.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: item.uuid,
      });

      await createLedger({
        uuid: item.uuid,
        txUserAction: "accountExpiredGuest",
        txID: crypto.randomBytes(11).toString("hex"),
        txAuth: "DAO",
        txFrom: item.uuid,
        txTo: "DAO Treasury",
        txAmount: item.balance,
        txData: item.uuid,
      });

      await updateTreasury({
        amount: item.balance,
        inc: true,
      });
      // Decrement the UserBalance
      await updateUserBalance({
        uuid: req.body.uuid,
        amount: item.balance,
        dec: true,
      });
      const userSpent = await Users.findOne({ uuid: item.uuid });
      userSpent.fdxSpent = userSpent.fdxSpent + item.balance;
      await userSpent.save();
    });

    const result = await Users.deleteMany({
      role: "guest",
      created: { $lte: date30DaysAgo },
    });

    // console.log("Guest Cron Results", result);
  } catch (error) {
    // console.error(`Error deleting guests`, error);
  }
};

const getLstActAndEmailForAllUsers = async () => {
  try {
    //// console.log("getLstActAndEmailForAllUsers")

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Aggregate to find the latest activity time for each UUID where last activity is more than 7 days ago
    const filteredUUIDs = await Ledgers.aggregate([
      {
        $group: {
          _id: "$uuid",
          lastActiveTime: { $max: "$updatedAt" },
        },
      },
      {
        $match: {
          lastActiveTime: { $lte: sevenDaysAgo },
        },
      },
    ]);

    // Fetch user emails from the users table for the filtered UUIDs
    const usersWithEmails = await Users.find(
      { uuid: { $in: filteredUUIDs.map((item) => item._id) } },
      { uuid: 1, email: 1 }
    );

    // Create a map to store email for each UUID
    const uuidToEmailMap = new Map(
      usersWithEmails.map((user) => [user.uuid, user.email])
    );

    // Filter out objects where email is not found or contains '@guest.com'
    const finalFilteredUUIDs = filteredUUIDs
      .filter((item) => {
        const email = uuidToEmailMap.get(item._id);
        return email && !email.includes("@guest.com");
      })
      .map((item) => ({
        uuid: item._id,
        lastActiveTime: item.lastActiveTime,
        email: uuidToEmailMap.get(item._id),
      }));

    if (finalFilteredUUIDs.length > 0) {
      // SES configuration
      const SES_CONFIG = {
        region: process.env.AWS_SES_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      };

      // Create SES service object
      const sesClient = new AWS.SES(SES_CONFIG);

      // Iterate over each email and send an email
      await Promise.all(
        finalFilteredUUIDs.map(async (item) => {
          const params = {
            Source: process.env.AWS_SES_SENDER,
            Destination: {
              // ToAddresses: [item.email],
              ToAddresses: ["sameer192.official@gmail.com"],
            },
            Message: {
              Body: {
                Html: {
                  Charset: "UTF-8",
                  Data: `You are inactive from the last seven days, Click <a href = "https://on.foundation/">here</a> to visit your app.`,
                },
                Text: {
                  Charset: "UTF-8",
                  Data: "Inactivity",
                },
              },
              Subject: {
                Charset: "UTF-8",
                Data: "Inactivity",
              },
            },
          };
          try {
            await sesClient.sendEmail(params).promise();
            //// console.log(`Email has been sent to ${item.email}`);
          } catch (error) {
            // console.error(`Error sending email to ${item.email}:`, error);
          }
        })
      );

      // Send the response after all emails have been sent
      // res.json({ lastActiveTimes: finalFilteredUUIDs });
      //// console.log({ lastActiveTimes: finalFilteredUUIDs });
    } else {
      // If no records are found, send an appropriate message
      // res.status(404).json({ message: 'No records found where 7 days have passed since last activity' });
      //// console.log({ message: 'No records found where 7 days have passed since last activity' });
    }

    //// console.log('Completed==============')
  } catch (error) {
    // If an error occurs during the database query, send an error response
    // console.error("Error occurred while fetching last active times for all users:",error);
  }
};

const withdraw = async () => {
  try {

    const { uuid, platform, address, walletType, coinAmount, fdx } = req.body;

    const user = await Users.findOne(
      {
        uuid: uuid,
      }
    );

    if (user.balance <= fdx) throw new Error("Balance is not enough to be withdraw");

    const txID1 = crypto.randomBytes(11).toString("hex");

    await createLedger({
      uuid: uuid,
      txUserAction: "fdxWithdraw",
      txID: txID1,
      txAuth: "User",
      txFrom: uuid,
      txTo: "userWallet",
      txAmount: fdx,
      txData: uuid,
      address: {
        platform: platform,
        address: encryptData(address),
        walletType: walletType,
        coinAmount: coinAmount,
        fdx: fdx
      }
    });

    await createLedger({
      uuid: item.uuid,
      txUserAction: "fdxWithdraw",
      txID: txID1,
      txAuth: "DAO",
      txFrom: item.uuid,
      txTo: "userWallet",
      txAmount: fdx,
      txData: item.uuid,
      address: {
        platform: platform,
        address: encryptData(address),
        walletType: walletType,
        coinAmount: coinAmount,
        fdx: fdx
      }
    });

    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: item.balance,
      dec: true,
    });
    // const userSpent = await Users.findOne({ uuid: item.uuid });
    // userSpent.fdxSpent = userSpent.fdxSpent + item.balance;
    // await userSpent.save();

    // console.log("Guest Cron Results", result);
  } catch (error) {
    // console.error(`Error deleting guests`, error);
  }
};

module.exports = {
  create,
  getById,
  getAll,
  search,
  remove,
  getLstActAndEmailForAllUsers,
  deleteGuestOver30Days,
  withdraw,
};
