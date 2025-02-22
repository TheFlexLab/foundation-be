const { ACCOUNT_BADGE_ADDED_AMOUNT } = require("../constants");
const UserModel = require("../models/UserModel");
const { createToken } = require("../service/auth");
const { createLedger } = require("../utils/createLedger");
const crypto = require("crypto");
const { updateTreasury } = require("../utils/treasuryService");
const { updateUserBalance } = require("../utils/userServices");
const { eduEmailCheck } = require("../utils/eduEmailCheck");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const QRCode = require("qrcode");
const {
  JWT_SECRET,
  FRONTEND_URL,
  MODE,
  STRIPE_CLIENT_ID,
  STRIPE_SECRET_KEY,
  BACKEND_URL,
} = require("../config/env");
const { error } = require("console");
const Company = require("../models/Company");
const JobTitle = require("../models/JobTitle");
const DegreeAndFieldOfStudy = require("../models/DegreeAndFieldOfStudy");
const mongoose = require("mongoose");
const User = require("../models/UserModel");
const personalKeys = ["firstName", "lastName", "security-question", "identity"];
const noEncDecPersonalKeys = [
  "geolocation",
  "dateOfBirth",
  "currentCity",
  "homeTown",
  "relationshipStatus",
  "sex",
];
const validTypes = [
  "work",
  "education",
  "hobbies",
  "volunteer",
  "certifications",
];

// Encryption/Decryption Security Purposes.
const {
  encryptData,
  decryptData,
  userCustomizedEncryptData,
  userCustomizedDecryptData,
} = require("../utils/security");

const Treasury = require("../models/Treasury");
const { type } = require("os");
const { EmptyBatchRequestException } = require("@aws-sdk/client-sns");
const {
  deleteDirectoryFromS3,
  uploadDirectoryToS3,
  uploadS3Bucket,
  uploadFileToS3FromBuffer,
  deleteFileFromS3,
} = require("../utils/uploadS3Bucket");
const SearchAccountId = require("../models/SearchAccountId");
const SearchAge = require("../models/SearchAge");
const SearchPhoneNumber = require("../models/SearchPhoneNumber");
const SearchEmail = require("../models/SearchEmail");
const { UserListSchema } = require("../models/UserList");
const UserQuestSetting = require("../models/UserQuestSetting");
const { ArticleSetting } = require("../models/ArticleSetting");
const {
  compareFacesInImages,
  validateDocumentImages,
} = require("../service/badge");
const { genericOpenAi } = require("../service/AiValidation");
const SearchIdentity = require("../models/SearchIdentity");
const Certifications = require("../models/Certifications");
const Volunteer = require("../models/Volunteer");
const Hobbies = require("../models/Hobbies");
const Organizations = require("../models/Organizations");
const stripe = require("stripe")(STRIPE_SECRET_KEY);

const update = async (req, res) => {
  try {
    let legacyEmail = false;
    const { userId, badgeId } = req.params;
    const User = await UserModel.findOne({ _id: userId });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const userBadges = User.badges;
    const updatedUserBadges = userBadges.map((item) => {
      if (item._id.toHexString() == badgeId) {
        if (item.accountName === "Email") {
          legacyEmail = true;
        }
        return { ...item, type: req.body.type, primary: req.body.primary };
        // return item.type = req.body.type;
      } else {
        return item;
      }
    });
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    User.requiredAction = false;
    await User.save();

    // Generate a JWT token
    const token = createToken({ uuid: User.uuid });

    // Decrypt Saved Data
    const decryptUser = User._doc;

    if (!legacyEmail) {
      decryptUser.badges[0].details = decryptData(
        decryptUser.badges[0].details
      );
    }

    res.status(200).json({ ...decryptUser, token });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while update Ledger: ${error.message}`,
    });
  }
};

const updateOnBoarding = async (req, res) => {
  try {
    let legacyEmail = false;
    const { userId } = req.params;
    const User = await UserModel.findOne({ _id: userId });
    if (!User) throw new Error("No such User!");

    // Update the action
    User.onBoarding = false;
    await User.save();

    res.status(200).json({ message: "Sucess" });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while update Ledger: ${error.message}`,
    });
  }
};

const getBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    const User = await UserModel.findOne({ uuid: userId });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const userBadges = User.badges;

    res.status(200).json({ userBadges });
  } catch (error) {
    // console.error(error);
    res.status(500).json({
      message: `An error occurred while update Ledger: ${error.message}`,
    });
  }
};

