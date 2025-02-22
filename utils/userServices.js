const UserModel = require("../models/UserModel");

module.exports.getUserBalance = async (uuid) => {
  try {
    const user = await UserModel.findOne({ uuid });
    return parseFloat(user.balance).toFixed(2);
  } catch (error) {
    // console.error(error.message);
    throw new Error("An error occurred while getUserBalance!")
  }
};

module.exports.checkUserBalance = async ({ uuid, req, res }) => {
  try {
    const user = await UserModel.findOne({ uuid });
    return parseFloat(user.balance).toFixed(2);
  } catch (error) {
    // // console.error(error.message);
    throw new Error("An error occurred while checkUserBalance!")
    // res.status(500).json({
    //   message: `An error occurred while checkUserBalance: ${error.message}`,
    // });
  }
};

module.exports.updateUserBalance = async ({ uuid, amount, inc, dec }) => {
  try {
    const user = await UserModel.updateOne({ uuid }, { $inc: { balance: inc ? amount : -amount } });
    if (!user) throw new Error("No such user!");
    return user.modifiedCount;
  } catch (error) {
    // console.error(error);
  }
};