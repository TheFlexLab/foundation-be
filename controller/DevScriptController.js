const User = require("../models/UserModel");
const {
  UserListSchema,
  CategorySchema,
  PostSchema,
} = require("../models/UserList");
const {
  MONGO_URI_MAIN,
  MONGO_URI_STAG,
  MONGO_URI_DEV,
  MONGO_URI_KB,
  AWS_S3_ACCESS_KEY,
  AWS_S3_SECRET_ACCESS_KEY,
  AWS_S3_REGION,
  BACKEND_URL,
  MODE,
} = require("../config/env");
const { MongoClient } = require("mongodb");
const { uploadS3Bucket, uploadFileToS3FromBuffer } = require("../utils/uploadS3Bucket");
const UserQuestSetting = require("../models/UserQuestSetting");
const StartQuests = require("../models/StartQuests");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const Ledgers = require("../models/Ledgers");
const { updateUserBalance } = require("../utils/userServices");
const { updateTreasury } = require("../utils/treasuryService");
const crypto = require("crypto");
const { createLedger } = require("../utils/createLedger");
const BookmarkQuests = require("../models/BookmarkQuests");
const { sendEmailMessage } = require("../utils/sendEmailMessage");
const { sendEmailMessageTemplate } = require("../utils/sendEmailMessageTemplate");
const exceljs = require("exceljs");
const { encryptData } = require("../utils/security");
const Email = require("../models/Email");
const { getPercentage } = require("../utils/getPercentage");
const { mongoose } = require("mongoose");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require("path");
const JSZip = require('jszip');
const { QuestRagUpdate } = require("../models/QuestRagUpdate");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const {
  HuggingFaceTransformersEmbeddings,
} = require("@langchain/community/embeddings/hf_transformers");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const AWS = require("aws-sdk");
const { OpenAI } = require("openai");
const { Article } = require("../models/Article");
const { sharedLinkDynamicImage } = require("./UserQuestSettingController");
const { deleteHtmlFiles } = require("../utils/uploadS3Bucket")

// // Directory to save PDFs
// const outputDir = 'C:/Users/Mahad/Desktop/participants';
// // Ensure the directory exists
// if (!fs.existsSync(outputDir)) {
//   fs.mkdirSync(outputDir, { recursive: true });
// }

// Define the possible options to add to `QuestAnswers` based on `whichTypeQuestion`
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
        tooltipStyle: "tooltip-success"
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success"
      },
      isTyping: false,
      duplication: false
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
        tooltipStyle: "tooltip-success"
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success"
      },
      isTyping: false,
      duplication: false
    }
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
        tooltipStyle: "tooltip-success"
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success"
      },
      isTyping: false,
      duplication: false
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
        tooltipStyle: "tooltip-success"
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success"
      },
      isTyping: false,
      duplication: false
    }
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
        tooltipStyle: "tooltip-success"
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success"
      },
      isTyping: false,
      duplication: false
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
        tooltipStyle: "tooltip-success"
      },
      chatgptOptionStatus: {
        name: "Ok",
        color: "text-[#0FB063]",
        tooltipName: "Answer is Verified",
        tooltipStyle: "tooltip-success"
      },
      isTyping: false,
      duplication: false
    }
  ]
};

// Query to find documents where `whichTypeQuestion` matches one of the specified types
const filter = {
  whichTypeQuestion: { $in: ["yes/no", "agree/disagree", "like/dislike"] }
};

// Function to format the date as mm-dd-yyyy
function formatDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${mm}-${dd}-${yyyy}`;
}

function processEntry(question, type, uuid, resultMap) {
  if (!resultMap[question]) {
    resultMap[question] = {
      Selections: { count: 0, users: [] },
      Contentions: { count: 0, users: [] },
    };
  }

  resultMap[question][type].count += 1;
  resultMap[question][type].users.push(uuid);
}

// Function to check if any percentage is >= 75%
const hasHighPercentage = (array) => {
  return array?.some(obj => {
    // Ensure obj is an object and not null or undefined
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(value => {
        // Convert percentage string to number (remove '%' sign if present)
        const percentage = parseFloat(value.replace('%', ''));
        return !isNaN(percentage) && percentage >= 75;
      });
    }
    return false;
  }) || false;
};

// Helper function to sort percentage objects by descending percentage
function sortPercentageObj(obj) {
  return Object.entries(obj).sort((a, b) => {
    // Convert percentage strings to numbers by removing the '%' and comparing
    const percentageA = parseFloat(a[1].replace('%', ''));
    const percentageB = parseFloat(b[1].replace('%', ''));
    return percentageB - percentageA; // Sort descending
  });
}

// const excep = async (req, res) => {
//   try {
//     const users = await User.find({});
//     const bulkOps = [];

//     users.forEach(user => {
//       let updated = false;

//       // Iterate over each badge in the user's badges array
//       user.badges.forEach(badge => {
//         // Check if the badge type is within the specified types and details field doesn't exist
//         if (badge.type && badge.isVerified && !["desktop", "mobile", "farcaster"].includes(badge.type)) {
//           // Check and add missing fields with default values
//           if (!badge.accountId || badge.accountId === undefined || badge.accountId === null) {
//             badge.accountId = "";
//             updated = true;
//           }
//           if (!badge.accountName || badge.accountName === undefined || badge.accountName === null) {
//             badge.accountName = "";
//             updated = true;
//           }
//           if (!badge.details || badge.details === undefined || badge.details === null) {
//             badge.details = { value: null};
//             updated = true;
//           }
//         }
//       });

//       // If any badge was updated, add the update operation to bulkOps
//       if (updated) {
//         bulkOps.push({
//           updateOne: {
//             filter: { _id: user._id },
//             update: { $set: { badges: user.badges } }
//           }
//         });
//       }
//     });

//     if (bulkOps.length > 0) {
//       const bulkWriteResult = await User.bulkWrite(bulkOps);
//       res.status(200).send({
//         message: `${bulkWriteResult.matchedCount} documents matched the filter, ${bulkWriteResult.modifiedCount} documents were updated.`
//       });
//     } else {
//       res.status(200).send({ message: 'No users to update.' });
//     }
//   } catch (error) {
//     res.status(500).send({ message: error.message });
//   }
// };

// const encryptBadgeData = async (req, res) => {
//   try {
//     const users = await User.find({});

//     const bulkOps = users
//       .map(user => {
//         if(user.badges.length !== 0) {
//           //// console.log("user================>", user);
//           user.badges.forEach(badge => {
//             if (badge.type && badge.type === "cell-phone") {
//               badge.details = encryptData(badge.details);
//             } else if (badge.type && ["work", "education", "personal", "social", "default"].includes(badge.type)) {
//               badge.accountId = encryptData(badge.accountId);
//               badge.accountName = encryptData(badge.accountName);
//               badge.details = encryptData(badge.details);
//             } else if (badge.accountName && ["facebook", "linkedin", "twitter", "instagram", "github", "Email", "google"].includes(badge.accountName)) {
//               badge.accountId = encryptData(badge.accountId);
//               badge.accountName = encryptData(badge.accountName);
//               badge.details = encryptData(badge.details);
//             } else if (badge.personal && badge.personal.work) {
//               badge.personal.work = badge.personal.work.map(encryptData);
//             } else if (badge.personal) {
//               badge.personal = encryptData(badge.personal);
//             } else if (badge.web3) {
//               badge.web3 = encryptData(badge.web3);
//             } else if (badge.type && ["desktop", "mobile", "farcaster"].includes(badge.type)) {
//               badge.accountId = encryptData(badge.accountId);
//               badge.accountName = encryptData(badge.accountName);
//               badge.data = encryptData(badge.data);
//             }
//           });

//           return {
//             updateOne: {
//               filter: { _id: user._id },
//               update: { $set: { badges: user.badges } }
//             }
//           };
//         }
//         return null;
//       })
//       .filter(op => op !== null);  // Filter out any null values

//     if (bulkOps.length > 0) {
//       const bulkWriteResult = await User.bulkWrite(bulkOps);
//       res.status(200).send({ message: `${bulkWriteResult.matchedCount} documents matched the filter, ${bulkWriteResult.modifiedCount} documents were updated.`});
//     } else {
//       res.status(200).send({ message: "No documents to update." });
//     }
//   } catch (error) {
//     res.status(500).send({message: error.message});
//   }
// };

const createUserListForAllUsers = async (req, res) => {
  try {
    // Fetch all users from the users collection
    const users = await User.find({});

    // Array to store promises for creating userlists
    const userListPromises = [];

    // Iterate over each user
    for (const user of users) {
      // Check if a userList already exists for the user
      const existingUserList = await UserListSchema.findOne({
        userUuid: user.uuid,
      });

      // If userList does not exist for the user, create one
      if (!existingUserList) {
        const userList = new UserListSchema({
          userUuid: user.uuid,
          // Other fields will default as per the schema
        });

        // Save the userList and push the promise to the array
        userListPromises.push(userList.save());
      }
    }

    // Wait for all userlist documents to be created
    const result = await Promise.all(userListPromises);

    // Send success response
    res.status(200).json({
      message: "UserList Collection is Refactored successfully",
      userList: result,
    });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while creating the userList: ${error.message}`,
    });
  }
};