// ALERT: API is not being used at FE send `req.body.uuid` before use.
const addBadgeSocial = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    // const User = await UserModel.findOne({ uuid: req.cookies.uuid });
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { accountId: req.user._json.id } },
    });
    if (usersWithBadge.length !== 0) throw new Error("Badge already exist");

    const userBadges = User.badges;
    const updatedUserBadges = [
      ...userBadges,
      {
        accountId: req.user._json.id,
        accountName: req.user.provider,
        isVerified: true,
        type: "default",
      },
    ];
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.user.provider,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.user.provider,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.clearCookie("social");
    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const addContactBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    const eyk = req.body.infoc;
    // Check education Email
    if (req.body.type === "education") {
      let emailStatus;
      if (req.body.provider) {
        // Check Email Category
        emailStatus = await eduEmailCheck(req, res, req.body._json.email);
      } else {
        // Check Email Category
        emailStatus = await eduEmailCheck(req, res, req.body.email);
      }
      //// console.log("🚀 ~ addContactBadge ~ emailStatus:", emailStatus);
      if (emailStatus.status !== "OK") throw new Error(emailStatus.message);
    }

    if (req.body.legacy) {
      // Find the Badge
      const usersWithBadge = await UserModel.find({
        badges: { $elemMatch: { email: req.body.email } },
      });
      // Find the User Email
      const usersWithEmail = await UserModel.find({
        email: req.body.email,
      });
      //// console.log("wamiq", usersWithBadge);
      if (usersWithBadge.length !== 0 || usersWithEmail.length !== 0)
        throw new Error("Oops! This account is already linked.");

      // Send an email
      await sendVerifyEmail({
        email: req.body.email,
        uuid: req.body.uuid,
        type: req.body.type,
      });
      res.status(201).json({
        message: `Sent a verification email to ${req.body.email}`,
      });
      return;
    }
    if (req.body.type === "cell-phone") {
      // Find the Badge
      let usersWithBadge;
      if (User.isPasswordEncryption) {
        if (!eyk)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        usersWithBadge = await UserModel.find({
          badges: {
            $elemMatch: {
              details: userCustomizedEncryptData(encryptData(req.body), eyk),
            },
          },
        });
      } else {
        usersWithBadge = await UserModel.find({
          badges: {
            $elemMatch: { details: encryptData(req.body) },
          },
        });
      }
      if (usersWithBadge.length !== 0) {
        throw new Error("Oops! This account is already linked.");
      }

      const userBadges = User.badges;
      let updatedUserBadges;
      if (User.isPasswordEncryption) {
        if (!eyk)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        updatedUserBadges = [
          ...userBadges,
          {
            type: req.body.type,
            details: userCustomizedEncryptData(encryptData(req.body), eyk),
          },
        ];
      } else {
        updatedUserBadges = [
          ...userBadges,
          {
            type: req.body.type,
            details: encryptData(req.body),
          },
        ];
      }
      // Update the user badges
      User.badges = updatedUserBadges;
      // Update the action
      await User.save();

      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: User.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "User",
        txFrom: User.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: req.body.type,
        // txDescription : "User adds a verification badge"
      });
      await createLedger({
        uuid: User.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: User.uuid,
        txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
        txData: req.body.type,
        // txDescription : "Incentive for adding badges"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

      // Increment the UserBalance
      await updateUserBalance({
        uuid: User.uuid,
        amount: ACCOUNT_BADGE_ADDED_AMOUNT,
        inc: true,
      });

      User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
      User.rewardSchedual.addingBadgeFdx =
        User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
      await User.save();

      await SearchPhoneNumber.findOneAndUpdate(
        { phoneNumber: encryptData(req.body.data) },
        { phoneNumber: encryptData(req.body.data) },
        { new: true, upsert: true }
      ).exec();

      res.status(200).json({ message: "Badge Added Successfully" });
      return;
    }
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: { accountId: req.body.id, accountName: req.body.provider },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;

    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.id,
          accountName: req.body.provider,
          isVerified: true,
          type: req.body.type,
          details: userCustomizedEncryptData(encryptData(req.body), eyk),
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.id,
          accountName: req.body.provider,
          isVerified: true,
          type: req.body.type,
          details: encryptData(req.body),
        },
      ];
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.type,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    await SearchEmail.findOneAndUpdate(
      { email: encryptData(req.body._json.email) },
      { email: encryptData(req.body._json.email) },
      { new: true, upsert: true }
    );

    // res.clearCookie("social");
    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addContactBadge: ${error.message}`,
    });
  }
};

const addBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    const eyk = req.body.infoc;
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: {
          accountId: req.body.badgeAccountId,
          accountName: req.body.provider,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    let followers, followings;

    if (req.body.provider === "linkedin") {
      followers = req.body.data._json.connects
        ? req.body.data._json.connects
        : 0;
      followings = req.body.data._json.connects
        ? req.body.data._json.connects
        : 0;
    }

    if (req.body.provider === "twitter") {
      followers = req.body.data._json.followers_count
        ? req.body.data._json.followers_count
        : 0;
      followings = req.body.data._json.friends_count
        ? req.body.data._json.friends_count
        : 0;
    }

    if (req.body.provider === "github") {
      followers = req.body.data._json.followers
        ? req.body.data._json.followers
        : 0;
      followings = req.body.data._json.following
        ? req.body.data._json.following
        : 0;
      // console.log(followings, followers);
    }

    if (req.body.provider === "facebook") {
      followers = req.body.data._json.followers
        ? req.body.data._json.followers
        : 0;
      followings = req.body.data._json.followings
        ? req.body.data._json.followings
        : 0;
    }

    if (req.body.provider === "youtube") {
      followers = req.body.data._json.followers
        ? req.body.data._json.followers
        : 0;
      followings = req.body.data._json.followings
        ? req.body.data._json.followings
        : 0;
    }

    const userBadges = User.badges;
    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.badgeAccountId,
          accountName: req.body.provider,
          followers: followers,
          followings: followings,
          details: userCustomizedEncryptData(encryptData(req.body.data), eyk),
          isVerified: true,
          type: "default",
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.badgeAccountId,
          accountName: req.body.provider,
          followers: followers,
          followings: followings,
          details: encryptData(req.body.data),
          isVerified: true,
          type: "default",
        },
      ];
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.provider,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.provider,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    await SearchAccountId.findOneAndUpdate(
      { accountId: encryptData(req.body.data.id) },
      { accountId: encryptData(req.body.data.id) },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    // console.log(error.message);
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const addCompany = async (req, res) => {
  try {
    const company = new Company({
      name: req.body.name,
      country: req.body.country,
      state_province: req.body.state_province,
      uuid: req.body.uuid,
    });

    const data = await company.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding company", err });
  }
};

const addJobTitle = async (req, res) => {
  try {
    const job = new JobTitle({
      name: req.body.name,
      uuid: req.body.uuid,
    });

    const data = await job.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};

const addOrganization = async (req, res) => {
  try {
    const job = new Organizations({
      name: req.body.name,
      uuid: req.body.uuid,
    });

    const data = await job.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};

const addHobbies = async (req, res) => {
  try {
    const job = new Hobbies({
      name: req.body.name,
      uuid: req.body.uuid,
    });

    const data = await job.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};

const addVolunteer = async (req, res) => {
  try {
    const job = new Volunteer({
      name: req.body.name,
      uuid: req.body.uuid,
    });

    const data = await job.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};

const addCertification = async (req, res) => {
  try {
    const job = new Certifications({
      name: req.body.name,
      uuid: req.body.uuid,
    });

    const data = await job.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};

const addDegreesAndFields = async (req, res) => {
  try {
    const resp = new DegreeAndFieldOfStudy({
      name: req.body.name,
      uuid: req.body.uuid,
      type: req.body.type,
    });

    const data = await resp.save();
    res.status(200).json({ message: "Success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error occured while adding job title", err });
  }
};
const addPersonalBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;
    let updatedUserBadges;
    const foundKey = personalKeys.find((key) =>
      req.body.personal.hasOwnProperty(key)
    );
    const noEncDecKey = noEncDecPersonalKeys.find((key) =>
      req.body.personal.hasOwnProperty(key)
    );
    if (noEncDecKey) {
      updatedUserBadges = [
        ...userBadges,
        {
          personal: req.body.personal,
        },
      ];
      // // console.log(updatedUserBadges);
    } else {
      if (User.isPasswordEncryption) {
        if (!req.body.infoc)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        if (foundKey) {
          // Create an encrypted object with the found key
          const encryptedPersonal = {
            [foundKey]: userCustomizedEncryptData(
              encryptData(req.body.personal[foundKey]),
              eyk
            ),
          };

          // Update the user badges with the encrypted personal information
          updatedUserBadges = [
            ...userBadges,
            {
              personal: encryptedPersonal,
            },
          ];
          // // console.log(updatedUserBadges);
        } else {
          // Handle case where no key is found, if needed
          // console.log("No matching key found in personal object.");
        }
      } else {
        if (foundKey) {
          // Create an encrypted object with the found key
          const encryptedPersonal = {
            [foundKey]: encryptData(req.body.personal[foundKey]),
          };

          // Update the user badges with the encrypted personal information
          updatedUserBadges = [
            ...userBadges,
            {
              personal: encryptedPersonal,
            },
          ];
          // // console.log(updatedUserBadges);
        } else {
          // Handle case where no key is found, if needed
          // console.log("No matching key found in personal object.");
        }
      }
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: foundKey,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: foundKey,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    if (req.body.personal.dateOfBirth) {
      const dateOfBirth = new Date(req.body.personal.dateOfBirth);
      const today = new Date();

      let age = today.getFullYear() - dateOfBirth.getFullYear();
      const monthDiff = today.getMonth() - dateOfBirth.getMonth();
      const dayDiff = today.getDate() - dateOfBirth.getDate();

      // Adjust the age if the current month/day is before the birth month/day
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      // const formattedDateWithAge = `${dateOfBirth.toISOString().split('T')[0]}-${age}`;

      await SearchAge.findOneAndUpdate(
        { age: encryptData(age) },
        { age: encryptData(age) },
        { new: true, upsert: true }
      );
    }

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const removeAWorkEducationBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;

    // Find the index of the object to remove
    const indexToRemove = userBadges.findIndex((badge) => {
      return (
        badge.personal &&
        badge.personal[req.body.type] &&
        badge.personal[req.body.type].some((edu) => {
          // console.log(edu.id, req.body.id);
          return edu.id === req.body.id;
        })
      );
    });
    if (indexToRemove !== -1) {
      if (userBadges[indexToRemove].personal[req.body.type].length === 1) {
        userBadges.splice(indexToRemove, 1);
      } else {
        // Find the index of the education object within the found badge
        const educationIndexToRemove = userBadges[indexToRemove].personal[
          req.body.type
        ].findIndex((edu) => edu.id === req.body.id);

        if (educationIndexToRemove !== -1) {
          // Remove the education object from the array
          userBadges[indexToRemove].personal[req.body.type].splice(
            educationIndexToRemove,
            1
          );
        } else {
          throw new Error("Badge Not Found");
        }
      }
    } else {
      throw new Error("Badges Not Found");
    }
    User.badges = userBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "personal",
      });
    }

    User.markModified("badges");
    // Save the updated user document
    const data = await User.save();

    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    if (validTypes.includes(req.body.type)) {
      const UserBadges = data.badges.find(
        (badge) => badge?.personal && badge?.personal[req.body.type]
      );
      return res.status(200).json({
        data: UserBadges?.personal[req.body.type]
          ? UserBadges?.personal[req.body.type]
          : [],
        message: "Successful",
      });
    }

    res.status(200).json({ data, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
    });
  }
};

// const removeAWorkEducationBadge = async (req, res) => {
//   try {
//     const User = await UserModel.findOne({ uuid: req.body.uuid });
//     if (!User) throw new Error("No such User!");

//     const userBadges = User.badges;
//     let decryptedUserBadges;

//     if (User.isPasswordEncryption) {
//       if (!req.body.infoc) throw new Error("Please Provide Password");

//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(
//               userCustomizedDecryptData(item, req.body.infoc)
//             );
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     } else {
//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(item);
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     }

//     // Find the index of the object to remove
//     const indexToRemove = decryptedUserBadges.findIndex((badge) => {
//       return (
//         badge.personal &&
//         badge.personal[req.body.type] &&
//         badge.personal[req.body.type].some((edu) => {
//           //// console.log(edu.id, req.body.id);
//           return edu.id === req.body.id;
//         })
//       );
//     });
//     if (indexToRemove !== -1) {
//       if (userBadges[indexToRemove].personal[req.body.type].length === 1) {
//         userBadges.splice(indexToRemove, 1);
//       } else {
//         // Find the index of the education object within the found badge
//         const educationIndexToRemove = decryptedUserBadges[
//           indexToRemove
//         ].personal[req.body.type].findIndex((edu) => edu.id === req.body.id);

//         if (educationIndexToRemove !== -1) {
//           // Remove the education object from the array
//           userBadges[indexToRemove].personal[req.body.type].splice(
//             educationIndexToRemove,
//             1
//           );
//         } else {
//           throw new Error("Badge Not Found");
//         }
//       }
//     } else {
//       throw new Error("Badges Not Found");
//     }
//     User.badges = userBadges;
//     User.markModified("badges");
//     // Save the updated user document
//     const data = await User.save();
//     res.status(200).json({ data, message: "Successful" });
//   } catch (error) {
//     res.status(500).json({
//       message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
//     });
//   }
// };

// const getAWorkAndEducationBadge = async (req, res) => {
//   try {
//     const User = await UserModel.findOne({ uuid: req.body.uuid });
//     if (!User) throw new Error("No such User!");

//     const userBadges = User.badges;
//     let decryptedUserBadges;

//     if (User.isPasswordEncryption) {
//       if (!req.body.infoc) throw new Error("Please Provide Password");

//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(
//               userCustomizedDecryptData(item, req.body.infoc)
//             );
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     } else {
//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(item);
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     }

//     // Find the index of the object to remove
//     const index = decryptedUserBadges.findIndex((badge) => {
//       return (
//         badge.personal &&
//         badge.personal[req.body.type] &&
//         badge.personal[req.body.type].some((edu) => {
//           //// console.log(edu.id, req.body.id);
//           return edu.id === req.body.id;
//         })
//       );
//     });
//     let obj;
//     if (index !== -1) {
//       // Find the index of the education object within the found badge
//       const educationIndex = decryptedUserBadges[index].personal[
//         req.body.type
//       ].findIndex((edu) => edu.id === req.body.id);

//       if (educationIndex !== -1) {
//         // Remove the education object from the array
//         obj =
//           decryptedUserBadges[index].personal[req.body.type][educationIndex];
//       } else {
//         throw new Error("Badge Not Found");
//       }
//     } else {
//       throw new Error("Badges Not Found");
//     }

//     res.status(200).json({ obj, message: "Successful" });
//   } catch (error) {
//     res.status(500).json({
//       message: `An error occurred while fetching WorkEducationBadge: ${error.message}`,
//     });
//   }
// };

const getAWorkAndEducationBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;

    // Find the index of the object to remove
    const index = userBadges.findIndex((badge) => {
      return (
        badge.personal &&
        badge.personal[req.body.type] &&
        badge.personal[req.body.type].some((edu) => {
          // // console.log(edu.id, req.body.id);
          return edu.id === req.body.id;
        })
      );
    });
    let obj;
    if (index !== -1) {
      // Find the index of the education object within the found badge
      const educationIndex = userBadges[index].personal[
        req.body.type
      ].findIndex((edu) => edu.id === req.body.id);

      if (educationIndex !== -1) {
        // Remove the education object from the array
        obj = userBadges[index].personal[req.body.type][educationIndex];
      } else {
        throw new Error("Badge Not Found");
      }
    } else {
      throw new Error("Badges Not Found");
    }

    res.status(200).json({ obj, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
    });
  }
};

const getPersonalBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;

    // Find the index of the object to remove
    const index = userBadges.findIndex((badge) => {
      return badge.personal && badge.personal[req.body.type];
    });

    let obj;
    if (User.isPasswordEncryption) {
      if (!eyk) throw new Error("Please Provide Password");
      if (index !== -1) {
        // Find the index of the education object within the found badge
        if (personalKeys.includes(req.body.type)) {
          obj = decryptData(
            userCustomizedDecryptData(
              userBadges[index].personal[req.body.type],
              eyk
            )
          );
        } else {
          obj = userBadges[index].personal[req.body.type];
        }
      } else {
        throw new Error("Badges Not Found");
      }
    } else {
      if (index !== -1) {
        // Find the index of the education object within the found badge
        if (personalKeys.includes(req.body.type)) {
          obj = decryptData(userBadges[index].personal[req.body.type]);
        } else {
          obj = userBadges[index].personal[req.body.type];
        }
      } else {
        throw new Error("Badges Not Found");
      }
    }

    res.status(200).json({ obj, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeAWorkEducationBadge: ${error.message}`,
    });
  }
};

