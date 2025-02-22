const mongoose = require('mongoose');

const weeklySentSchema = mongoose.Schema({
    recentWeekPostIds: {
        type: [mongoose.Schema.Types.ObjectId], // Array of post `_id`s
        default: [], // Initialize as an empty array
    },
    recentWeekNewsIds: {
        type: [mongoose.Schema.Types.ObjectId], // Array of news `_id`s
        default: [], // Initialize as an empty array
    },
});

const WeeklySent = mongoose.model('WeeklySent', weeklySentSchema);

module.exports = WeeklySent;