const resetDatabase = async (dbURL) => {
  const client = new MongoClient(dbURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const excludedCollections = [
    "cities",
    "companies",
    "degreesandfields",
    "educations",
    "jobtitles",
    "questtopics",
    "treasuries",
  ];

  try {
    await client.connect();
    const db = client.db();
    const collections = await db.collections();

    // Drop collections not in the excluded list
    for (let collection of collections) {
      if (!excludedCollections.includes(collection.collectionName)) {
        await collection.drop();
      }
    }

    // Update the 'amount' field in the 'treasuries' collection
    const treasuriesCollection = db.collection("treasuries");
    await treasuriesCollection.updateOne({}, { $set: { amount: 10000000 } });
  } catch (error) {
    // console.error(`Error resetting database at ${dbURL}: ${error.message}`);
    throw error;
  } finally {
    await client.close();
  }
};

const resetMainDatabase = async () => {
  try {
    // const mainURL = MONGO_URI_MAIN;
    // await resetDatabase(mainURL);
    const localURL = "mongodb://0.0.0.0:27017/localDBName";
    await resetDatabase(localURL);
  } catch (error) {
    // console.error(`Error resetting main database: ${error.message}`);
    throw new Error(`Error resetting main database: ${error.message}`);
  }
};

const resetStagingDatabase = async () => {
  try {
    // const stagURL = MONGO_URI_STAG;
    // await resetDatabase(stagURL);
    const localURL = "mongodb://0.0.0.0:27017/localDBName";
    await resetDatabase(localURL);
  } catch (error) {
    // console.error(`Error resetting staging database: ${error.message}`);
    throw new Error(`Error resetting staging database: ${error.message}`);
  }
};

const resetDevelopmentDatabase = async () => {
  try {
    // const devURL = MONGO_URI_DEV;
    // await resetDatabase(devURL);
    const localURL = "mongodb://0.0.0.0:27017/localDBName";
    await resetDatabase(localURL);
  } catch (error) {
    // console.error(`Error resetting development database: ${error.message}`);
    throw new Error(`Error resetting development database: ${error.message}`);
  }
};

const dbReset = async (req, res) => {
  try {
    const { db } = req.body; // Assuming db is coming from the request body
    const validDbs = ["main", "stag", "dev"];

    if (!validDbs.includes(db)) {
      return res.status(404).json({ message: `DB ${db} does not exist` });
    }

    switch (db) {
      case "main":
        // Logic for resetting the main database
        await resetMainDatabase();
        break;
      case "stag":
        // Logic for resetting the staging database
        await resetStagingDatabase();
        break;
      case "dev":
        // Logic for resetting the development database
        await resetDevelopmentDatabase();
        break;
      default:
        return res.status(404).json({ message: `DB ${db} does not exist` });
    }

    res.status(200).json({ message: `Database ${db} reset successfully` });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred: ${error.message}`,
    });
  }
};

const badgesDetails = async (users) => {
  try {
    const PersonalBadges = users.filter(user =>
      user.badges.some(badge => badge.type === 'personal')
    ).length;

    const WorkBadges = users.filter(user =>
      user.badges.some(badge => badge.type === 'work')
    ).length;

    const EducationBadges = users.filter(user =>
      user.badges.some(badge => badge.type === 'education')
    ).length;

    const CellPhoneBadges = users.filter(user =>
      user.badges.some(badge => badge.type === 'cell-phone')
    ).length;

    const DataEncryptionBadges = users.filter(user => user.isPasswordEncryption === true).length;

    const PseudoBadges = users.filter(user =>
      user.badges.some(badge => badge.pseudo && badge.pseudo === true)
    ).length;

    const TwitterBadges = users.filter(user =>
      user.badges.some(badge => badge.accountName === 'twitter')
    ).length;

    const LinkedInBadges = users.filter(user =>
      user.badges.some(badge => badge.accountName === 'linkedin')
    ).length;

    const FacebookBadges = users.filter(user =>
      user.badges.some(badge => badge.accountName === 'facebook')
    ).length;

    const GitHubBadges = users.filter(user =>
      user.badges.some(badge => badge.accountName === 'github')
    ).length;

    const FarcasterBadges = users.filter(user =>
      user.badges.some(badge => badge.type === 'farcaster')
    ).length;

    const EthereumBadges = users.filter(user =>
      user.badges.some(badge => badge.web3)
    ).length;

    const FirstNameBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.firstName)
    ).length;

    const LastNameBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.lastName)
    ).length;

    const HomeTownBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.hometown)
    ).length;

    const CurrentCityBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.currentCity)
    ).length;

    const SexBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.sex)
    ).length;

    const RelationshipStatusBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.relationshipStatus)
    ).length;

    const DateOfBirthBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.dateOfBirth)
    ).length;

    const WorkHistoryBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.work)
    ).length;

    const EducationHistoryBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal.education)
    ).length;

    const SecurityQuestionBadges = users.filter(user =>
      user.badges.some(badge => badge.personal && badge.personal['security-question'])
    ).length;

    const badgeCounts = {
      Contact: {
        PersonalBadges,
        WorkBadges,
        EducationBadges,
        CellPhoneBadges,
      },
      Privacy: {
        DataEncryptionBadges,
        PseudoBadges,
      },
      Social: {
        TwitterBadges,
        LinkedInBadges,
        FacebookBadges,
        GitHubBadges,
        FarcasterBadges,
      },
      Web3: {
        EthereumBadges,
      },
      Personal: {
        FirstNameBadges,
        LastNameBadges,
        HomeTownBadges,
        CurrentCityBadges,
        SexBadges,
        RelationshipStatusBadges,
        DateOfBirthBadges,
        WorkHistoryBadges,
        EducationHistoryBadges,
        SecurityQuestionBadges,
      }
    };

    // Sum all badge values
    const grandTotalOfMentionedBadges = Object.values(badgeCounts)
      .flatMap(Object.values) // Flatten the nested values into a single array
      .reduce((sum, count) => sum + count, 0); // Sum all the values

    return { ...badgeCounts, grandTotalOfMentionedBadges }

  } catch (error) {
    // console.log(error);
    throw error;
  }
}

const generalStatistics = async (req, res) => {
  try {
    const guestUserEmailRegex = /^user-\d+@guest\.com$/;
    const fromRecentDays = new Date();
    fromRecentDays.setDate(fromRecentDays.getDate() - 5);

    // Count total registered users excluding guest users
    const totalRegisteredUsers = await User.countDocuments({
      $or: [
        { email: { $exists: false } },
        { email: { $not: guestUserEmailRegex } },
      ],
    });

    const totalBadges = await User.aggregate([
      {
        $match: {
          $or: [
            { email: { $exists: false } },
            { email: { $not: guestUserEmailRegex } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalBadges: { $sum: { $size: "$badges" } },
        },
      },
    ]).then((result) => (result.length > 0 ? result[0].totalBadges : 0));

    const averageBadges =
      totalRegisteredUsers > 0 ? totalBadges / totalRegisteredUsers : 0;

    // Count total guest users
    const totalGuestUsers = await User.countDocuments({
      email: guestUserEmailRegex,
    });

    // Count total posts
    const totalPosts = await InfoQuestQuestions.countDocuments();

    const totalPostsBookmarked = await BookmarkQuests.countDocuments();

    // let totalUsersBookmarkedPosts = await BookmarkQuests.aggregate([
    //     {
    //         $group: {
    //             _id: "$uuid"
    //         }
    //     },
    //     {
    //         $count: "totalUsersBookmarkedPosts"
    //     }
    // ]);
    // totalUsersBookmarkedPosts = totalUsersBookmarkedPosts.length > 0 ? totalUsersBookmarkedPosts[0].totalUsersBookmarkedPosts : 0;

    // Count total posts creators
    const totalPostsCreators = await InfoQuestQuestions.aggregate([
      {
        $group: {
          _id: "$uuid",
        },
      },
      {
        $count: "totalPostsCreators",
      },
    ]);
    const totalPostsCreatorsCount =
      totalPostsCreators.length > 0
        ? totalPostsCreators[0].totalPostsCreators
        : 0;

    // Count total engagements
    const totalPostEngagements = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$yourPostEngaged" } } },
    ]).then((result) => result[0]?.total || 0);

    // Count total posts engagers
    const totalPostEngagers = await StartQuests.aggregate([
      {
        $group: {
          _id: "$uuid",
        },
      },
      {
        $count: "totalPostEngagers",
      },
    ]);
    const totalPostEngagersCount =
      totalPostEngagers.length > 0 ? totalPostEngagers[0].totalPostEngagers : 0;

    // Count total agreements
    const totalPostAgreements = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$selectionsOnAddedAns" } } },
    ]).then((result) => result[0]?.total || 0);

    // Count total options added
    const totalPostOptionsAdded = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$addedAnswers" } } },
    ]).then((result) => result[0]?.total || 0);

    // Count total options change
    const totalPostOptionsChange = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$changedAnswers" } } },
    ]).then((result) => result[0]?.total || 0);

    // Count total options change
    const totalPostObjections = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$contentionsGiven" } } },
    ]).then((result) => result[0]?.total || 0);

    // Count total code of conduct
    const totalCodeOfConducts = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$violationCounter" } } },
    ]).then((result) => result[0]?.total || 0);

    // Count total shared posts
    const totalSharedPosts = await UserQuestSetting.countDocuments({
      linkStatus: "Enable",
    });

    const sharedQuests = await UserQuestSetting.find({
      linkStatus: "Enable",
    });
    const totals = sharedQuests.reduce(
      (acc, quest) => {
        acc.questImpression += quest.questImpression || 0;
        acc.questsCompleted += quest.questsCompleted || 0;
        return acc;
      },
      { questImpression: 0, questsCompleted: 0 }
    );

    // Count total hidden posts
    const totalHiddenPosts = await UserQuestSetting.countDocuments({
      hidden: true,
    });

    // Count total ledgers
    const totalLedgers = await Ledgers.countDocuments();

    // Count total list items across all users
    const totalListCount = await UserListSchema.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $size: "$list" } },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    // Total shared lists clicks count for all users
    const totalSharedListsClicksCount = await UserListSchema.aggregate([
      { $unwind: "$list" },
      { $match: { "list.link": { $ne: null } } },
      { $group: { _id: null, totalClicks: { $sum: "$list.clicks" } } },
    ]);

    // Total shared lists participants count for all users
    const totalSharedListsParticipantsCount = await UserListSchema.aggregate([
      { $unwind: "$list" },
      { $match: { "list.link": { $ne: null } } },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: "$list.participents" },
        },
      },
    ]);

    const totalSharedListsImpressions =
      totalSharedListsClicksCount.length > 0
        ? totalSharedListsClicksCount[0].totalClicks
        : 0;
    const totalSharedListsEngagements =
      totalSharedListsParticipantsCount.length > 0
        ? totalSharedListsParticipantsCount[0].totalParticipants
        : 0;

    // Total suppressed posts
    const totalSuppressedPosts = await InfoQuestQuestions.countDocuments({
      suppressed: true,
    });

    const users = await User.find({ email: { $not: guestUserEmailRegex } });

    const totalUsersBadgesDetails = await badgesDetails(users);

    let totalArticlesViewCount = await Article.aggregate([
      {
        $group: {
          _id: null, // Grouping by `null` means all documents are grouped together
          totalViewCount: { $sum: "$viewCount" }, // Summing up the `viewCount` field
        },
      },
    ]);

    // Access the total view count
    totalArticlesViewCount = totalArticlesViewCount.length > 0 ? totalArticlesViewCount[0].totalViewCount : 0;

    // Last 5 days statistics
    const recentRegisteredUsers = await User.countDocuments({
      createdAt: { $gte: fromRecentDays },
      $or: [
        { email: { $exists: false } },
        { email: { $not: guestUserEmailRegex } },
      ],
    });

    const totalBadgesRecent = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: fromRecentDays },
          $or: [
            { email: { $exists: false } },
            { email: { $not: guestUserEmailRegex } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalBadges: { $sum: { $size: "$badges" } },
        },
      },
    ]).then((result) => (result.length > 0 ? result[0].totalBadges : 0));

    const averageBadgesRecent =
      recentRegisteredUsers > 0 ? totalBadgesRecent / recentRegisteredUsers : 0;

    const recentGuestUsers = await User.countDocuments({
      createdAt: { $gte: fromRecentDays },
      email: guestUserEmailRegex,
    });

    const recentTotalPostEngagements = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$yourPostEngaged" },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    const recentPostsEngagers = await StartQuests.aggregate([
      {
        $match: {
          createdAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: "$uuid",
        },
      },
      {
        $count: "recentPostsEngagers",
      },
    ]);
    const recentPostsEngagersCount =
      recentPostsEngagers.length > 0
        ? recentPostsEngagers[0].recentPostsEngagers
        : 0;

    const recentTotalPostAgreements = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$selectionsOnAddedAns" },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    const recentTotalPostOptionsAdded = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$addedAnswers" },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    const recentTotalPostOptionsChange = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$changedAnswers" },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    const recentTotalPostObjections = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$contentionsGiven" },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    const recentTotalCodeOfConducts = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$violationCounter" },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    const recentPosts = await InfoQuestQuestions.countDocuments({
      createdAt: { $gte: fromRecentDays },
    });

    const recentPostsBookmarked = await BookmarkQuests.countDocuments({
      createdAt: { $gte: fromRecentDays },
    });

    // let recentUserPostsBookmarked = await InfoQuestQuestions.aggregate([
    //     {
    //         $match: {
    //             createdAt: { $gte: fromRecentDays }
    //         }
    //     },
    //     {
    //         $group: {
    //             _id: "$uuid"
    //         }
    //     },
    //     {
    //         $count: "recentUserPostsBookmarked"
    //     }
    // ]);
    // recentUserPostsBookmarked = recentUserPostsBookmarked.length > 0 ? recentUserPostsBookmarked[0].recentUserPostsBookmarked : 0;

    const recentPostsCreators = await InfoQuestQuestions.aggregate([
      {
        $match: {
          createdAt: { $gte: fromRecentDays },
        },
      },
      {
        $group: {
          _id: "$uuid",
        },
      },
      {
        $count: "recentPostsCreators",
      },
    ]);
    const recentPostsCreatorsCount =
      recentPostsCreators.length > 0
        ? recentPostsCreators[0].recentPostsCreators
        : 0;

    const recentSharedPosts = await UserQuestSetting.countDocuments({
      createdAt: { $gte: fromRecentDays },
      linkStatus: "Enable",
    });

    const sharedQuestsRecent = await UserQuestSetting.find({
      linkStatus: "Enable",
      createdAt: { $gte: fromRecentDays },
    });
    const totalsRecent = sharedQuestsRecent.reduce(
      (acc, quest) => {
        acc.questImpression += quest.questImpression || 0;
        acc.questsCompleted += quest.questsCompleted || 0;
        return acc;
      },
      { questImpression: 0, questsCompleted: 0 }
    );

    const recentHiddenPosts = await UserQuestSetting.countDocuments({
      createdAt: { $gte: fromRecentDays },
      hidden: true,
    });

    const recentLedgers = await Ledgers.countDocuments({
      createdAt: { $gte: fromRecentDays },
    });

    // Count total list items across all users
    const recentListCount = await UserListSchema.aggregate([
      {
        $project: {
          list: {
            $filter: {
              input: "$list",
              as: "list",
              cond: {
                $gte: ["$$list.createdAt", fromRecentDays.toISOString()],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $size: "$list" } },
        },
      },
    ]).then((result) => result[0]?.total || 0);

    // Total shared lists clicks count for all users
    const totalSharedListsClicksCountRecent = await UserListSchema.aggregate([
      { $unwind: "$list" },
      {
        $match: {
          "list.link": { $ne: null },
          "list.createdAt": { $gte: fromRecentDays.toISOString() },
        },
      },
      { $group: { _id: null, totalClicks: { $sum: "$list.clicks" } } },
    ]);

    // Total shared lists participants count for all users
    const totalSharedListsParticipantsCountRecent =
      await UserListSchema.aggregate([
        { $unwind: "$list" },
        {
          $match: {
            "list.link": { $ne: null },
            "list.createdAt": { $gte: fromRecentDays.toISOString() },
          },
        },
        {
          $group: {
            _id: null,
            totalParticipants: { $sum: "$list.participents" },
          },
        },
      ]);

    const recentSharedListsImpressions =
      totalSharedListsClicksCountRecent.length > 0
        ? totalSharedListsClicksCountRecent[0].totalClicks
        : 0;
    const recentSharedListsEngagements =
      totalSharedListsParticipantsCountRecent.length > 0
        ? totalSharedListsParticipantsCountRecent[0].totalParticipants
        : 0;

    // Last 5 days suppressed posts
    const recentSuppressedPosts = await InfoQuestQuestions.countDocuments({
      suppressed: true,
      createdAt: { $gte: fromRecentDays },
    });

    const recentUsers = await User.find({
      email: { $not: guestUserEmailRegex },
      createdAt: { $gte: fromRecentDays }
    });

    const recentUsersBadgesDetails = await badgesDetails(recentUsers);

    const generalStatistics = {
      totalRegisteredUsers,
      totalBadges,
      averageBadges,
      totalGuestUsers,
      totalPosts,
      totalPostsBookmarked,
      totalPostsCreatorsCount,
      totalSharedPosts,
      totalSharedPostsImpressions: totals.questImpression,
      totalSharedPostsEngagements: totals.questsCompleted,
      totalHiddenPosts,
      totalSuppressedPosts,
      totalPostEngagements,
      totalPostEngagersCount,
      totalPostAgreements,
      totalPostOptionsAdded,
      totalPostOptionsChange,
      totalPostObjections,
      totalCodeOfConducts,
      totalLedgers,
      totalListCount,
      totalSharedListsImpressions,
      totalSharedListsEngagements,
      totalArticlesViewCount,
    };

    const recent = {
      recentRegisteredUsers,
      totalBadgesRecent,
      averageBadgesRecent,
      recentGuestUsers,
      recentPosts,
      recentPostsBookmarked,
      recentPostsCreatorsCount,
      recentSharedPosts,
      recentSharedPostsImpressions: totalsRecent.questImpression,
      recentSharedPostsEngagements: totalsRecent.questsCompleted,
      recentHiddenPosts,
      recentSuppressedPosts,
      recentTotalPostEngagements,
      recentPostsEngagersCount,
      recentTotalPostAgreements,
      recentTotalPostOptionsAdded,
      recentTotalPostOptionsChange,
      recentTotalPostObjections,
      recentTotalCodeOfConducts,
      recentLedgers,
      recentListCount,
      recentSharedListsImpressions,
      recentSharedListsEngagements,
    };

    res.status(200).json({
      Date: formatDate(new Date()),
      user_analytics: {
        Overall: generalStatistics,
        Recent: recent,
      },
      BadgeDetails: totalUsersBadgesDetails,
    });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred: ${error.message}`,
    });
  }
};

