const Treasury = require("../models/Treasury");


module.exports.createTreasury = async (req, res) => {
  try {
    const { amount } = req.query;
    const treasuryEntry = new Treasury({ amount });
    const savedTreasury = await treasuryEntry.save();
    if (!savedTreasury) throw new Error("Treasury Not Created Successfully!");
    res.status(201).json({ data: savedTreasury });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: `An error occurred while create Treasury: ${error.message}` });
  }
};

module.exports.updateTreasury = async ({ amount, inc, dec }) => {
  try {
    const treasury = await Treasury.updateOne({ $inc: { amount: inc ? amount : -amount } });
    if (!treasury) throw new Error("No such Treasury!");
    return treasury.modifiedCount;
  } catch (error) {
    // console.error(error);
  }
};
// module.exports.updateTreasury = async ({ amount }) => {
//     try {
//         const treasury = await Treasury.updateOne({ $inc: { amount } });
//         if(!treasury) throw new Error("No such Treasury!");
//         return treasury.modifiedCount;
//     } catch (error) {
//       // console.error(error);
//     }
// };

module.exports.getTreasury = async () => {
  try {
    const getTreasury = await Treasury.findOne();
    return parseFloat(getTreasury.amount.toString())
  } catch (error) {
    // console.error(error);
  }
};