// const updateWorkAndEducationBadge = async (req, res) => {
//   try {
//     const User = await UserModel.findOne({ uuid: req.body.uuid });
//     if (!User) throw new Error("No such User!");

//     const userBadges = User.badges;
//     let decryptedUserBadges;

//     if (User.isPasswordEncryption) {
//       if (!req.body.infoc) throw new Error("Please Provide Password");

//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(
//               userCustomizedDecryptData(item, req.body.infoc)
//             );
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     } else {
//       decryptedUserBadges = userBadges.map((badge) => {
//         if (badge?.personal?.[req.body.type]) {
//           const decryptedItems = badge.personal[req.body.type].map((item) => {
//             const decryptedItem = decryptData(item);
//             return decryptedItem;
//           });

//           // Creating a new badge object to replace the personal type with decrypted items
//           return {
//             ...badge,
//             personal: {
//               ...badge.personal,
//               [req.body.type]: decryptedItems,
//             },
//           };
//         }

//         // If the condition does not match, return the badge unchanged
//         return badge;
//       });
//     }

//     // Find the index of the object
//     const index = decryptedUserBadges.findIndex((badge) => {
//       return (
//         badge.personal &&
//         badge.personal[req.body.type] &&
//         badge.personal[req.body.type].some((edu) => {
//           //// console.log(edu.id, req.body.id, "new");
//           return edu.id === req.body.id;
//         })
//       );
//     });
//     if (index !== -1) {
//       // Find the index of the education object within the found badge
//       const educationIndex = decryptedUserBadges[index].personal[
//         req.body.type
//       ].findIndex((edu) => edu.id === req.body.id);

//       if (educationIndex !== -1) {
//         if (User.isPasswordEncryption) {
//           if (!req.body.infoc)
//             throw new Error(
//               "No eyk Provided in request body, Request can't be proceeded."
//             );
//           // Overwrite the existing object with new data
//           userBadges[index].personal[req.body.type][educationIndex] =
//             userCustomizedEncryptData(
//               encryptData(req.body.newData),
//               req.body.infoc
//             );
//         } else {
//           userBadges[index].personal[req.body.type][educationIndex] =
//             encryptData(req.body.newData);
//         }

//         // Update the modified user document
//         User.badges = userBadges;
//         User.markModified("badges");
//         const data = await User.save();

//         return res
//           .status(200)
//           .json({ data, message: "Object updated successfully" });
//       } else {
//         throw new Error("Badge Not Found");
//       }
//     } else {
//       throw new Error("Badges Not Found");
//     }
//   } catch (error) {
//     res.status(500).json({
//       message: `An error occurred while updating the object: ${error.message}`,
//     });
//   }
// };

const updateWorkAndEducationBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;

    // Find the index of the object
    const index = userBadges.findIndex((badge) => {
      return (
        badge.personal &&
        badge.personal[req.body.type] &&
        badge.personal[req.body.type].some((edu) => {
          // // console.log(edu.id, req.body.id, "new");
          return edu.id === req.body.id;
        })
      );
    });
    if (index !== -1) {
      // Find the index of the education object within the found badge
      const educationIndex = userBadges[index].personal[
        req.body.type
      ].findIndex((edu) => edu.id === req.body.id);

      if (educationIndex !== -1) {
        // Overwrite the existing object with new data
        userBadges[index].personal[req.body.type][educationIndex] =
          req.body.newData;

        // Update the modified user document
        User.badges = userBadges;
        User.markModified("badges");
        const data = await User.save();

        if (validTypes.includes(req.body.type)) {
          const data = User.badges.find(
            (badge) => badge?.personal && badge?.personal[req.body.type]
          );
          return res.status(200).json({
            data: data?.personal[req.body.type]
              ? data?.personal[req.body.type]
              : [],
            message: "Successful",
          });
        }

        return res
          .status(200)
          .json({ data, message: "Object updated successfully" });
      } else {
        throw new Error("Badge Not Found");
      }
    } else {
      throw new Error("Badges Not Found");
    }
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while updating the object: ${error.message}`,
    });
  }
};

const addWorkEducationBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    const newData = req.body.data;
    const userBadges = User.badges;
    const eyk = req.body.infoc;

    const personalBadgeIndex = userBadges.findIndex(
      (badge) => badge.personal && badge.personal[req.body.type]
    );
    if (User.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      if (personalBadgeIndex !== -1) {
        User.badges[personalBadgeIndex].personal[req.body.type].push(newData);
        User.markModified("badges");
      } else {
        User.badges.push({
          personal: {
            [req.body.type]: [newData],
          },
        });
      }
    } else {
      if (personalBadgeIndex !== -1) {
        User.badges[personalBadgeIndex].personal[req.body.type].push(newData);
        User.markModified("badges");
      } else {
        User.badges.push({
          personal: { [req.body.type]: [newData] },
        });
      }
    }
    const data = await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Update the action

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.type,
      // txDescription : "Incentive for adding badges"
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    if (validTypes.includes(req.body.type)) {
      const data = User.badges.find(
        (badge) => badge?.personal && badge?.personal[req.body.type]
      );
      return res.status(200).json({
        data: data?.personal[req.body.type]
          ? data?.personal[req.body.type]
          : [],
        message: "Successful",
      });
    }

    res.status(200).json({ data, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};
const addWeb3Badge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;
    let updatedUserBadges;
    // if (User.isPasswordEncryption) {
    //   if (!eyk)
    //     throw new Error(
    //       "No eyk Provided in request body, Request can't be proceeded."
    //     );
    //   updatedUserBadges = [
    //     ...userBadges,
    //     {
    //       web3: userCustomizedEncryptData(encryptData(req.body.web3), eyk),
    //     },
    //   ];
    // } else {
    updatedUserBadges = [
      ...userBadges,
      {
        web3: req.body.web3 //encryptData(req.body.web3),
      },
    ];
    // }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: "ethereum-wallet",
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: "ethereum-wallet",
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addWeb3Badge: ${error.message}`,
    });
  }
};

const removePersonalBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    if (req.body.type === "identity") {
      const identityBadge = userBadges.find(
        (badge) => badge?.personal && badge?.personal?.identity
      );
      let identityBadgeIdentityNumber;
      if (req.body.infoc) {
        const unEncIdentity = decryptData(
          userCustomizedDecryptData(
            identityBadge?.personal?.identity,
            req.body.infoc
          )
        );
        identityBadgeIdentityNumber = unEncIdentity?.identityNumber;
      } else {
        const unEncIdentity = decryptData(identityBadge?.personal?.identity);
        identityBadgeIdentityNumber = unEncIdentity?.identityNumber;
      }
      // Making sure Identity exist already also gets deleted.
      const allDocuments = await SearchIdentity.find({});

      for (const doc of allDocuments) {
        const decryptedDoc = decryptData(doc.identity);
        if (decryptedDoc.identityNumber === identityBadgeIdentityNumber) {
          // Delete the matched document
          await SearchIdentity.findByIdAndDelete(doc._id);
          // console.log(`Identity document deleted from search index.`);
          break;
        }
      }
    }
    const updatedUserBadges =
      userBadges?.filter(
        (badge) => !badge?.personal?.hasOwnProperty(req.body.type)
      ) || [];
    // Update the user badges
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName && b.type === "personal"
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "personal",
      });
    }

    // Update the action
    await User.save();
    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPersonalBadge: ${error.message}`,
    });
  }
};

const removeWeb3Badge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter((badge) => {
      if (!badge.web3) {
        return badge;
      }
    });

    // Update the user badges

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "etherium-wallet",
      });
    }

    // Update the action
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPersonalBadge: ${error.message}`,
    });
  }
};

const updatePersonalBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const eyk = req.body.infoc;

    const userBadges = User.badges;

    const index = userBadges.findIndex((badge) => {
      return badge.personal && badge.personal[req.body.type];
    });

    if (index !== -1) {
      if (User.isPasswordEncryption) {
        if (!eyk)
          throw new Error(
            "No eyk Provided in request body, Request can't be proceeded."
          );
        if (personalKeys.includes(req.body.type)) {
          userBadges[index].personal[req.body.type] = userCustomizedEncryptData(
            encryptData(req.body.newData),
            eyk
          );
        } else {
          userBadges[index].personal[req.body.type] = req.body.newData;
        }
      } else {
        if (personalKeys.includes(req.body.type)) {
          userBadges[index].personal[req.body.type] = encryptData(
            req.body.newData
          );
        } else {
          userBadges[index].personal[req.body.type] = req.body.newData;
        }
      }
    } else {
      throw new Error("Badge Not Found");
    }
    // Update the user badges
    User.badges = userBadges;
    User.markModified("badges");
    const data = await User.save();

    res.status(200).json({ data, message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while updatePersonalBadge: ${error.message}`,
    });
  }
};

const removeBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { accountId: req.body.badgeAccountId } },
    });
    if (usersWithBadge.length === 0) throw new Error("Badge not exist!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter((item) => {
      if (item.accountId !== req.body.badgeAccountId) {
        return item;
      }
    });

    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "social",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger

    // // Create Ledger
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "User",
    //   txFrom: User.uuid,
    //   txTo: "dao",
    //   txAmount: "0",
    //   txData: User.badges[0]._id,
    //   // txDescription : "User adds a verification badge"
    // });
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "DAO",
    //   txFrom: "DAO Treasury",
    //   txTo: User.uuid,
    //   txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   // txData : newUser.badges[0]._id,
    //   // txDescription : "Incentive for adding badges"
    // });
    // // Decrement the Treasury
    // await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // // Increment the UserBalance
    // await updateUserBalance({
    //   uuid: User.uuid,
    //   amount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   inc: true,
    // });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const removeContactBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");
    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { type: req.body.type } },
    });
    if (usersWithBadge.length === 0) throw new Error("Badge not exist!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter((item) => {
      if (item.type !== req.body.type) {
        return item;
      }
    });

    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "contact",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger

    // // Create Ledger
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "User",
    //   txFrom: User.uuid,
    //   txTo: "dao",
    //   txAmount: "0",
    //   txData: User.badges[0]._id,
    //   // txDescription : "User adds a verification badge"
    // });
    // await createLedger({
    //   uuid: User.uuid,
    //   txUserAction: "accountBadgeAdded",
    //   txID: crypto.randomBytes(11).toString("hex"),
    //   txAuth: "DAO",
    //   txFrom: "DAO Treasury",
    //   txTo: User.uuid,
    //   txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   // txData : newUser.badges[0]._id,
    //   // txDescription : "Incentive for adding badges"
    // });
    // // Decrement the Treasury
    // await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // // Increment the UserBalance
    // await updateUserBalance({
    //   uuid: User.uuid,
    //   amount: ACCOUNT_BADGE_ADDED_AMOUNT,
    //   inc: true,
    // });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addSocialBadge: ${error.message}`,
    });
  }
};

const sendVerifyEmail = async ({ email, uuid, type }) => {
  try {
    const verificationTokenFull = jwt.sign({ uuid, email, type }, JWT_SECRET, {
      expiresIn: "10m",
    });
    const verificationToken = verificationTokenFull.substr(
      verificationTokenFull.length - 6
    );

    // const verificationToken = user.generateVerificationToken();
    //// console.log("verificationToken", verificationToken);

    // Step 3 - Email the user a unique verification link
    // const url = `${FRONTEND_URL}/VerifyCode?token=${verificationTokenFull}&badge=true`;
    const url = `${FRONTEND_URL}/badgeverifycode?token=${verificationTokenFull}&badge=true`;

    const SES_CONFIG = {
      region: process.env.AWS_SES_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };
    // Create SES service object
    //// console.log("before sesClient", SES_CONFIG);

    const sesClient = new AWS.SES(SES_CONFIG);

    let params = {
      Source: process.env.AWS_SES_SENDER,
      Destination: {
        ToAddresses: [email],
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `Click <a href = '${url}'>here</a> to confirm your email <br /> <br /> <br />
                   And confirm this code <b>${verificationToken}</b> from the App`,
          },
          Text: {
            Charset: "UTF-8",
            Data: "Verify Accountt",
          },
        },

        Subject: {
          Charset: "UTF-8",
          Data: "Verify Account",
        },
      },
    };

    try {
      const emailRes = await sesClient.sendEmail(params).promise();
      return emailRes;
    } catch (error) {
      //// console.log(error);
    }

    // return res.status(200).send({
    //   message: `Sent a verification email to ${email}`,
    // });
  } catch (error) {
    // console.error(error.message);
    // res.status(500).json({
    //   message: `An error occurred while sendVerifyEmail Auth: ${error.message}`,
    // });
  }
};

const addContactBadgeVerify = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, JWT_SECRET);

    const User = await UserModel.findOne({ uuid: decodedToken.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { email: decodedToken.email } },
    });
    // Find the User Email
    const usersWithEmail = await UserModel.find({
      email: decodedToken.email,
    });
    if (usersWithBadge.length !== 0 || usersWithEmail.length !== 0)
      throw new Error("Badge already exist");

    // const userBadges = User.badges;
    // const updatedUserBadges = [
    //   ...userBadges,
    //   {
    //     email: decodedToken.email,
    //     isVerified: false,
    //     type: decodedToken.type,
    //   },
    // ];
    // // Update the user badges
    // User.badges = updatedUserBadges;
    // // Update the action
    // await User.save();

    return res.status(200).json({ message: "Continue" });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const addContactBadgeAdd = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, JWT_SECRET);

    const User = await UserModel.findOne({ uuid: decodedToken.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: { $elemMatch: { email: decodedToken.email } },
    });
    // Find the User Email
    const usersWithEmail = await UserModel.find({
      email: decodedToken.email,
    });
    //// console.log("wamiq", usersWithBadge);
    if (usersWithBadge.length !== 0 || usersWithEmail.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;
    const updatedUserBadges = [
      ...userBadges,
      {
        email: decodedToken.email,
        isVerified: true,
        type: decodedToken.type,
      },
    ];
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();

    await SearchEmail.findOneAndUpdate(
      { email: encryptData(decodedToken.email) },
      { email: encryptData(decodedToken.email) },
      { new: true, upsert: true }
    );

    res.status(200).json({ ...User._doc });
  } catch (error) {
    return res.status(500).json({
      // message: error.message,
      message: `An error occurred while addContactBadge: ${error.message}`,
    });
  }
};

const addPasskeyBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;
    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!req.body.eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          data: userCustomizedEncryptData(encryptData(req.body.data), eyk),
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          data: encryptData(req.body.data),
        },
      ];
    }
    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();
    // const userBadges = User.badges;
    // const updatedUserBadges = [
    //   ...userBadges,
    //   {
    //     passKey: req.body.passKey,
    //   },
    // ];
    // // Update the user badges
    // User.badges = updatedUserBadges;
    // // Update the action
    // await User.save();

    const txID = crypto.randomBytes(11).toString("hex");

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: User.badges[0]._id,
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPassKeyBadge: ${error.message}`,
    });
  }
};

const addFarCasterBadge = async (req, res) => {
  try {
    // Treasury Check
    const checkTreasury = await Treasury.findOne();
    if (!checkTreasury)
      return res.status(404).json({ message: "Treasury is not found." });
    if (
      Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
      Math.round(checkTreasury.amount) <= 0
    )
      return res.status(404).json({ message: "Treasury is not enough." });

    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    // Find the Badge
    const usersWithBadge = await UserModel.find({
      badges: {
        $elemMatch: {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
        },
      },
    });
    if (usersWithBadge.length !== 0)
      throw new Error("Oops! This account is already linked.");

    const userBadges = User.badges;
    let updatedUserBadges;
    if (User.isPasswordEncryption) {
      if (!req.body.eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          fid: req.body.data.fid,
          data: userCustomizedEncryptData(
            encryptData(req.body.data),
            req.body.eyk
          ),
        },
      ];
    } else {
      updatedUserBadges = [
        ...userBadges,
        {
          accountId: req.body.accountId,
          accountName: req.body.accountName,
          isVerified: req.body.isVerified,
          type: req.body.type,
          fid: req.body.data.fid,
          data: encryptData(req.body.data),
        },
      ];
    }

    // Update the user badges
    User.badges = updatedUserBadges;
    // Update the action
    await User.save();
    // const userBadges = User.badges;
    // const updatedUserBadges = [
    //   ...userBadges,
    //   {
    //     passKey: req.body.passKey,
    //   },
    // ];
    // // Update the user badges
    // User.badges = updatedUserBadges;
    // // Update the action
    // await User.save();

    const txID = crypto.randomBytes(11).toString("hex");
    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: User.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: req.body.type,
    });
    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });

    User.fdxEarned = User.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    User.rewardSchedual.addingBadgeFdx =
      User.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await User.save();

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addFarCasterBadge: ${error.message}`,
    });
  }
};

const removePasskeyBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter(
      (badge) =>
        badge.accountName !== req.body.accountName ||
        badge.type !== req.body.type
    );
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "web3",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while addPersonalBadge: ${error.message}`,
    });
  }
};

const removeFarCasterBadge = async (req, res) => {
  try {
    const User = await UserModel.findOne({ uuid: req.body.uuid });
    if (!User) throw new Error("No such User!");

    const userBadges = User.badges;
    const updatedUserBadges = userBadges.filter(
      (badge) =>
        badge.accountName !== req.body.accountName ||
        badge.type !== req.body.type
    );
    // Update the user badges
    User.badges = updatedUserBadges;

    // Find if badgeName already exists in badgeRemoved array
    const badgeIndex = User.badgeRemoved.findIndex(
      (b) => b.badgeName === req.body.badgeName
    );

    if (badgeIndex !== -1) {
      // If badgeName exists, update the deletedAt
      User.badgeRemoved[badgeIndex].deletedAt = new Date();
    } else {
      // If badgeName does not exist, create a new entry
      User.badgeRemoved.push({
        badgeName: req.body.badgeName,
        deletedAt: new Date(),
        type: "social",
      });
    }

    // Update the action
    await User.save();

    // Create Ledger
    await createLedger({
      uuid: User.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: User.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: User.badges[0]._id,
      // txDescription : "User adds a verification badge"
    });

    res.status(200).json({ message: "Successful" });
  } catch (error) {
    res.status(500).json({
      message: `An error occurred while removeFarCasterBadge: ${error.message}`,
    });
  }
};

const addPseudoBadge = async (req, res) => {
  try {
    const user = await User.findOne({
      uuid: req.body.uuid,
    });
    if (!user) {
      throw new Error("No such User");
    }
    const userBadges = user.badges;
    let updatedUserBadges;
    updatedUserBadges = [
      ...userBadges,
      {
        pseudo: true,
      },
    ];
    user.badges = updatedUserBadges;
    await user.save();

    res.status(200).json({ message: "Successful" });
  } catch (err) {
    // console.log(err);
  }
};

const removePseudoBadge = async (req, res) => {
  try {
    const user = await User.findOne({
      uuid: req.body.uuid,
    });
    const index = user.badges.findIndex((badge) => badge.pseudo !== undefined);
    // If index is found, remove the badge with legacy key
    if (index !== -1) {
      user.badges.splice(index, 1);
    }

    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    await user.save();

    res.status(200).json({
      message: `Pseudo Badge removed`,
      data: user,
    });
  } catch (err) {
    // console.log(err);
  }
};

const addDomainBadge = async (req, res) => {
  try {
    if (!req.body.update) {
      const domainAlreadyExist = await User.findOne({
        badges: {
          $elemMatch: {
            "domain.name": req.body.name,
            domain: { $exists: true, $ne: null }, // Ensure domain exists and is not null
          },
        },
      });
      if (domainAlreadyExist)
        return res
          .status(403)
          .json({ message: `Domain: ${req.body.name}, Already exist.` });
    }
    if (req.body.update) {
      const domainAlreadyExist = await User.findOne({
        uuid: { $ne: req.body.uuid },
        badges: {
          $elemMatch: {
            "domain.name": req.body.name,
            domain: { $exists: true, $ne: null }, // Ensure domain exists and is not null
          },
        },
      });
      if (domainAlreadyExist)
        return res
          .status(403)
          .json({ message: `Domain: ${req.body.name}, Already exist.` });
    }

    const user = await User.findOne({
      uuid: req.body.uuid,
    });

    if (!user) {
      throw new Error("No such User");
    }
    const userBadges = user.badges;
    let updatedUserBadges = [...userBadges];
    let existingBadgeIndex = null;
    let s3Urls = [];
    let coordinates = [req.files.coordinate16x9, req.files.coordinate1x1];

    // Check if the badge with the given domain already exists
    if (req.body.update) {
      existingBadgeIndex = updatedUserBadges.findIndex((badge) => badge.domain);
    }

    if (req.files.file1x1 || req.files.file16x9) {
      const folderName = user.uuid;
      // const outputDir = path.join(__dirname, folderName);

      // Ensure the output directory exists
      // if (!fs.existsSync(outputDir)) {
      //   fs.mkdirSync(outputDir, { recursive: true });
      // }

      // Get the current ISO timestamp
      const isoDateString = new Date().toISOString().replace(/[:.-]/g, "");

      // Process each file and create the appropriate output filenames
      // await Promise.all(req.files.map(async (file) => {
      // const ext = path.extname(file.path); // Get the file extension

      // let outputFileName;
      // if (files[0].originalname === 'croppedImage.png') {
      //   outputFileName = `${isoDateString}-1x1${ext}`; // For croppedImage
      // } else {
      //   outputFileName = `${isoDateString}-16x9${ext}`; // For other images
      // }

      // const outputFile = path.join(outputDir, outputFileName);

      // // Save the image to the output directory without resizing
      // await sharp(file.path).toFile(outputFile);
      // }));

      const s3RootFolder = `domain/${folderName}`;
      // await deleteDirectoryFromS3(s3RootFolder);

      // Initialize s3Urls with null placeholders for consistent indexing

      if (!req.files.file1x1 && !req.files.file16x9) {
        // Case 1: Both file1x1 and file16x9 are missing
        s3Urls = updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls
          ? updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls
          : [];
      } else if (!req.files.file1x1 && req.files.file16x9) {
        // Case 2: file1x1 is missing, but file16x9 exists
        // console.log("file1x1 is missing, but file16x9 exists.");
        s3Urls[0] = updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[0]
          ? updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[0]
          : "";
        if (updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[1]) {
          MODE === "PROD" &&
            (await deleteFileFromS3(
              updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[1]
            ));
        }
        s3Urls[1] =
          MODE === "PROD"
            ? (
              await uploadFileToS3FromBuffer(
                req.files.file16x9[0].buffer,
                `${isoDateString}-16x9`,
                s3RootFolder
              )
            ).Location
            : "";
        coordinates[0] = JSON.parse(req.body.coordinate16x9);
      } else if (req.files.file1x1 && !req.files.file16x9) {
        // Case 3: file1x1 exists, but file16x9 is missing
        // console.log("file1x1 exists, but file16x9 is missing.");
        if (updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[0]) {
          MODE === "PROD" &&
            (await deleteFileFromS3(
              updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[0]
            ));
        }
        s3Urls[0] =
          MODE === "PROD"
            ? (
              await uploadFileToS3FromBuffer(
                req.files.file1x1[0].buffer,
                `${isoDateString}-1x1`,
                s3RootFolder
              )
            ).Location
            : "";
        s3Urls[1] = updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[1]
          ? updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[1]
          : "";
        coordinates[1] = JSON.parse(req.body.coordinate1x1);
      } else {
        // Case 4: Both file1x1 and file16x9 exist
        // console.log("Both file1x1 and file16x9 exist.");
        if (
          updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[0] &&
          updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[1]
        ) {
          MODE === "PROD" &&
            (await deleteFileFromS3(
              updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[0]
            ));
          MODE === "PROD" &&
            (await deleteFileFromS3(
              updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[1]
            ));
        }
        s3Urls[0] =
          MODE === "PROD"
            ? (
              await uploadFileToS3FromBuffer(
                req.files.file1x1[0].buffer,
                `${isoDateString}-1x1`,
                s3RootFolder
              )
            ).Location
            : "";
        s3Urls[1] =
          MODE === "PROD"
            ? (
              await uploadFileToS3FromBuffer(
                req.files.file16x9[0].buffer,
                `${isoDateString}-16x9`,
                s3RootFolder
              )
            ).Location
            : "";
        coordinates[0] = JSON.parse(req.body.coordinate16x9);
        coordinates[1] = JSON.parse(req.body.coordinate1x1);
      }

      if (req.files.originalFile) {
        if (updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[2]) {
          MODE === "PROD" &&
            (await deleteFileFromS3(
              updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[2]
            ));
        }
        s3Urls[2] =
          MODE === "PROD"
            ? (
              await uploadFileToS3FromBuffer(
                req.files.originalFile[0].buffer,
                `${isoDateString}-originalFile`,
                s3RootFolder
              )
            ).Location
            : "";
      } else {
        s3Urls[2] = updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[2]
          ? updatedUserBadges[existingBadgeIndex]?.domain?.s3Urls[2]
          : "";
      }

      // Delay before deleting the original file from the filesystem after processing
      // req.files.forEach(file => {
      //   fs.unlink(file.path, (err) => {
      //     if (err) {
      //       // console.error(`Error deleting file: ${file.path}`, err);
      //     } else {
      //       // console.log(`File deleted: ${file.path}`);
      //     }
      //   });
      // });

      // Delete the output directory and its contents
      // await fs.promises.rm(outputDir, { recursive: true });
      // // console.log(`Directory deleted: ${outputDir}`);
    }

    // If the badge already exists and update is true, update it
    if (existingBadgeIndex && existingBadgeIndex !== -1) {
      updatedUserBadges[existingBadgeIndex] = {
        domain: {
          name:
            req.body.name || updatedUserBadges[existingBadgeIndex].domain.name,
          s3Urls:
            s3Urls.length > 0
              ? s3Urls
              : updatedUserBadges[existingBadgeIndex].domain.s3Urls,
          title:
            req.body.title ||
            updatedUserBadges[existingBadgeIndex].domain.title,
          description:
            req.body.description ||
            updatedUserBadges[existingBadgeIndex].domain.description,
          viewers: updatedUserBadges[existingBadgeIndex].domain.viewers,
          coordinates: coordinates,
        },
      };

      // Domain SEO
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName:
            req.body.name || updatedUserBadges[existingBadgeIndex].domain.name,
          description:
            req.body.description ||
            updatedUserBadges[existingBadgeIndex].domain.description,
          route: "static_pages/homepage",
          title:
            req.body.title ||
            updatedUserBadges[existingBadgeIndex].domain.title,
          domainS3Urls:
            s3Urls.length > 0
              ? s3Urls
              : updatedUserBadges[existingBadgeIndex].domain.s3Urls,
          serviceType: "homepage",
        });
      }
    } else {
      // If it does not exist or update is not true, push a new badge
      updatedUserBadges.push({
        domain: {
          name: req.body.name,
          s3Urls: s3Urls.length > 0 ? s3Urls : [],
          title: req.body.title,
          description: req.body.description,
          viewers: [],
          coordinates: coordinates,
        },
      });

      // Domain SEO
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: req.body.name,
          description: req.body.description,
          route: "static_pages/homepage",
          title: req.body.title,
          domainS3Urls: s3Urls.length > 0 ? s3Urls : [],
          serviceType: "homepage",
        });
      }

      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: "domain",
      });
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: user.uuid,
        txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
        txData: "domain",
      });

      // Decrement the Treasury
      await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

      // Increment the UserBalance
      await updateUserBalance({
        uuid: user.uuid,
        amount: ACCOUNT_BADGE_ADDED_AMOUNT,
        inc: true,
      });

      user.fdxEarned = user.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
      user.rewardSchedual.addingBadgeFdx =
        user.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
      await user.save();
    }
    user.badges = updatedUserBadges;
    await user.save();
    res.status(200).json({
      message: "Successful",
      domain: user.badges.find((badge) => badge.domain),
    });
  } catch (err) {
    // console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const removeDomainBadge = async (req, res) => {
  try {
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
          ArticleSetting.updateOne(
            { _id: spotLightArticle._id },
            { $set: { spotLight: false } }
          )
        );
      }

      // Update spotLight for the quest if it exists
      if (spotLightInfoQuest) {
        updateSpotLightPromises.push(
          UserQuestSetting.updateOne(
            { _id: spotLightInfoQuest._id },
            { $set: { spotLight: false } }
          )
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

    const user = await User.findOne({
      uuid: req.body.uuid,
    });
    const index = user.badges.findIndex((badge) => badge.domain !== undefined);
    // If index is found, remove the badge with legacy key
    if (index !== -1) {
      user.badges.splice(index, 1);
    }

    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeRemoved",
      txID: crypto.randomBytes(11).toString("hex"),
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: req.body.type,
      // txDescription : "User adds a verification badge"
    });

    await user.save();
    await deleteDirectoryFromS3(`domain/${user.uuid}`);

    res.status(200).json({
      message: `Domain Badge removed`,
      data: user,
    });
  } catch (err) {
    // console.log(err);
  }
};

const location = async (req, res) => {
  try {
    const { uuid, location } = req.body;

    // Check if the location is defined and is a string
    if (!location || typeof location !== "string") {
      return res.status(400).json({ message: "Invalid location provided." });
    }

    const result = await User.findOneAndUpdate(
      {
        uuid: uuid,
        "badges.personal.geolocation": { $exists: true },
      },
      {
        $addToSet: {
          "badges.$.personal.locations": location, // This adds to the locations array
        },
      },
      {
        new: true,
      }
    );

    if (!result) {
      return res.status(404).json({
        message: "No badge with geolocation found or location already exists.",
      });
    }

    return res.status(200).json({ message: "Location updated successfully" });
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const linkhubInc = async (req, res) => {
  try {
    const { domainName, badgeLinkId, viewerUuid } = req.body;
    const viewedAt = new Date();

    // Find the user with the specified domain name in badges
    const userByDomain = await UserModel.findOne({
      badges: {
        $elemMatch: {
          "domain.name": domainName,
          domain: { $exists: true, $ne: null },
        },
      },
    });

    // Check if the viewerUuid is different from the user's uuid
    if (userByDomain && userByDomain.uuid !== viewerUuid) {
      // Find the correct badge with linkHub array
      const badge = userByDomain.badges.find(
        (badge) => badge.personal && badge.personal.linkHub
      );

      if (badge) {
        // Find and update the specific link within badges.personal.linkHub
        const updateResult = await UserModel.updateOne(
          { "badges.personal.linkHub.id": badgeLinkId },
          {
            $push: {
              "badges.$[badge].personal.linkHub.$[link].viewerCount": {
                viewedAt,
                viewerUuid,
              },
            },
          },
          {
            arrayFilters: [
              { "badge.personal.linkHub": { $exists: true } },
              { "link.id": badgeLinkId },
            ],
          }
        );

        // Check if the update was successful
        if (updateResult.modifiedCount > 0) {
          return res.status(200).json({ message: "Viewer added." });
        } else {
          return res.status(404).json({ message: "Link not found." });
        }
      } else {
        return res.status(404).json({ message: "Badge or linkHub not found." });
      }
    } else {
      return res
        .status(200)
        .json({ message: "Viewing from your own profile." });
    }
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateBadgeDataArray = async (req, res) => {
  try {
    const { type, data, uuid } = req.body;

    // Validate input
    if (!type || !Array.isArray(data)) {
      return res
        .status(400)
        .json({ message: "Invalid input: 'type' and 'data' are required." });
    }

    // Define valid types and map them to corresponding `badges.personal` fields
    const validTypes = ["linkHub", "work", "education"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid type. Allowed types are: ${validTypes.join(", ")}.`,
      });
    }

    // Update operation
    const updateResult = await UserModel.findOneAndUpdate(
      {
        uuid: uuid,
        [`badges.personal.${type}`]: { $exists: true },
      },
      {
        $set: { [`badges.$[badge].personal.${type}`]: data },
      },
      {
        arrayFilters: [
          {
            "badge.personal": { $exists: true },
            [`badge.personal.${type}`]: { $exists: true },
          },
        ],
      }
    );

    // Check if any documents were updated
    if (updateResult) {
      return res.status(200).json({
        message: `${type} array updated successfully.`,
        updatedCount: updateResult.modifiedCount,
      });
    } else {
      return res
        .status(404)
        .json({ message: `No badges found with ${type} to update.` });
    }
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addPasswordBadgesUpdate = async (req, res) => {
  try {
    const { uuid, eyk } = req.body;
    const user = await User.findOne({
      uuid: uuid,
    });

    if (user.isPasswordEncryption) {
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );

      // // console.log("Remove Legacy Encryption!");

      // As Legacy Password is added so we need to Remove it.
      user.badges.forEach((badge) => {
        if (
          badge.legacy ||
          badge.accountName === "Email" ||
          (badge.type === "work" && !badge.details) ||
          (badge.type === "education" && !badge.details) ||
          badge.pseudo ||
          badge.domain ||
          badge.personal?.linkHub ||
          badge.web3
        ) {
          return;
        } else if (badge.type && badge.type === "cell-phone") {
          badge.details = userCustomizedDecryptData(badge.details, eyk);
        } else if (
          badge.type &&
          ["work", "education", "personal", "social", "default"].includes(
            badge.type
          )
        ) {
          badge.details = userCustomizedDecryptData(badge.details, eyk);
        } else if (
          badge.accountName &&
          [
            "facebook",
            "linkedin",
            "twitter",
            "instagram",
            "github",
            "Email",
            "google",
          ].includes(badge.accountName)
        ) {
          badge.details = userCustomizedDecryptData(badge.details, eyk);
        }
        // else if (badge.personal && badge.personal.work) {
        //   badge.personal.work = badge.personal.work.map((item) =>
        //     userCustomizedDecryptData(item, eyk)
        //   );
        // }
        else if (badge.personal) {
          const decryptedPersonal = badge.personal;
          for (const key of personalKeys) {
            if (badge.personal.hasOwnProperty(key)) {
              decryptedPersonal[key] = userCustomizedDecryptData(
                badge.personal[key],
                eyk
              );
            }
          }
          badge.personal = decryptedPersonal;
        } else if (badge.web3) {
          badge.web3 = userCustomizedDecryptData(badge.web3, eyk);
        } else if (
          badge.type &&
          ["desktop", "mobile", "farcaster"].includes(badge.type)
        ) {
          badge.data = userCustomizedDecryptData(badge.data, eyk);
        }
      });

      // Find the index of badges with legacy key
      const index = user.badges.findIndex(
        (badge) => badge.legacy !== undefined
      );
      // If index is found, remove the badge with legacy key
      if (index !== -1) {
        user.badges.splice(index, 1);
      }
      user.isPasswordEncryption = false;

      // Find if badgeName already exists in badgeRemoved array
      const badgeIndex = user.badgeRemoved.findIndex(
        (b) => b.badgeName === req.body.badgeName
      );

      if (badgeIndex !== -1) {
        // If badgeName exists, update the deletedAt
        user.badgeRemoved[badgeIndex].deletedAt = new Date();
      } else {
        // If badgeName does not exist, create a new entry
        user.badgeRemoved.push({
          badgeName: req.body.badgeName,
          deletedAt: new Date(),
          type: "password",
        });
      }
      await user.save();

      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeRemoved",
        txID: crypto.randomBytes(11).toString("hex"),
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: "legacy",
        // txDescription : "User adds a verification badge"
      });
      res.status(200).json({
        message: `User's customized password decryption is removed successful.`,
        data: user,
      });
    } else if (!user.isPasswordEncryption) {
      // // console.log("Apply Legacy Encryption!");

      // Treasury Check
      const checkTreasury = await Treasury.findOne();
      if (!checkTreasury)
        return res.status(404).json({ message: "Treasury is not found." });
      if (
        Math.round(checkTreasury.amount) <= ACCOUNT_BADGE_ADDED_AMOUNT ||
        Math.round(checkTreasury.amount) <= 0
      )
        return res.status(404).json({ message: "Treasury is not enough." });

      // As Legacy Password is removed so we need to Add it.
      user.badges.forEach((badge) => {
        if (
          badge.legacy ||
          badge.accountName === "Email" ||
          (badge.type === "work" && !badge.details) ||
          (badge.type === "education" && !badge.details) ||
          badge.pseudo ||
          badge.domain ||
          badge.personal?.linkHub ||
          badge.web3
        ) {
          return;
        } else if (badge.type && badge.type === "cell-phone") {
          badge.details = userCustomizedEncryptData(badge.details, eyk);
        } else if (
          badge.type &&
          ["work", "education", "personal", "social", "default"].includes(
            badge.type
          )
        ) {
          badge.details = userCustomizedEncryptData(badge.details, eyk);
        } else if (
          badge.accountName &&
          [
            "facebook",
            "linkedin",
            "twitter",
            "instagram",
            "github",
            "Email",
            "google",
          ].includes(badge.accountName)
        ) {
          badge.details = userCustomizedEncryptData(badge.details, eyk);
        }
        // else if (badge.personal && badge.personal.work) {
        //   badge.personal.work = badge.personal.work.map((item) =>
        //     userCustomizedEncryptData(item, eyk)
        //   );
        // }
        else if (badge.personal) {
          const encryptedPersonal = badge.personal;
          for (const key of personalKeys) {
            if (badge.personal.hasOwnProperty(key)) {
              encryptedPersonal[key] = userCustomizedEncryptData(
                badge.personal[key],
                eyk
              );
            }
          }
          badge.personal = encryptedPersonal;
        } else if (badge.web3) {
          badge.web3 = userCustomizedEncryptData(badge.web3, eyk);
        } else if (
          badge.type &&
          ["desktop", "mobile", "farcaster"].includes(badge.type)
        ) {
          badge.data = userCustomizedEncryptData(badge.data, eyk);
        }
      });
      if (!eyk)
        throw new Error(
          "No eyk Provided in request body, Request can't be proceeded."
        );
      const userBadges = user.badges;
      let updatedUserBadges;
      updatedUserBadges = [
        ...userBadges,
        {
          legacy: true,
        },
      ];
      user.badges = updatedUserBadges;
      user.isPasswordEncryption = true;
      await user.save();
      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "User",
        txFrom: user.uuid,
        txTo: "dao",
        txAmount: "0",
        txData: "legacy",
        // txDescription : "User adds a verification badge"
      });
      await createLedger({
        uuid: user.uuid,
        txUserAction: "accountBadgeAdded",
        txID: txID,
        txAuth: "DAO",
        txFrom: "DAO Treasury",
        txTo: user.uuid,
        txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
        txData: "legacy",
        // txDescription : "Incentive for adding badges"
      });
      // Decrement the Treasury
      await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

      // Increment the UserBalance
      await updateUserBalance({
        uuid: user.uuid,
        amount: ACCOUNT_BADGE_ADDED_AMOUNT,
        inc: true,
      });

      user.fdxEarned = user.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
      user.rewardSchedual.addingBadgeFdx =
        user.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
      await user.save();

      res.status(200).json({
        message: `User's customized password encryption is added successful.`,
        data: user,
      });
    }
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while processing your security badge: ${error.message}`,
    });
  }
};

const verifyIdentity = async (req, res) => {
  try {
    // Retrieve uploaded files from req.files
    const frontImage = req.files["frontImage"]
      ? req.files["frontImage"][0]
      : null;
    const backImage = req.files["backImage"] ? req.files["backImage"][0] : null;
    const video = req.files["video"] ? req.files["video"][0] : null;

    // Validate that files are present
    if (!frontImage || !backImage || !video) {
      return res.status(400).json({ error: "Missing one or more files." });
    }

    // // Step base: Validate if the front and back images are official documents
    // const isOfficial = await validateDocumentImages(frontImage.buffer, backImage.buffer);

    // if (!isOfficial) {
    //   return res.status(400).json({ error: 'Uploaded images are not valid official documents.' });
    // }

    // Step Act: Compare the extracted faceBuffer with the video frame
    const isFaceMatched = await compareFacesInImages(frontImage.buffer, video);

    if (isFaceMatched.match) {
      // Proceed to add the badge
      return res.status(200).json({
        message: "Identity varified successfully.",
        data: isFaceMatched,
      });
    } else if (!isFaceMatched.match) {
      // Cancle add the badge
      return res
        .status(403)
        .json({ message: "Identity is not verified.", data: null });
    } else {
      return res
        .status(400)
        .json({ error: "Face match failed. Cannot add badge." });
    }
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ error: "Something went wrong." });
  }
};

const addIdentityBadge = async (req, res) => {
  try {
    const { uuid, match, matchPercentage, text } = req.body;
    const eyk = req.body.infoc;

    // Find the user by their UUID
    const user = await User.findOne({ uuid: uuid });
    if (user?.badges) {
      user.badges = user.badges.filter((badge) => !badge?.personal?.identity);
      await user.save();
    }

    const prompt = `
    Providing JSON data in response only, please extract all data found in the document text dynamically. Only provide a single expiry date if it exists, and it must be in the future. If "Expiry", "Date of Expiry", or "Expiry Date" exists and the date is in the past, include "isExpired": true; otherwise, "isExpired": false.
    
    Here is the text: ${text}
    
    Only provide JSON data, no extra content, not even any kind of quotes, just the JSON object.
    `;

    const data = await genericOpenAi(prompt);
    const identity = JSON.parse(data);
    if (identity.isExpired)
      return res
        .status(403)
        .json({ message: "Provided identity is expired.", data: null });

    let identityBadge;

    if (user?.isPasswordEncryption) {
      if (!eyk)
        return res.status(403).json({ message: "No password provided" });
      identityBadge = {
        personal: {
          identity: userCustomizedEncryptData(encryptData(identity), eyk),
        },
      };
    } else {
      identityBadge = {
        personal: {
          identity: encryptData(identity),
        },
      };
    }

    // Making sure Identity not exist already
    const allDocuments = await SearchIdentity.find({});
    const matched = allDocuments.some((doc) => {
      const decryptedDoc = decryptData(doc.identity);
      return decryptedDoc.identityNumber === identity.identityNumber;
    });
    if (matched)
      return res
        .status(403)
        .json({ message: "Identity already exists.", data: null });

    await SearchIdentity.findOneAndUpdate(
      { identity: encryptData(identity) },
      { identity: encryptData(identity) },
      { new: true, upsert: true }
    ).exec();

    if (!user)
      return res.status(404).json({ message: "No user found.", data: null });
    user?.badges.push(identityBadge);
    await user.save();

    // Create Ledger
    const txID = crypto.randomBytes(11).toString("hex");
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: "Stripe",
    });
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: user.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: "Stripe",
    });

    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: user.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });
    user.fdxEarned = user.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    user.rewardSchedual.addingBadgeFdx =
      user.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await user.save();

    return res
      .status(200)
      .json({ message: "Badge added successfully", data: user });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ error: "Something went wrong." });
  }
};

const updateIdentityBadge = async (req, res) => {
  try {
    const identityBadge = req.body.identityBadge;
    const eyk = req.body.infoc;
    // Find the user by their UUID
    const user = await User.findOne({ uuid: uuid });
    if (!user)
      return res.status(404).json({ message: "No user found.", data: null });

    // Replace the existing identity badge if it exists
    const badgeIndex = user.badges.findIndex(
      (badge) => badge?.personal && badge?.personal?.identity
    ); // Match based on ID or another unique field

    if (user?.isPasswordEncryption) {
      if (!eyk)
        return res.status(403).json({ message: "No password provided" });
      if (badgeIndex !== -1) {
        // If the badge exists, replace it
        user.badges[badgeIndex].personal = {
          identity: userCustomizedEncryptData(
            encryptData({ ...identityBadge }),
            eyk
          ),
        };
      } else {
        // If no existing badge, push the new badge
        user.badges.push({
          personal: {
            identity: userCustomizedEncryptData(
              encryptData(identityBadge),
              eyk
            ),
          },
        });
      }
    } else {
      if (badgeIndex !== -1) {
        // If the badge exists, replace it
        user.badges[badgeIndex].personal = {
          identity: encryptData({ ...identityBadge }),
        };
      } else {
        // If no existing badge, push the new badge
        user.badges.push({
          personal: {
            identity: encryptData(identityBadge),
          },
        });
      }
    }

    await user.save();

    return res
      .status(200)
      .json({ message: "Badge updated successfully", data: user });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ error: "Something went wrong." });
  }
};

const removeIdentityBadge = async (req, res) => {
  try {
    const { uuid } = req.query;

    // Find the user by their UUID
    const user = await User.findOne({ uuid: uuid });
    if (!user)
      return res.status(404).json({ message: "No user found.", data: null });

    // Find the badge index where the identity exists
    const badgeIndex = user.badges.findIndex(
      (badge) => badge?.personal && badge.personal?.identity
    );

    if (badgeIndex === -1) {
      return res
        .status(404)
        .json({ message: "No identity badge found to remove.", data: null });
    }

    // Making sure Identity exist already also gets deleted.
    const allDocuments = await SearchIdentity.find({});

    for (const doc of allDocuments) {
      const decryptedDoc = decryptData(doc.identity);
      if (
        decryptedDoc.identityNumber ===
        user?.badges[badgeIndex]?.personal?.identity?.identityNumber
      ) {
        // Delete the matched document
        await SearchIdentity.findByIdAndDelete(doc._id);
        // console.log(`Identity document deleted from search index.`);
        break;
      }
    }

    // Remove the badge at the found index
    user.badges.splice(badgeIndex, 1);
    await user.save();

    return res
      .status(200)
      .json({ message: "Badge removed successfully", data: user });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ error: "Something went wrong." });
  }
};

const addProfileBadges = async (req, res) => {
  try {
    const { userUuid, badgeIds } = req.body;

    // Find the user by uuid
    const user = await User.findOne({ uuid: userUuid });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update badges based on badgeIds
    let updatedBadges = user.badges;

    // If badgeIds is empty, set all isAdded to false
    if (badgeIds.length === 0) {
      updatedBadges.forEach((badge) => (badge.isAdded = false));
    } else {
      updatedBadges = user.badges.map((badge) => {
        // Check if the badge's _id exists in badgeIds
        if (badgeIds.includes(badge._id.toString())) {
          return { ...badge, isAdded: true };
        } else {
          return { ...badge, isAdded: false };
        }
      });
    }

    // Update the user's badges in the database
    user.badges = updatedBadges;
    await user.save();

    // Return success response
    res
      .status(200)
      .json({ message: "Badges updated successfully", data: null });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: `Internal server error: ${error}` });
  }
};

const badgeHubClicksTrack = async (req, res) => {
  try {
    const { badgeId, clickerUuid, clickerTimestamps } = req.body;

    // Update the specific badge's `badgeHubClicksTrack`
    const result = await User.findOneAndUpdate(
      { "badges._id": badgeId }, // Match the badge by its ID
      {
        $addToSet: {
          "badges.$.badgeHubClicksTrack": { clickerUuid, clickerTimestamps },
        },
      },
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ message: "Badge not found" });
    }

    // Find the updated badge for response
    const updatedBadge = result.badges.find(
      (badge) => badge._id.toString() === badgeId
    );

    // Return success response
    res.status(200).json({
      message: "Track added successfully",
      data: updatedBadge?.badgeHubClicksTrack,
    });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: `Internal server error: ${error}` });
  }
};

const connectStripe = async (req, res) => {
  try {
    const { uuid } = req.query;
    const redirectUri = `${BACKEND_URL}/auth/stripe/callback`;
    const accountLinkURL = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${STRIPE_CLIENT_ID}&scope=read_write&redirect_uri=${redirectUri}&state=${uuid}`;
    res.status(200).json({ url: accountLinkURL });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const connectStripeCallback = async (req, res) => {
  const { code, state } = req.query;
  try {
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const accountId = response.stripe_user_id;

    const user = await User.findOne({
      uuid: state,
    });

    if (!accountId) throw new Error("Stripe account not connected");

    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ["card"],
    //   mode: "payment",
    //   line_items: [
    //     {
    //       price_data: {
    //         currency: "usd",
    //         product_data: { name: "Payment to User" },
    //         unit_amount: 100, // Set a placeholder amount in cents (e.g., $1)
    //       },
    //       quantity: 1, // Required field
    //       adjustable_quantity: {
    //         enabled: true,
    //         minimum: 1,
    //       },
    //     },
    //   ],
    //   success_url: `${FRONTEND_URL}?success=true`,
    //   cancel_url: `${FRONTEND_URL}?cancel=true`,
    //   payment_intent_data: {
    //     transfer_data: {
    //       destination: accountId,
    //     },
    //   },
    // });

    // // Generate QR Code
    // const qrCode = await QRCode.toDataURL(session.url);

    const product = await stripe.products.create({
      name: "Payment to User",
    });

    const price = await stripe.prices.create({
      unit_amount: 100, // Minimum placeholder amount in cents (e.g., $1)
      currency: "usd",
      product: product.id,
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id, // Replace with your actual Price ID
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
          },
        },
      ],
      transfer_data: {
        destination: accountId, // Connect account ID for fund transfer
      },
    });

    // Generate QR Code for the Payment Link
    const qrCode = await QRCode.toDataURL(paymentLink.url);

    // Create Stripe Badge
    const stripeBadge = {
      genericType: "finance",
      type: "stripe",
      accountId: accountId,
      accountName: "Stripe",
      data: { qrCode: qrCode, url: paymentLink.url },
    };

    user.badges.push(stripeBadge);
    await user.save();

    // Create Ledger
    const txID = crypto.randomBytes(11).toString("hex");
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "User",
      txFrom: user.uuid,
      txTo: "dao",
      txAmount: "0",
      txData: "Stripe",
    });
    await createLedger({
      uuid: user.uuid,
      txUserAction: "accountBadgeAdded",
      txID: txID,
      txAuth: "DAO",
      txFrom: "DAO Treasury",
      txTo: user.uuid,
      txAmount: ACCOUNT_BADGE_ADDED_AMOUNT,
      txData: "Stripe",
    });

    // Decrement the Treasury
    await updateTreasury({ amount: ACCOUNT_BADGE_ADDED_AMOUNT, dec: true });

    // Increment the UserBalance
    await updateUserBalance({
      uuid: user.uuid,
      amount: ACCOUNT_BADGE_ADDED_AMOUNT,
      inc: true,
    });
    user.fdxEarned = user.fdxEarned + ACCOUNT_BADGE_ADDED_AMOUNT;
    user.rewardSchedual.addingBadgeFdx =
      user.rewardSchedual.addingBadgeFdx + ACCOUNT_BADGE_ADDED_AMOUNT;
    await user.save();

    if (accountId) {
      res.redirect(`${FRONTEND_URL}/profile/verification-badges?success=true`);
    } else {
      res.redirect(`${FRONTEND_URL}/profile/verification-badges?success=false`);
    }
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const removeFinance = async (req, res) => {
  try {
    const { uuid, type } = req.body;

    const user = await User.findOneAndUpdate(
      { uuid: uuid },
      { $pull: { badges: { type: type } } },
      { new: true } // Returns the updated document
    );

    if (user) {
      res.status(200).json({ message: "Badge removed successfully", user });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const badgeAddAmount = async (req, res) => {
  try {
    const { uuid, id, amountAdded } = req.body;

    const user = await User.findOneAndUpdate(
      { uuid: uuid, "badges._id": id }, // Match user and the specific badge by _id
      { $set: { "badges.$.amountAdded": amountAdded } }, // Update the amountAdded field of the matched badge
      { new: true } // Return the updated document
    );

    if (user) {
      res.status(200).json({ message: "Badge updated successfully", user });
    } else {
      res.status(404).json({ message: "User or badge not found" });
    }
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  update,
  getBadges,
  addBadgeSocial,
  addBadge,
  removeBadge,
  addContactBadge,
  addContactBadgeVerify,
  addContactBadgeAdd,
  addPersonalBadge,
  removePersonalBadge,
  updatePersonalBadge,
  addWeb3Badge,
  removeContactBadge,
  removeWeb3Badge,
  addWorkEducationBadge,
  removeAWorkEducationBadge,
  addCompany,
  addJobTitle,
  addCertification,
  addOrganization,
  addVolunteer,
  addHobbies,
  addDegreesAndFields,
  getAWorkAndEducationBadge,
  updateWorkAndEducationBadge,
  addPasskeyBadge,
  removePasskeyBadge,
  getPersonalBadge,
  addFarCasterBadge,
  removeFarCasterBadge,
  addPasswordBadgesUpdate,
  addPseudoBadge,
  removePseudoBadge,
  addDomainBadge,
  removeDomainBadge,
  location,
  linkhubInc,
  updateBadgeDataArray,
  verifyIdentity,
  addIdentityBadge,
  updateIdentityBadge,
  removeIdentityBadge,
  addProfileBadges,
  badgeHubClicksTrack,
  connectStripe,
  connectStripeCallback,
  removeFinance,
  updateOnBoarding,
  badgeAddAmount,
};