const userListSeoSetting = async (req, res) => {
  try {
    // Aggregation pipeline
    const pipeline = [
      { $unwind: "$list" },
      { $match: { "list.link": { $ne: null } } },
      {
        $project: {
          link: "$list.link",
          // Add any other necessary fields you need to project
        },
      },
    ];

    // Run the aggregation
    const result = await UserListSchema.aggregate(pipeline);

    // Iterate through the result and call uploadS3Bucket for each category
    for (const doc of result) {
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: doc.link,
          description:
            "A revolutionary new social platform. Own your data. Get rewarded.",
          route: "static_pages/list",
          title: "Foundation: Shared list",
        });
      }
    }

    // Send success response
    res.status(200).json({
      message: "SEO Created",
    });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while creating the userList: ${error.message}`,
    });
  }
};

const userPostSeoSetting = async (req, res) => {
  try {
    const result = await UserQuestSetting.find({
      link: { $ne: "" },
    }).lean();

    let counter = 1;

    // Iterate through the result and call uploadS3Bucket for each category
    for (const doc of result) {
      const infoQuestQuestion = await InfoQuestQuestions.findOne({
        _id: doc.questForeignKey,
      });
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: doc.link,
          description: "Foundation Labs",
          route: "static_pages",
          title: doc.Question,
          wrapcastImage: `https://foundation-seo.s3.amazonaws.com/dynamicImages/${doc.link}_wrapcast.png`,
          farcasterSupport:
            infoQuestQuestion.whichTypeQuestion === "agree/disagree" ||
              infoQuestQuestion.whichTypeQuestion === "yes/no" ||
              infoQuestQuestion.whichTypeQuestion === "like/dislike"
              ? true
              : false,
        });
      }
      // console.log(counter);
      counter++;
    }

    // Send success response
    res.status(200).json({
      message: "SEO Created",
    });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while creating the userList: ${error.message}`,
    });
  }
};

const setFeedback = async (req, res) => {
  try {
    const hiddenQuests = await UserQuestSetting.find({ hidden: true });

    for (const quest of hiddenQuests) {
      let updated = false;
      if (quest.feedbackTime == null || !quest.feedbackTime) {
        quest.feedbackTime = quest.hiddenTime;
        updated = true;
      }
      if (quest.feedbackMessage === "" || !quest.feedbackMessage) {
        quest.feedbackMessage = quest.hiddenMessage;
        updated = true;
      }
      if (updated) {
        await quest.save();
        const startQuestExist = await StartQuests.findOne({
          uuid: quest.uuid,
          questForeignKey: quest.questForeignKey,
        });
        if (!startQuestExist) {
          const startQuestModel = new StartQuests({
            addedAnswer: "",
            addedAnswerUuid: "",
            data: [],
            isAddedAnsSelected: "",
            questForeignKey: quest.questForeignKey,
            uuid: quest.uuid,
            isFeedback: true,
          });
          await startQuestModel.save();
        } else {
          startQuestExist.isFeedback = true;
          await startQuestExist.save();
        }
      }

      if (
        quest.hiddenMessage === "Historical / Past Event" &&
        !quest.historyDate
      ) {
        quest.historyDate = null;
        await quest.save();
      } else if (
        quest.hiddenMessage === "Historical / Past Event" &&
        quest.historyDate !== null
      ) {
        const sameDate = await UserQuestSetting.findOne({
          _id: { $ne: quest._id },
          hidden: true,
          historyDate: quest.historyDate,
        });
        if (sameDate) {
          await InfoQuestQuestions.findOneAndUpdate(
            {
              _id: quest.questForeignKey,
            },
            {
              isClosed: true,
            }
          ).exec();
        }
      }

      if (quest.hiddenMessage === "Needs More Options") {
        const questAlreadyExist = await UserQuestSetting.findOne({
          _id: { $ne: quest._id },
          hidden: true,
          hiddenMessage: "Needs More Options",
        });
        if (questAlreadyExist) {
          await InfoQuestQuestions.findOneAndUpdate(
            {
              _id: quest.questForeignKey,
            },
            {
              usersAddTheirAns: true,
              isAddOptionFeedback: true,
            }
          ).exec();
        }
      }
    }

    res.status(200).json({
      message: "Feedback updated successfully for hidden quests",
    });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while updating the feedback: ${error.message}`,
    });
  }
};

const setPostCounters = async (req, res) => {
  try {
    const submitDocs = await Ledgers.find({
      txUserAction: "postCompleted",
      txAuth: "User",
    });

    for (const doc of submitDocs) {
      await InfoQuestQuestions.findByIdAndUpdate(
        {
          _id: doc.txData,
        },
        {
          $inc: { submitCounter: 1 },
        }
      );
    }

    // Step 1: Aggregate to collect questForeignKeys from StartQuests based on Ledgers
    const questForeignKeys = await Ledgers.aggregate([
      {
        $match: {
          txUserAction: "postCompletedChange",
          txAuth: "User",
        },
      },
      {
        $lookup: {
          from: "startquests", // Ensure this matches your StartQuests collection name
          localField: "txData",
          foreignField: "_id",
          as: "startQuestDocs",
        },
      },
      {
        $unwind: "$startQuestDocs",
      },
      {
        $project: {
          _id: 0,
          questForeignKey: "$startQuestDocs.questForeignKey",
        },
      },
    ]);

    // Extract questForeignKeys
    const foreignKeys = questForeignKeys.map((doc) => doc.questForeignKey);

    // Step 2: Update InfoQuestQuestions
    const results = await InfoQuestQuestions.updateMany(
      { _id: { $in: foreignKeys } },
      { $inc: { changeCounter: 1 } }
    );

    res.status(200).json({
      message: "Counters are updated",
      data: results,
    });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while updating the feedback: ${error.message}`,
    });
  }
};

const createGuestLedger = async (req, res) => {
  try {
    const users = await User.find({
      role: "user",
      badges: [],
    });

    for (const doc of users) {
      const txID = crypto.randomBytes(11).toString("hex");
      // Create Ledger
      await createLedger({
        uuid: doc.uuid,
        txUserAction: "accountAddedGuestExpired",
        txID: txID,
        txAuth: "User",
        txFrom: doc.uuid,
        txTo: "DAO",
        txAmount: 0,
        txData: "",
        txDate: Date.now(),
        txDescription: "Guest User Expired",
      });
      // Create Ledger
      await createLedger({
        uuid: doc.uuid,
        txUserAction: "accountAddedGuestExpired",
        txID: txID,
        txAuth: "DAO",
        txFrom: doc.uuid,
        txTo: "DAO Treasury",
        txAmount: doc.balance,
        txDate: Date.now(),
        txDescription: "Guest User Expired",
        txData: "",
        // txDescription : "Incentive for creating a quest"
      });
      // Increment the Treasury
      await updateTreasury({ amount: doc.balance, inc: true });
      // Decrement the UserBalance
      await updateUserBalance({
        uuid: doc.uuid,
        amount: doc.balance,
        dec: true,
      });
    }

    res.status(200).json({ message: "done" });
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while updating the feedback: ${error.message}`,
    });
  }
};

const sendEmail = async (req, res) => {
  try {
    const mails = [
      "malikhamza1619619@gmail.com",
      "mmahad913@gmail.com",
      "wamiqakram@gmail.com",
    ];

    // Sending emails concurrently
    await Promise.all(
      mails.map((email) =>
        sendEmailMessage(
          email,
          req.body.subject,
          req.body.message,
          req.body.sender
        )
      )
    );

    return true;

  } catch (error) {
    // console.error(error.message);
    throw error;
  }
};

