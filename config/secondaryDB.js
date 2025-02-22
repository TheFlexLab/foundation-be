// config/secondaryDB.js
const mongoose = require("mongoose");

const connectSecondaryDB = async () => {
    try {
        const conn = await mongoose.createConnection(process.env.MONGO_URI_KB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Knowledge Base Connected!`.cyan.underline.bold);

        return conn;
    } catch (err) {
        // console.error("Could not establish connection to MongoDB Knowledge Base! " + err);
    }
};

module.exports = connectSecondaryDB;