const sendEmailTemplate = async (req, res) => {
  try {
    const mails = [
      "malikhamza1619619@gmail.com",
      "mmahad913@gmail.com",
      "wamiqakram@gmail.com",
    ];

    // Sending emails concurrently
    await Promise.all(
      mails.map((email) =>
        sendEmailMessageTemplate(
          email,
          req.body.subject,
          req.body.message,
          req.body.sender
        )
      )
    );

    // If no errors occurred, respond with success
    return res.status(200).json({ message: "Mail sent successfully" });
  } catch (error) {
    // console.error(error.message);
    return res.status(500).json({
      message: `An error occurred while sending the emails: ${error.message}`,
    });
  }
};

async function getSelectionsContentions(req, res) {
  try {
    const { questForeignKey } = req.body;

    // Fetch documents where questForeignKey matches
    const documents = await StartQuests.find({ questForeignKey });

    // Object to store the counts and uuids
    const resultMap = {};

    documents.forEach((doc) => {
      const latestData =
        doc.data.length > 0
          ? doc.data.reduce((latest, current) => {
            return new Date(current.created) > new Date(latest.created)
              ? current
              : latest;
          })
          : false; // Return false or handle the empty case as needed

      const { selected, contended } = latestData;
      const uuid = doc.uuid;

      // Process selected field
      if (Array.isArray(selected)) {
        selected.forEach((item) =>
          processEntry(item.question, "Selections", uuid, resultMap)
        );
      } else {
        processEntry(selected, "Selections", uuid, resultMap);
      }

      // Process contended field (only for Type 2)
      if (Array.isArray(contended)) {
        contended.forEach((item) =>
          processEntry(item.question, "Contentions", uuid, resultMap)
        );
      }
    });

    // Transform resultMap into the desired output format
    const resultArray = Object.keys(resultMap).map((key) => ({
      key,
      Selections: {
        votes: resultMap[key].Selections.count,
        users: [...new Set(resultMap[key].Selections.users)].map((user) =>
          encryptData(user)
        ), // Encrypt UUIDs
      },
      Contentions: {
        votes: resultMap[key].Contentions.count,
        users: [...new Set(resultMap[key].Contentions.users)].map((user) =>
          encryptData(user)
        ), // Encrypt UUIDs
      },
    }));

    return resultArray;
  } catch (error) {
    // console.error(error);
    throw error;
  }
}

async function getFeedback(questForeignKey) {
  try {

    const nIdocuments = await UserQuestSetting.find(
      {
        questForeignKey: questForeignKey,
        feedbackMessage: "Not interested",
      }
    );

    const dAdocuments = await UserQuestSetting.find(
      {
        questForeignKey: questForeignKey,
        feedbackMessage: "Does not apply to me",
      }
    );

    const result = [
      {
        "Not interested": nIdocuments.length
      },
      {
        "Does not apply to me": dAdocuments.length
      },
    ]

    return result;

  } catch (error) {
    // console.log(error);
    throw error;
  }
}

const generatePostData = async (req, res) => {
  try {
    // Step 1: Fetch all quests
    const posts = await InfoQuestQuestions.find({});

    // Step 2: Initialize the Excel workbook and worksheet
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Post Data");

    // Step 3: Define the header row
    worksheet.columns = [
      { header: "Post Identifier/Reference/Id", key: "postId", width: 30 },
      { header: "Post Title", key: "postTitle", width: 30 },
      { header: "Post Topic", key: "postTopic", width: 30 },
      { header: "Post Type", key: "postType", width: 20 },
      { header: "All Post Options", key: "allPostOptions", width: 40 },
      { header: "Suppressed", key: "suppressed", width: 15 },
      { header: "Suppressed Reason", key: "suppressedReason", width: 30 },
      { header: "Closed", key: "closed", width: 15 },
      { header: "Post Creator", key: "postCreator", width: 30 },
      { header: "Post Feedback", key: "postFeedback", width: 50 },
      { header: "Post Options With Results", key: "postOptionsWithResults", width: 50 },
    ];

    const jsonData = []; // Array to store JSON data

    let postCounter = 0

    // Step 4: Process each quest document
    for (const post of posts) {
      const postId = post._id;
      const postTitle = post.Question;
      const postTopic = post.QuestTopic;
      const postType = post.whichTypeQuestion;
      const allPostOptions = post.QuestAnswers.map((answer) => answer.question); // Extract the questions as strings
      const suppressed = post.suppressed;
      const suppressedReason = post.suppressedReason || "";
      const closed = post.isClosed ? "Historical" : "Open";
      const postCreator = encryptData(post.uuid);

      // Step 5: Feedback Result Array
      const feedbackResultArray = await getFeedback(post._id);
      const postFeedback = JSON.stringify(feedbackResultArray); // Convert to a JSON string to store in Excel

      // Step 6: Fetch post ratings using getSelectionsContentions function
      const resultArray = await getSelectionsContentions({
        body: { questForeignKey: post._id },
      });
      const postOptionsWithResults = JSON.stringify(resultArray); // Convert to a JSON string to store in Excel

      // Step 6: Add the row to the worksheet
      worksheet.addRow({
        postId,
        postTitle,
        postTopic,
        postType,
        allPostOptions: allPostOptions.join(", "), // Convert array to comma-separated string
        suppressed,
        suppressedReason,
        closed,
        postCreator,
        postFeedback,
        postOptionsWithResults,
      });

      // Add data to JSON array
      jsonData.push({
        postId,
        postTitle,
        postTopic,
        postType,
        allPostOptions,
        suppressed,
        suppressedReason,
        closed,
        postCreator,
        postFeedback: feedbackResultArray, // Keep as an object, not JSON string
        postOptionsWithResults: resultArray, // Keep as an object, not JSON string
      });

      postCounter++
      // console.log(`${postCounter} completed successfully`);
    }

    // Step 7.0.1: Save the Excel file
    // const filePath = './post_data.xlsx';
    // await workbook.xlsx.writeFile(filePath);

    // res.status(200).json({ message: 'Excel file generated successfully', filePath });
    // Step 7.0.2: Write the workbook to a buffer
    // const buffer = await workbook.xlsx.writeBuffer();

    // // Set the response headers and send the file
    // res.setHeader('Content-Disposition', 'attachment; filename=post_data.xlsx');
    // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // res.status(200).send(buffer);

    // Step 7: Save the Excel file to a buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Create a JSON file buffer
    const jsonBuffer = Buffer.from(JSON.stringify(jsonData, null, 2), "utf-8");

    // Define the file paths where you want to save the files locally
    const excelFilePath = path.join(__dirname, "post_data.xlsx");
    const jsonFilePath = path.join(__dirname, "post_data.json");

    // Write Excel and JSON files locally
    fs.writeFileSync(excelFilePath, excelBuffer);
    fs.writeFileSync(jsonFilePath, jsonBuffer);

    // console.log("Excel and JSON files have been saved successfully!");

    // Set the response headers for both files
    // res.setHeader("Content-Disposition", "attachment; filename=post_data.zip");
    // res.setHeader("Content-Type", "application/zip");

    // // Create a ZIP file buffer containing both the Excel and JSON files
    // const zip = new require("jszip")();
    // zip.file("post_data.xlsx", excelBuffer);
    // zip.file("post_data.json", jsonBuffer);
    // const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // // Send the ZIP file containing both the Excel and JSON files
    // res.status(200).send(zipBuffer);
  } catch (error) {
    // console.error(error.message);
    return res.status(500).json({
      message: `An error occurred: ${error.message}`,
    });
  }
};

const addOptionsInBooleanQuests = async (req, res) => {
  try {
    // Fetch documents based on your filter criteria
    const documents = await InfoQuestQuestions.find(filter);

    // Loop through each document to update
    for (const doc of documents) {
      try {
        // Check if QuestAnswers is an empty array
        if (doc.QuestAnswers.length === 0) {
          // Determine which options to add based on `whichTypeQuestion`
          const newQuestAnswers = optionsMapping[doc.whichTypeQuestion];

          if (newQuestAnswers) {
            // Update the document using findOneAndUpdate
            await InfoQuestQuestions.findOneAndUpdate(
              { _id: doc._id },
              { QuestAnswers: newQuestAnswers },
            );

            // console.log(`Document with ID ${doc._id} updated successfully.`);
          } else {
            // console.log(`No matching options found for whichTypeQuestion: ${doc.whichTypeQuestion}`);
          }
        } else {
          // console.log(`QuestAnswers is not empty for document with ID ${doc._id}. No update needed.`);
        }
      } catch (updateError) {
        // console.error(`Error updating document with ID ${doc._id}:`, updateError);
      }
    }

    res.status(200).json({
      message: "Boolean Quests Updated Successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


const addIdsToQuestAnswersArrayObjects = async (req, res) => {
  try {
    // Find all documents where `QuestAnswers` is not empty
    const documents = await InfoQuestQuestions.find({});

    for (const doc of documents) {
      // Map through the QuestAnswers array and update _id
      const updatedQuestAnswers = doc.QuestAnswers.map(answer => {
        if (answer._id && mongoose.Types.ObjectId.isValid(answer._id)) {
          return answer; // Return the object as-is if _id already exists
        }

        // Add a new _id field if it does not exist
        return {
          ...answer,
          _id: new mongoose.Types.ObjectId(),
        };
      });

      // Update the document using findOneAndUpdate
      await InfoQuestQuestions.findOneAndUpdate(
        { _id: doc._id },
        { QuestAnswers: updatedQuestAnswers },
      );
      // console.log(`Document with ID ${doc._id} updated successfully.`);
    }

    res.status(200).json({
      message: "QuestAnswers updated successfully with new _id fields.",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const selectedContendedPercentages = async (req, res) => {
  try {

    // Find documents where `result` exists, but either `selectedPercentage` or `contendedPercentage` do not exist or are empty objects
    const posts = await InfoQuestQuestions.find({
      result: { $exists: true },
    });

    if (posts.length === 0) return res.status(200).json({ message: "No documents found." });
    let docNumber = 1;

    // Iterate over the found documents
    for (const doc of posts) {
      try {
        // Call `getPercentage` and get the result
        const result = await getPercentage(doc);

        const selectedHasHighPercentage = hasHighPercentage(result.selectedPercentage || []);
        const contendedHasHighPercentage = hasHighPercentage(result.contendedPercentage || []);

        // Update the document with the new percentages
        await InfoQuestQuestions.findOneAndUpdate(
          { _id: doc._id },
          {
            selectedPercentage: result.selectedPercentage,
            contendedPercentage: result.contendedPercentage,
            isAboveThePercentage: selectedHasHighPercentage ? true : false,
          }
        );

        // console.log(`Document with ID ${doc._id} updated successfully ${docNumber}.`);
        docNumber++;
      } catch (err) {
        // console.error(`Error updating document with ID ${doc._id}:`, err);
      }
    }

    res.status(200).json({
      message: "Documents updated successfully.",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const setGeneralTypes = async (req, res) => {
  try {

    // Find documents where `generalType` either does not exist or is null
    const posts = await InfoQuestQuestions.find({
      $or: [
        { generalType: { $exists: false } }, // `generalType` does not exist
        { generalType: null }               // `generalType` is explicitly set to null
      ]
    });

    if (posts.length === 0) {
      return res.status(404).json({
        message: "No documents found matching the criteria.",
      });
    }

    // Iterate over each document and update `generalType` based on `whichTypeQuestion`
    for (const doc of posts) {
      let newGeneralType;

      switch (doc.whichTypeQuestion) {
        case 'multiple choise':
        case 'ranked choise':
        case 'open choice':
          newGeneralType = 'choice';
          break;
        case 'yes/no':
        case 'agree/disagree':
        case 'like/dislike':
          newGeneralType = 'binary';
          break;
        default:
          continue; // Skip documents that do not match any case
      }

      // Update the document with the new `generalType`
      await InfoQuestQuestions.findOneAndUpdate(
        { _id: doc._id },
        { generalType: newGeneralType }
      );

      // console.log(`Document with ID ${doc._id} updated successfully with generalType: ${newGeneralType}.`);
    }

    res.status(200).json({
      message: "Documents updated successfully.",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const postDataPDF = async (req, res) => {
  try {
    // Path to your JSON file
    const filePath = path.join('C:', 'Users', 'Mahad', 'Desktop', 'post_data.json');

    // Read and parse the JSON file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        // console.error('File reading error:', err);
        return res.status(500).json({ error: 'Error reading the file' });
      }

      let postData;
      try {
        postData = JSON.parse(data).postData;
      } catch (parseError) {
        // console.error('JSON parsing error:', parseError);
        return res.status(500).json({ error: 'Error parsing JSON data' });
      }

      // Check if postData is valid
      if (!postData || !Array.isArray(postData)) {
        return res.status(400).json({ error: 'Invalid data format' });
      }

      // Create a new PDF document
      const doc = new PDFDocument();

      // Set response headers to indicate PDF file
      res.setHeader('Content-Disposition', 'attachment; filename="postData.pdf"');
      res.setHeader('Content-Type', 'application/pdf');

      // Pipe the PDF into the response
      doc.pipe(res);

      // Loop through each postData item and add to the PDF
      postData.forEach((post, index) => {
        // Add Post Title as a heading
        doc.fontSize(20).text(post.postTitle, { underline: true });

        // Add the other post details as subheadings
        doc.fontSize(14).text(`Post Topic: ${post.postTopic}`);
        doc.fontSize(14).text(`Post Type: ${post.postType.includes("choise") ? post.postType.replace("choise", "choice") : post.postType}`);
        doc.fontSize(14).text(`All Post Options:`);
        post.allPostOptions.forEach(option => {
          doc.fontSize(12).text(`- ${option}`);
        });
        doc.fontSize(14).text(`Suppressed: ${post.suppressed}`);
        if (post.suppressed) {
          doc.fontSize(14).text(`Suppressed Reason: ${post.suppressedReason}`);
        }
        doc.fontSize(14).text(`Closed: ${post.closed}`);
        doc.fontSize(14).text(`Post Creator: ${post.postCreator}`);
        doc.fontSize(14).text(`Post Options with Results:`);

        // Add Post Options With Results
        post.postOptionsWithResults.forEach(result => {
          doc.fontSize(12).text(`Option: ${result.key}`);

          // Selections
          doc.fontSize(12).text(`Selections:`);
          doc.fontSize(12).text(`Votes: ${result.Selections.votes}`);
          if (result.Selections.users.length > 0) {
            result.Selections.users.forEach(user => {
              doc.fontSize(12).text(`  - ${user}`);
            });
          } else {
            doc.fontSize(12).text(`  - None`);
          }

          // Contentions
          doc.fontSize(12).text(`Contentions:`);
          doc.fontSize(12).text(`Votes: ${result.Contentions.votes}`);
          if (result.Contentions.users.length > 0) {
            result.Contentions.users.forEach(user => {
              doc.fontSize(12).text(`  - ${user}`);
            });
          } else {
            doc.fontSize(12).text(`  - None`);
          }
        });

        // Add space between posts
        if (index !== postData.length - 1) {
          doc.addPage(); // Start a new page for each post
        }
      });

      // Finalize the PDF and end the stream
      doc.end();
    });

  } catch (error) {
    // console.log(error.message);
  }
}

const postDataPDFIndividuals = async (req, res) => {
  try {
    // Path to your JSON file
    const filePath = path.join('C:', 'Users', 'Mahad', 'Desktop', 'post_data.json');

    // Read and parse the JSON file
    const data = await fs.promises.readFile(filePath, 'utf8');
    const { postData } = JSON.parse(data);

    if (!postData || !Array.isArray(postData)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Create a new JSZip instance
    const zip = new JSZip();

    // Generate PDFs and add them to the zip
    for (let i = 0; i < postData.length; i++) {
      const post = postData[i];
      const doc = new PDFDocument();
      const pdfBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        doc.fontSize(14).text(`Post Identifier/Reference/Id: ${post.postId}`);
        doc.fontSize(14).text(`Post Title: ${post.postTitle}`);
        doc.fontSize(14).text(`Post Topic: ${post.postTopic}`);
        doc.fontSize(14).text(`Post Type: ${post.postType.includes("choise") ? post.postType.replace("choise", "choice") : post.postType}`);
        doc.fontSize(14).text(`All Post Options:`);
        post.allPostOptions.forEach(option => {
          doc.fontSize(12).text(`- ${option}`);
        });
        doc.fontSize(14).text(`Suppressed: ${post.suppressed}`);
        if (post.suppressed) {
          doc.fontSize(14).text(`Suppressed Reason: ${post.suppressedReason}`);
        }
        doc.fontSize(14).text(`Closed: ${post.closed}`);
        doc.fontSize(14).text(`Post Creator: ${post.postCreator}`);
        doc.fontSize(14).text(`Post Options with Results:`);

        doc.fontSize(14).text(`Post Feedback:`);
        post.postFeedback.forEach(feedback => {
          const feedbackKey = Object.keys(feedback)[0];
          const feedbackValue = feedback[feedbackKey];
          doc.fontSize(12).text(`- ${feedbackKey}: ${feedbackValue}`);
        });

        post.postOptionsWithResults.forEach(result => {
          doc.fontSize(12).text(`Option: ${result.key}`);
          doc.fontSize(12).text(`Selections:`);
          doc.fontSize(12).text(`Votes: ${result.Selections.votes}`);
          if (result.Selections.users.length > 0) {
            result.Selections.users.forEach(user => {
              doc.fontSize(12).text(`  - ${user}`);
            });
          } else {
            doc.fontSize(12).text(`  - None`);
          }

          doc.fontSize(12).text(`Contentions:`);
          doc.fontSize(12).text(`Votes: ${result.Contentions.votes}`);
          if (result.Contentions.users.length > 0) {
            result.Contentions.users.forEach(user => {
              doc.fontSize(12).text(`  - ${user}`);
            });
          } else {
            doc.fontSize(12).text(`  - None`);
          }
        });

        doc.end();
      });

      zip.file(`post_${post.postId}.pdf`, pdfBuffer);
    }

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    // Send the zip file as a response
    res.setHeader('Content-Disposition', 'attachment; filename="postData.zip"');
    res.setHeader('Content-Type', 'application/zip');
    res.send(zipBuffer);

  } catch (error) {
    // console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const createPDFFromJson = async (req, res) => {
  try {
    // Path to the JSON file on your desktop
    const jsonFilePath = path.join('C:', 'Users', 'Mahad', 'Desktop', 'did you know.json');
    const pdfFilePath = path.join('C:', 'Users', 'Mahad', 'Desktop', 'foundation_did_you_know_dyk.pdf');

    // Read JSON data from file
    let jsonData;
    try {
      const jsonDataRaw = fs.readFileSync(jsonFilePath, 'utf8');
      jsonData = JSON.parse(jsonDataRaw);
    } catch (error) {
      // console.error('Error reading or parsing JSON file:', error);
      return res.status(500).json({ message: 'Failed to read or parse JSON file' });
    }

    // Create a new PDF document
    const doc = new PDFDocument();

    // Pipe the PDF into a file
    doc.pipe(fs.createWriteStream(pdfFilePath));

    // Define font sizes
    const headerFontSize = 12;
    const textFontSize = 10;

    // // Add title to the document
    // doc.fontSize(headerFontSize).text('Foundation Did You Know Messages', {
    //   align: 'center'
    // });
    // doc.moveDown(1);

    // Iterate through JSON data and add it to the document
    for (const [section, items] of Object.entries(jsonData)) {
      doc.fontSize(headerFontSize).text(section, { underline: false });
      doc.moveDown(0.5);

      // Check if items is an array
      if (Array.isArray(items)) {
        items.forEach(item => {
          doc.fontSize(headerFontSize).text(item.header);
          doc.moveDown(0.5);

          doc.fontSize(textFontSize);
          item.text.forEach(line => {
            doc.text(line);
          });

          doc.moveDown(1);
        });
      } else {
        // console.warn(`Expected an array for section "${section}", but found:`, items);
      }

      doc.moveDown(1);
    }

    // Finalize the PDF and end the stream
    doc.end();

    // console.log(`PDF created successfully at ${pdfFilePath}`);
    res.status(200).json({ message: "Success" });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: "Failed to create PDF" });
  }
}

const userInfo = async (uuid) => {
  try {
    const userUuid = uuid;

    const user = await User.findOne({ uuid: userUuid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const sharedQuests = await UserQuestSetting.find({
      uuid: userUuid,
      linkStatus: "Enable",
    });
    const totals = sharedQuests.reduce(
      (acc, quest) => {
        acc.questImpression += quest.questImpression || 0;
        acc.questsCompleted += quest.questsCompleted || 0;
        return acc;
      },
      { questImpression: 0, questsCompleted: 0 }
    );

    const questsIds = await InfoQuestQuestions.find(
      { uuid: userUuid },
      { _id: 1 }
    );
    const questsIdsArray = questsIds.map((doc) => doc._id.toString());

    const result = await UserQuestSetting.aggregate([
      {
        $match: {
          hidden: true,
          questForeignKey: { $in: questsIdsArray },
          uuid: { $ne: userUuid },
        },
      },
      {
        $group: { _id: null, uniqueQuests: { $addToSet: "$questForeignKey" } },
      },
      { $project: { _id: 0, totalCount: { $size: "$uniqueQuests" } } },
    ]);

    const otherHidingOurQuestsCount =
      result.length > 0 ? result[0].totalCount : 0;

    const suppressQuestsCount = await InfoQuestQuestions.countDocuments({
      uuid: userUuid,
      suppressed: true,
    });

    // Total shared lists count for a specific user
    const totalSharedListsCount = await UserListSchema.aggregate([
      { $match: { userUuid: userUuid } },
      { $unwind: "$list" },
      { $match: { "list.link": { $ne: null } } },
      { $count: "totalSharedListsCount" },
    ]);
    // Total shared lists clicks count for a specific user
    const totalSharedListsClicksCount = await UserListSchema.aggregate([
      { $match: { userUuid: userUuid } },
      { $unwind: "$list" },
      { $match: { "list.link": { $ne: null } } },
      { $group: { _id: null, totalClicks: { $sum: "$list.clicks" } } },
    ]);
    // Total shared lists participents count for a specific user
    const totalSharedListsParticipentsCount = await UserListSchema.aggregate([
      { $match: { userUuid: userUuid } },
      { $unwind: "$list" },
      { $match: { "list.link": { $ne: null } } },
      {
        $group: {
          _id: null,
          totalParticipents: { $sum: "$list.participents" },
        },
      },
    ]);
    // Extracting counts from aggregation results
    const count =
      totalSharedListsCount.length > 0
        ? totalSharedListsCount[0].totalSharedListsCount
        : 0;
    const clicksCount =
      totalSharedListsClicksCount.length > 0
        ? totalSharedListsClicksCount[0].totalClicks
        : 0;
    const participentsCount =
      totalSharedListsParticipentsCount.length > 0
        ? totalSharedListsParticipentsCount[0].totalParticipents
        : 0;

    const questIds = await InfoQuestQuestions.find({ uuid: userUuid }).select('_id').lean();

    const resUser = {
      ...user._doc,
      sharedQuestsStatistics: {
        sharedQuests: sharedQuests.length,
        totalQuestsImpression: totals.questImpression,
        totalQuestsCompleted: totals.questsCompleted,
      },
      feedBackQuestsStatistics: {
        otherHidingOurQuestsCount: otherHidingOurQuestsCount,
        suppressQuestsCount: suppressQuestsCount,
      },
      questsActivity: {
        myHiddenQuestsCount: await UserQuestSetting.countDocuments({
          hidden: true,
          uuid: userUuid,
        }),
        feedbackGiven: await UserQuestSetting.countDocuments({
          feedbackMessage: { $ne: "" },
          uuid: userUuid,
        }),
        feedbackReceived: await UserQuestSetting.countDocuments({
          questForeignKey: { $in: questIds.map(q => q._id) },
          feedbackMessage: { $ne: "" }
        }),
        myCreatedQuestsCount: await InfoQuestQuestions.countDocuments({
          uuid: userUuid,
          isActive: true,
        }),
        myQuestsEngagementCount: await StartQuests.countDocuments({
          uuid: userUuid,
        }),
      },
      myListStatistics: {
        totalSharedListsCount: count,
        totalSharedListsClicksCount: clicksCount,
        totalSharedListsParticipentsCount: participentsCount,
      },
      allCount: await User.countDocuments({}),
      mailCount: await Email.countDocuments({ subscribed: true }),
    };

    return resUser;
  } catch (error) {
    // console.error(error.message);
    res.status(500).json({
      message: `An error occurred while processing userInfo: ${error.message}`,
    });
  }
};

// Function to generate PDF for a single document
// const generatePDF = (data) => {
//   try {
//     return new Promise((resolve, reject) => {
//       // Create a new PDF document
//       const doc = new PDFDocument();

//       // Create the file name based on the encrypted UUID
//       const fileName = `participant_${data.email}.pdf`;

//       // Create the file path
//       const filePath = path.join(outputDir, fileName);

//       // Pipe the PDF document to a file
//       const writeStream = fs.createWriteStream(filePath);
//       doc.pipe(writeStream);

//       doc.moveDown();
//       doc.fontSize(15).text(`Participant: ${data.uuid}`);
//       doc.fontSize(15).text(`Email: ${data.email}`);

//       doc.moveDown();
//       doc.text(`Badges: `);
//       if (Array.isArray(data.badges)) {
//         data.badges.forEach(badge => {
//           doc.text(JSON.stringify(badge, null, 2));
//         });
//       } else {
//         doc.text(data.badges); // No non-PI data badge message
//       }

//       doc.moveDown();
//       doc.text(`Foundation Account Settings and Details`);
//       doc.text(`Custom Encryption: ${data.isPasswordEncryption}`);
//       doc.text(`Email Notification Setting: ${data.notificationSettings.emailNotifications}`);
//       doc.text(`System Notification Setting: ${data.notificationSettings.systemNotifications}`);
//       doc.text(`DarkMode Setting: ${data.userSettings.darkMode}`);
//       doc.text(`DefaultSort Setting: ${data.userSettings.defaultSort}`);
//       doc.text(`Balance: ${data.balance}`);
//       doc.text(`Earned FDX: ${data.fdxEarned}`);
//       doc.text(`Spent FDX: ${data.fdxSpent}`);

//       // Add other details like statistics, activities, etc.
//       doc.moveDown();
//       doc.text(`Content on Foundation Settings and Details`);
//       doc.text(`Created Posts: ${data.createdQuests}`);
//       doc.text(`Completed Posts: ${data.completedQuests}`);
//       doc.text(`Shared-Posts: ${data.sharedQuestsStatistics.sharedQuests}`);
//       doc.text(`Posts Impression: ${data.sharedQuestsStatistics.totalQuestsImpression}`);
//       doc.text(`Posts Completed: ${data.sharedQuestsStatistics.totalQuestsCompleted}`);
//       doc.text(`Hidden Posts by Others: ${data.feedBackQuestsStatistics.otherHidingOurQuestsCount}`);
//       doc.text(`Suppressed Posts by Others: ${data.feedBackQuestsStatistics.suppressQuestsCount}`);
//       doc.text(`Posts Hidden by Me: ${data.questsActivity.myHiddenQuestsCount}`);
//       doc.text(`Given Feedbacks: ${data.questsActivity.feedbackGiven}`);
//       doc.text(`Received Feedbacks: ${data.questsActivity.feedbackReceived}`);
//       // doc.text(`Post Activities: ${data.questsActivity.myCreatedQuestsCount}`);
//       // doc.text(`Post Activities: ${data.questsActivity.myQuestsEngagementCount}`);
//       doc.text(`Shared-Lists Count: ${data.myListStatistics.totalSharedListsCount}`);
//       doc.text(`Lists Impressions: ${data.myListStatistics.totalSharedListsClicksCount}`);
//       doc.text(`Lists Participation: ${data.myListStatistics.totalSharedListsParticipentsCount}`);

//       // Add more data as required...

//       // Finalize the PDF
//       doc.end();

//       // Resolve the promise once writing is complete
//       writeStream.on('finish', () => {
//         resolve(filePath); // Return the file path
//       });

//       writeStream.on('error', (err) => {
//         reject(err);
//       });
//     });
//   } catch (error) {
//     // console.log(error);
//     throw error;
//   }
// };

const createUserPDFs = async (req, res) => {
  try {
    // Fetch all users with role 'user' and retrieve only their uuid
    const users = await User.find({
      role: 'user',
      badges: { $exists: true, $not: { $size: 0 } } // Ensure badges exist and have more than 0 elements
    }, { uuid: 1, _id: 0 });

    // Map over each user and call the external API for each uuid
    const userDataPromises = users.map(async (user) => {
      // Convert the response to JSON
      const data = await userInfo(user.uuid);

      // Filter badges to include only those with a 'personal' key containing the required fields
      let filteredBadges = data.badges.filter(badge => {
        const personal = badge.personal;

        if (!personal) {
          return false;
        }

        // Check if any of the required keys exist in the 'personal' object
        const requiredKeys = [
          'hometown',
          'currentCity',
          'sex',
          'relationshipStatus',
          'dateOfBirth',
          'work',
          'education'
        ];

        return requiredKeys.some(key => key in personal);
      }).map(badge => badge.personal);  // Return only the 'personal' object;
      // If no badges are found, set to default message
      if (filteredBadges.length === 0) {
        filteredBadges = "No non-pi data badge added yet.";
      }

      // Default email value
      let email = 'No email found';

      // Find the badge where primary is true
      const primaryBadge = data.badges.find(badge => badge.primary === true);

      if (primaryBadge) {
        // Check the accountName and set the email based on conditions
        const { accountName } = primaryBadge;

        if (accountName === 'google' || accountName === 'Email') {
          email = data.email;
        } else if (
          accountName === 'facebook' ||
          accountName === 'linkedin' ||
          accountName === 'twitter' ||
          accountName === 'instagram' ||
          accountName === 'github'
        ) {
          email = `No email for ${accountName} account`;
        }
      }

      const userPdfData = {
        uuid: encryptData(data.uuid),
        email: email,
        badges: filteredBadges,
        createdQuests: data.createdQuests.length,
        completedQuests: data.completedQuests.length,
        sharedQuestsStatistics: data.sharedQuestsStatistics,
        feedBackQuestsStatistics: data.feedBackQuestsStatistics,
        questsActivity: data.questsActivity,
        myListStatistics: data.myListStatistics,
        isPasswordEncryption: data.isPasswordEncryption,
        notificationSettings: data.notificationSettings,
        userSettings: data.userSettings,
        balance: data.balance,
        fdxEarned: data.fdxEarned,
        fdxSpent: data.fdxSpent,
      }

      // generatePDF(userPdfData);

      return userPdfData; // Store the data from the API response
    });

    // Wait for all the promises to resolve
    const userDataArray = await Promise.all(userDataPromises);

    if (!userDataArray) throw new Error("No Data Set created");

    res.status(200).json({ message: "Success", });
  } catch (error) {
    // Handle errors
    // console.error(error);
    res.status(500).json({ message: `Internal server error: ${error}` });
  }
};

const generatePostJSON = async (post) => {
  try {
    const postId = post._id;
    const postTitle = post.Question;
    const postTopic = post.QuestTopic;
    const postType = post.whichTypeQuestion;
    const allPostOptions = post.QuestAnswers.map((answer) => answer.question); // Extract the questions as strings
    const suppressed = post.suppressed;
    const suppressedReason = post.suppressedReason || "";
    const closed = post.isClosed ? "Historical" : "Open";
    const postCreator = encryptData(post.uuid);

    const feedbackResultArray = await getFeedback(post._id);

    const resultArray = await getSelectionsContentions({
      body: { questForeignKey: post._id },
    });

    // Add data to JSON array
    const jsonData = {
      postId,
      postTitle,
      postTopic,
      postType,
      allPostOptions,
      suppressed,
      suppressedReason,
      closed,
      postCreator,
      postFeedback: feedbackResultArray,
      postOptionsWithResults: resultArray,
    };

    return jsonData;

  } catch (error) {
    // console.error(error.message);
    throw error;
  }
};

const generatePostPDF = async (post) => {
  try {
    // Create a new PDF document
    const doc = new PDFDocument();

    // Path to save the PDF
    const fileName = `post_${post.postId}.pdf`;
    const filePath = path.join(__dirname, fileName); // Save in the current directory

    // Create a writable stream to save the PDF
    const pdfStream = fs.createWriteStream(filePath);

    // Pipe the PDF document to the writable stream
    doc.pipe(pdfStream);

    // Write content to the PDF
    doc.fontSize(14).text(`Post Identifier/Reference/Id: ${post.postId}`);
    doc.fontSize(14).text(`Post Title: ${post.postTitle}`);
    doc.fontSize(14).text(`Post Topic: ${post.postTopic}`);
    doc.fontSize(14).text(`Post Type: ${post.postType.includes("choise") ? post.postType.replace("choise", "choice") : post.postType}`);
    doc.fontSize(14).text(`All Post Options:`);
    post.allPostOptions.forEach(option => {
      doc.fontSize(12).text(`- ${option}`);
    });
    doc.fontSize(14).text(`Suppressed: ${post.suppressed}`);
    if (post.suppressed) {
      doc.fontSize(14).text(`Suppressed Reason: ${post.suppressedReason}`);
    }
    doc.fontSize(14).text(`Closed: ${post.closed}`);
    doc.fontSize(14).text(`Post Creator: ${post.postCreator}`);
    doc.fontSize(14).text(`Post Options with Results:`);

    doc.fontSize(14).text(`Post Feedback:`);
    post.postFeedback.forEach(feedback => {
      const feedbackKey = Object.keys(feedback)[0];
      const feedbackValue = feedback[feedbackKey];
      doc.fontSize(12).text(`- ${feedbackKey}: ${feedbackValue}`);
    });

    const quest = await InfoQuestQuestions.findOne(
      {
        _id: new mongoose.Types.ObjectId(post.postId),
      }
    );

    if (post.postType === "ranked choise") {
      doc.fontSize(14).text(`Results:`);

      // Check if selectedPercentage exists and is an array
      if (quest && quest.selectedPercentage && Array.isArray(quest.selectedPercentage) && quest.selectedPercentage.length > 0) {
        // Loop through each entry in selectedPercentage
        quest.selectedPercentage.forEach(percentageObj => {
          // Ensure percentageObj is a valid object before looping through it
          if (percentageObj && typeof percentageObj === 'object') {
            doc.fontSize(12).text(`Selection:`);

            // Sort the percentageObj in descending order and display the results
            sortPercentageObj(percentageObj).forEach(([key, percentage]) => {
              // Write the key and percentage in the desired format for selected
              doc.fontSize(12).text(` - ${key}: (${percentage} top choice)`);
            });
          } else {
            doc.fontSize(12).text("No selected percentage data available.");
          }
        });
      } else {
        doc.fontSize(12).text("No selected percentage data available.");
      }

      // Check if contendedPercentage exists and is an array
      if (quest && quest.contendedPercentage && Array.isArray(quest.contendedPercentage) && quest.contendedPercentage.length > 0) {
        // Loop through each entry in contendedPercentage
        quest.contendedPercentage.forEach(percentageObj => {
          // Ensure percentageObj is a valid object before looping through it
          if (percentageObj && typeof percentageObj === 'object') {
            doc.fontSize(12).text(`Contention:`);

            // Sort the percentageObj in descending order and display the results
            sortPercentageObj(percentageObj).forEach(([key, percentage]) => {
              // Write the key and percentage in the desired format for contended
              doc.fontSize(12).text(` - ${key}: (${percentage} top choice)`);
            });
          } else {
            doc.fontSize(12).text("No contended percentage data available.");
          }
        });
      } else {
        doc.fontSize(12).text("No contended percentage data available.");
      }
    } else {
      doc.fontSize(14).text(`Results:`);
      // Check if selectedPercentage exists and is an array
      if (quest && quest.selectedPercentage && Array.isArray(quest.selectedPercentage) && quest.selectedPercentage.length > 0) {
        // Loop through each entry in selectedPercentage
        quest.selectedPercentage.forEach(percentageObj => {
          // Ensure percentageObj is a valid object before looping through it
          if (percentageObj && typeof percentageObj === 'object') {
            doc.fontSize(12).text(`Selection:`);

            // Sort the percentageObj in descending order and display the results
            sortPercentageObj(percentageObj).forEach(([key, percentage]) => {
              // Write the key and percentage in the desired format for selected
              doc.fontSize(12).text(` - ${key}: (${percentage})`);
            });
          } else {
            doc.fontSize(12).text("No selected percentage data available.");
          }
        });
      } else {
        doc.fontSize(12).text("No selected percentage data available.");
      }
      // Check if contendedPercentage exists and is an array
      if (quest && quest.contendedPercentage && Array.isArray(quest.contendedPercentage) && quest.contendedPercentage.length > 0) {
        // Loop through each entry in contendedPercentage
        quest.contendedPercentage.forEach(percentageObj => {
          // Ensure percentageObj is a valid object before looping through it
          if (percentageObj && typeof percentageObj === 'object') {
            doc.fontSize(12).text(`Contention:`);

            // Sort the percentageObj in descending order and display the results
            sortPercentageObj(percentageObj).forEach(([key, percentage]) => {
              // Write the key and percentage in the desired format for contended
              doc.fontSize(12).text(` - ${key}: (${percentage})`);
            });
          } else {
            doc.fontSize(12).text("No contended percentage data available.");
          }
        });
      } else {
        doc.fontSize(12).text("No contended percentage data available.");
      }

      doc.fontSize(14).text(`Participants:`);
      // Sort the results array in descending order based on the total votes (Selections + Contentions)
      post.postOptionsWithResults.sort((a, b) => {
        const totalVotesA = a.Selections.votes + a.Contentions.votes;
        const totalVotesB = b.Selections.votes + b.Contentions.votes;
        return totalVotesB - totalVotesA; // Sort descending
      });
      // Iterate over the sorted array
      post.postOptionsWithResults.forEach(result => {
        doc.fontSize(12).text(`Option: ${result.key}`);
        doc.fontSize(12).text(`Selections:`);
        doc.fontSize(12).text(`Votes: ${result.Selections.votes}`);

        if (result.Selections.users.length > 0) {
          result.Selections.users.forEach(user => {
            doc.fontSize(12).text(`  - ${user}`);
          });
        } else {
          doc.fontSize(12).text(`  - None`);
        }

        doc.fontSize(12).text(`Contentions:`);
        doc.fontSize(12).text(`Votes: ${result.Contentions.votes}`);

        if (result.Contentions.users.length > 0) {
          result.Contentions.users.forEach(user => {
            doc.fontSize(12).text(`  - ${user}`);
          });
        } else {
          doc.fontSize(12).text(`  - None`);
        }
      });
    }

    // Finalize the PDF
    doc.end();

    // Wait until the PDF is fully written
    await new Promise((resolve, reject) => {
      pdfStream.on('finish', resolve);
      pdfStream.on('error', reject);
    });

    // Return the generated file name
    return fileName;

  } catch (error) {
    // console.error('Error generating PDF:', error.message);
    throw new Error('Failed to generate PDF');
  }
};

async function splitPDFIntoChunks(pdfDocument) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  // Ensure that pdfDocument is an array of documents
  const documents = Array.isArray(pdfDocument) ? pdfDocument : [pdfDocument];

  // Use the splitDocuments function for an array
  const chunks = await textSplitter.splitDocuments(documents);

  // // console.log(`Split the document into ${chunks.length} chunks.`);
  return chunks;
}

const prepareUserPdfData = (data) => {
  try {

    // Filter badges to include only those with a 'personal' key containing the required fields
    let filteredBadges = data.badges.filter(badge => {
      const personal = badge.personal;

      if (!personal) {
        return false;
      }

      // Check if any of the required keys exist in the 'personal' object
      const requiredKeys = [
        'hometown',
        'currentCity',
        'sex',
        'relationshipStatus',
        'dateOfBirth',
        'work',
        'education'
      ];

      return requiredKeys.some(key => key in personal);
    }).map(badge => badge.personal);  // Return only the 'personal' object;
    // If no badges are found, set to default message
    if (filteredBadges.length === 0) {
      filteredBadges = "No non-pi data badge added yet.";
    }

    // Default email value
    let email = 'No email found';

    // Find the badge where primary is true
    const primaryBadge = data.badges.find(badge => badge.primary === true);

    if (primaryBadge) {
      // Check the accountName and set the email based on conditions
      const { accountName } = primaryBadge;

      if (accountName === 'google' || accountName === 'Email') {
        email = data.email;
      } else if (
        accountName === 'facebook' ||
        accountName === 'linkedin' ||
        accountName === 'twitter' ||
        accountName === 'instagram' ||
        accountName === 'github'
      ) {
        email = `No email for ${accountName} account`;
      }
    }

    const userPdfData = {
      uuid: encryptData(data.uuid),
      email: email,
      badges: filteredBadges,
      createdQuests: data.createdQuests.length,
      completedQuests: data.completedQuests.length,
      sharedQuestsStatistics: data.sharedQuestsStatistics,
      feedBackQuestsStatistics: data.feedBackQuestsStatistics,
      questsActivity: data.questsActivity,
      myListStatistics: data.myListStatistics,
      isPasswordEncryption: data.isPasswordEncryption,
      notificationSettings: data.notificationSettings,
      userSettings: data.userSettings,
      balance: data.balance,
      fdxEarned: data.fdxEarned,
      fdxSpent: data.fdxSpent,
    }

    return userPdfData;

  } catch (error) {
    throw error;
  }
}

const generateUserPDF = (data) => {
  try {
    return new Promise((resolve, reject) => {
      // Create a new PDF document
      const doc = new PDFDocument();

      // Create the file name based on the email
      const fileName = `participant_${encryptData(data.uuid)}.pdf`;

      // Create the file path in the current directory
      const filePath = path.resolve(__dirname, fileName);

      // Pipe the PDF document to a file
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Add participant details
      doc.moveDown();
      doc.fontSize(15).text(`Participant Details`, { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`UUID: ${data.uuid}`);
      doc.text(`Email: ${data.email}`);

      // Add badges
      doc.moveDown();
      doc.fontSize(15).text(`Badges`, { underline: true });
      doc.moveDown();
      if (data.badges && Array.isArray(data.badges)) {
        data.badges.forEach((badge, index) => {
          doc.fontSize(12).text(`Badge ${index + 1}: ${JSON.stringify(badge, null, 2)}`);
        });
      } else {
        doc.text(`No badges available.`);
      }

      // Add foundation account settings and details
      doc.moveDown();
      doc.fontSize(15).text(`Foundation Account Settings and Details`, { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Custom Encryption: ${data.isPasswordEncryption}`);
      doc.text(`Email Notification Setting: ${data.notificationSettings.emailNotifications}`);
      doc.text(`System Notification Setting: ${data.notificationSettings.systemNotifications}`);
      doc.text(`Dark Mode: ${data.userSettings.darkMode}`);
      doc.text(`Default Sort: ${data.userSettings.defaultSort}`);
      doc.text(`Balance: ${data.balance}`);
      doc.text(`Earned FDX: ${data.fdxEarned}`);
      doc.text(`Spent FDX: ${data.fdxSpent}`);

      // Add statistics and activities
      doc.moveDown();
      doc.fontSize(15).text(`Statistics and Activities`, { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Created Posts: ${data.createdQuests}`);
      doc.text(`Completed Posts: ${data.completedQuests}`);
      doc.text(`Shared Posts: ${data.sharedQuestsStatistics.sharedQuests}`);
      doc.text(`Posts Impression: ${data.sharedQuestsStatistics.totalQuestsImpression}`);
      doc.text(`Posts Completed: ${data.sharedQuestsStatistics.totalQuestsCompleted}`);
      doc.text(`Hidden Posts by Others: ${data.feedBackQuestsStatistics.otherHidingOurQuestsCount}`);
      doc.text(`Suppressed Posts by Others: ${data.feedBackQuestsStatistics.suppressQuestsCount}`);
      doc.text(`Posts Hidden by Me: ${data.questsActivity.myHiddenQuestsCount}`);
      doc.text(`Given Feedbacks: ${data.questsActivity.feedbackGiven}`);
      doc.text(`Received Feedbacks: ${data.questsActivity.feedbackReceived}`);
      doc.text(`Shared Lists Count: ${data.myListStatistics.totalSharedListsCount}`);
      doc.text(`Lists Impressions: ${data.myListStatistics.totalSharedListsClicksCount}`);
      doc.text(`Lists Participation: ${data.myListStatistics.totalSharedListsParticipentsCount}`);

      // Finalize the PDF
      doc.end();

      // Resolve the promise once writing is complete
      writeStream.on("finish", () => {
        resolve(filePath); // Return the file path
      });

      writeStream.on("error", (err) => {
        reject(err);
      });
    });
  } catch (error) {
    // console.error(error);
    throw error;
  }
};

const embedDailyUser = async (req, res) => {
  try {
    // console.log("Starting the user embedding process...");

    // Set up SBERT embeddings
    const model = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

    // Set up vector store
    const vectorStore = new MongoDBAtlasVectorSearch(model, {
      collection: connKnowledgeBase.collection("user"),
      indexName: "vector_index_users",
      textKey: "text",
      embeddingKey: "embedding",
    });

    const RagUser = connKnowledgeBase.model(
      "RagUser",
      new mongoose.Schema(
        { text: String, embedding: Array, source: String, pdf: Object, loc: Object },
        { collection: "user" }
      )
    );

    // Get today's date
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0]; // Get 'YYYY-MM-DD' format

    const docsToEmbed = await User.find({
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          todayISO,
        ],
      },
    });


    // console.log(`Found ${docsToEmbed.length} documents to embed.`);

    let counter = 0;

    for (const user of docsToEmbed) {
      try {
        // console.log(`Processing user with UUID: ${user.uuid}`);

        // Clear existing embeddings
        const result = await RagUser.deleteMany({
          source: { $regex: new RegExp(`participant_${encryptData(user.uuid)}\\.pdf`) },
        });
        // console.log(`Deleted ${result.deletedCount} existing documents for UUID: ${encryptData(user.uuid)}`);

        // Fetch user data and generate PDF
        const data = await userInfo(user.uuid);
        const userPdfData = prepareUserPdfData(data);
        const pdfFilePath = await generateUserPDF(userPdfData);

        // Process PDF
        const loader = new PDFLoader(pdfFilePath, { splitPages: false });
        const pdfData = await loader.load();

        if (!pdfData) {
          // console.error(`Failed to load PDF document: ${userPdfData.email}`);
          continue;
        }

        // Split PDF into chunks and add to vector store
        const splitDocs = await splitPDFIntoChunks(pdfData);
        const embedResult = await vectorStore.addDocuments(splitDocs);
        // console.log(`Embedded ${embedResult.length} documents ${userPdfData.email}`);

        // Delete PDF file
        await fs.promises.unlink(pdfFilePath);
        // console.log(`Deleted temporary PDF file: ${userPdfData.email}`);

        counter++;
      } catch (userError) {
        // console.error(`Error processing user ${user.uuid}: ${userError.message}`);
      }
    }

    // console.log(`${counter} users' data embedded successfully.`);
    // console.log("User rag is updated with latest posts data.");

    res.status(200).json({ message: `User embed done embedding ${counter} documents from foundation.` });
  } catch (error) {
    // console.error("Error in embedding process:", error.message);
    throw error;
  }
};


const embedDailyPosts = async () => {
  try {
    const questRagPostsDoc = await QuestRagUpdate.findOne({});
    const dailyQuestsToEmbed = questRagPostsDoc.dailyQuestsToEmbed;

    // Set up SBERT embeddings
    const model = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

    // Set up the vector store with MongoDBAtlasVectorSearch using the new connection
    const vectorStore = new MongoDBAtlasVectorSearch(model, {
      collection: connKnowledgeBase.collection("knowladgebaseone"), // Use the new connection's collection
      indexName: "vector_index", // Use the index name you configured in Atlas
      textKey: "text", // Field for the original text
      embeddingKey: "embedding", // Field for the embedding vectors
    });

    const KnowledgeBaseOne = connKnowledgeBase.model(
      'KnowledgeBaseOne', // Model name
      new mongoose.Schema(
        { text: String, embedding: Array, source: String, pdf: Object, loc: Object },
        { collection: 'knowladgebaseone' } // Explicit collection name
      )
    );
    let counter = 0;

    for (const post_id of dailyQuestsToEmbed) {
      // Use template literals to dynamically construct the regex
      const result = await KnowledgeBaseOne.deleteMany({
        source: { $regex: new RegExp(`post_${post_id}\\.pdf`) }
      });
      // Log how many documents were deleted
      // console.log(`Deleted ${result.deletedCount} document(s) for post: ${post_id}`);

      const infoQuest = await InfoQuestQuestions.findOne(
        {
          _id: new mongoose.Types.ObjectId(post_id)
        }
      );

      const jsonData = await generatePostJSON(infoQuest);
      const pdfFileName = await generatePostPDF(jsonData);

      // Assuming 'file' contains the name of the PDF file
      const filePath = path.join(__dirname, pdfFileName); // Full path to the PDF file in the current directory

      // Read the PDF file from the local filesystem
      const loader = new PDFLoader(filePath, { splitPages: false });
      const pdfData = await loader.load();

      // Check if the PDF file was successfully loaded
      if (!pdfData) {
        // console.error(`Failed to load PDF document: ${file}`);
        continue; // Skip to the next file if loading failed
      }

      // Split the PDF document into chunks
      const splitDocs = await splitPDFIntoChunks(pdfData);

      // Add the split documents to the vector store
      const embedResult = await vectorStore.addDocuments(splitDocs);
      counter++;
      // console.log(`${counter} Imported ${embedResult.length} documents from ${filePath} into the MongoDB Atlas vector store.`);

      // Delete the PDF file from the current directory using callback
      fs.unlink(filePath, (error) => {
        if (error) {
          // console.error(`Failed to delete PDF file: ${pdfFileName}. Error: ${error.message}`);
        } else {
          // console.log(`Deleted PDF file: ${pdfFileName}`);
        }
      });
    }

    questRagPostsDoc.dailyQuestsToEmbed = [];
    await questRagPostsDoc.save();

    // console.log("Post rag is updated with latest posts data");

  } catch (error) {
    // console.error(error.message);
    throw error;
  }
};

const generatePostPdfForTest = async (req, res) => {
  try {

    const posts = await InfoQuestQuestions.find(
      {
        whichTypeQuestion: "ranked choise"
      }
    );

    const postsIds = posts.map(doc => doc._id);

    for (const post_id of postsIds) {
      const infoQuest = await InfoQuestQuestions.findOne(
        {
          _id: new mongoose.Types.ObjectId(post_id)
        }
      );

      const jsonData = await generatePostJSON(infoQuest);
      const pdfFileName = await generatePostPDF(jsonData);
    }
    res.status(200).json({ message: "Files Generated Successfully" });

  } catch (error) {
    // console.error(error.message);
    throw error;
  }
};

const tempRemoval = async (req, res) => {
  try {
    const userId = req.params.id; // Assuming you're passing the user ID as a URL parameter

    // Update the User document
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId }, // Find user by ID
      {
        $pull: {
          badges: {
            primary: { $ne: true } // Remove all badges except the one where primary is true
          }
        }
      },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send back the updated user data
    res.status(200).json(updatedUser);

  } catch (error) {
    // console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const postsForcedEmbed = async (req, res) => {
  try {

    const posts = await InfoQuestQuestions.find(
      {},
      { _id: 1 }  // Project only the _id field
    );

    const postIds = posts.map(post => post._id.toString());

    // Set up SBERT embeddings
    const model = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

    // Set up the vector store with MongoDBAtlasVectorSearch using the new connection
    const vectorStore = new MongoDBAtlasVectorSearch(model, {
      collection: connKnowledgeBase.collection("knowladgebaseone"), // Use the new connection's collection
      indexName: "vector_index", // Use the index name you configured in Atlas
      textKey: "text", // Field for the original text
      embeddingKey: "embedding", // Field for the embedding vectors
    });

    const KnowledgeBaseOne = connKnowledgeBase.model(
      'KnowledgeBaseOne', // Model name
      new mongoose.Schema(
        { text: String, embedding: Array, source: String, pdf: Object, loc: Object },
        { collection: 'knowladgebaseone' } // Explicit collection name
      )
    );
    let counter = 0;

    for (const post_id of postIds) {
      // Use template literals to dynamically construct the regex
      const result = await KnowledgeBaseOne.deleteMany({
        source: { $regex: new RegExp(`post_${post_id}\\.pdf`) }
      });
      // Log how many documents were deleted
      // // console.log(`Deleted ${result.deletedCount} document(s) for post: ${post_id}`);

      const infoQuest = await InfoQuestQuestions.findOne(
        {
          _id: new mongoose.Types.ObjectId(post_id)
        }
      );

      const jsonData = await generatePostJSON(infoQuest);
      const pdfFileName = await generatePostPDF(jsonData);

      // Assuming 'file' contains the name of the PDF file
      const filePath = path.join(__dirname, pdfFileName); // Full path to the PDF file in the current directory

      // Read the PDF file from the local filesystem
      const loader = new PDFLoader(filePath, { splitPages: false });
      const pdfData = await loader.load();

      // Check if the PDF file was successfully loaded
      if (!pdfData) {
        // console.error(`Failed to load PDF document: ${file}`);
        continue; // Skip to the next file if loading failed
      }

      // Split the PDF document into chunks
      const splitDocs = await splitPDFIntoChunks(pdfData);

      // Add the split documents to the vector store
      const embedResult = await vectorStore.addDocuments(splitDocs);
      counter++;
      // console.log(`${counter}: Imported ${embedResult.length} documents from ${pdfFileName} into rag.`);

      // Delete the PDF file from the current directory using callback
      fs.unlink(filePath, (error) => {
        if (error) {
          // console.error(`Failed to delete PDF file: ${pdfFileName}. Error: ${error.message}`);
        } else {
          // console.log(`Deleted PDF file: ${pdfFileName}`);
        }
      });
    }

    // console.log(`${counter} documents embedded`);
    res.status(200).json({ message: "Forced Embed Successfull" });

  } catch (error) {
    // console.error(error.message);
    throw error;
  }
};

const articleSEO = async (req, res) => {
  try {
    const articles = await Article.find(
      {
        linkGenerated: true
      }
    );

    for (const doc of articles) {
      if (MODE === "PROD") {
        const uploadedArticle = await uploadS3Bucket({
          fileName: doc._id,
          description: doc.seoSummary,
          route: "static_pages/articles",
          title: doc.title,
          serviceType: "articles",
        });
        if (!uploadedArticle) throw new Error(`Article ${doc._id} could not be uploaded.`);
      }
    }

    res.status(200).json({
      message: "Articles updated successfully on the clould.",
    });

  } catch (error) {
    // console.log(error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sharedPostImageSEO = async (req, res) => {
  try {
    // Find all documents where the link is a valid non-empty string
    const userQuestSettings = await UserQuestSetting.find({
      link: { $ne: "", $exists: true }  // Ensures link is not empty and exists
    });

    let counter = 1;

    // Loop through each UserQuestSetting document
    for (const userQuestSetting of userQuestSettings) {

      // Find the corresponding document in InfoQuestQuestions using questForeignKey
      const infoQuestQuestion = await InfoQuestQuestions.findOne({ _id: userQuestSetting.questForeignKey });

      if (infoQuestQuestion) {
        // Create the request body
        const requestBody = {
          questStartData: infoQuestQuestion,
          link: userQuestSetting.link,
        };

        // Make a POST request to the sharedLinkDynamicImage API
        const response = await fetch('http://localhost:7354/userQuestSetting/sharedLinkDynamicImage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // Process the response
        if (response.ok) {
          const result = await response.json();
          // console.log('Response Counter:', counter);
          counter++;
        } else {
          // console.error(`Failed to send data for questForeignKey: ${userQuestSetting.questForeignKey}`);
        }
      } else {
        // console.log(`No document found for questForeignKey: ${userQuestSetting.questForeignKey}`);
      }

      // Wait for 10 seconds before the next iteration
      // await sleep(10000); // 10000 ms = 10 seconds
    }
  } catch (error) {
    // console.log(error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
}

const homepageSEO = async (req, res) => {
  try {
    const users = await User.find(
      {
        role: "user",
        "badges.domain": { $exists: true }
      }
    );

    const domainsArray = users.map((user) => {
      // Extract the domains from each user's badges array
      return user.badges
        .filter(badge => badge.domain) // Filter badges where domain exists
        .map(badge => badge.domain);  // Get the domain value from each badge
    }).flat();  // Flatten the array if you want all domains in a single array

    for (const doc of domainsArray) {
      if (MODE === "PROD") {
        await uploadS3Bucket({
          fileName: doc?.name,
          description: doc?.description,
          route: "static_pages/homepage",
          title: doc?.title,
          domainS3Urls: doc?.s3Urls?.length > 0 ? doc?.s3Urls : [],
          serviceType: "homepage",
        });
      }
    }

    res.status(200).json({
      message: "Hompage SEO updated successfully on the clould.",
    });

  } catch (error) {
    // console.log(error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
}

// S3 Upload Endpoint
const upload = async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;

    let upload;
    if (MODE === "PROD") {
      upload = await uploadFileToS3FromBuffer(fileBuffer);
    }

    res.status(200).send({
      message: "Image uploaded successfully",
      fileUrl: upload,
    });
  } catch (error) {
    // console.error("Error uploading blob to S3:", error);
    res.status(500).send({ error: "Error uploading file" });
  }
};

const deleteS3Htmls = async (req, res) => {
  try {
    const deleteFiles = await deleteHtmlFiles();
    return deleteFiles ? res.status(200).json({ message: "Files deleted successfully" }) : res.status(500).json({ message: "Can't Delete :(" });
  } catch (error) {
    // console.error("Error deleting the files:", error.message);
    res.status(500).send({ error: "Error deleting files" });
  }
}

module.exports = {
  createUserListForAllUsers,
  dbReset,
  userListSeoSetting,
  userPostSeoSetting,
  setFeedback,
  setPostCounters,
  createGuestLedger,
  generalStatistics,
  sendEmail,
  sendEmailTemplate,
  generatePostData,
  addOptionsInBooleanQuests,
  addIdsToQuestAnswersArrayObjects,
  selectedContendedPercentages,
  setGeneralTypes,
  postDataPDF,
  postDataPDFIndividuals,
  createPDFFromJson,
  createUserPDFs,
  generatePostJSON,
  generatePostPDF,
  embedDailyUser,
  embedDailyPosts,
  generatePostPdfForTest,
  tempRemoval,
  postsForcedEmbed,
  articleSEO,
  sharedPostImageSEO,
  homepageSEO,
  upload,
  deleteS3Htmls,
};
