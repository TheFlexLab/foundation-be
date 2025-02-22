const mongoose = require("mongoose");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");

// Define the schema for objects within the post array
const postSchema = mongoose.Schema({
    questForeginKey: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InfoQuestQuestions",
        required: true
    },
    order: { type: Number, required: true, },
    createdAt: { type: String, default: () => new Date().toISOString(), },
    updatedAt: { type: String, default: () => new Date().toISOString(), },
    deletedAt: { type: String, default: null, },
    isActive: { type: Boolean, default: true, },
})

// Define the schema for objects within the array
const categorySchema = mongoose.Schema({
    category: { type: String, required: true, },
    post: {
        type: [postSchema],
        default: [],
    },
    revealMyAnswers: { type: Boolean, default: false, },
    link: { type: String, default: null, },
    isLinkUserCustomized: { type: Boolean, default: false, },
    postCounter: { type: Number, default: 0, },
    clicks: { type: Number, default: null, },
    participents: { type: Number, default: null, },
    spotLight: { type: Boolean, default: false, },
    createdAt: { type: String, default: () => new Date().toISOString(), },
    updatedAt: { type: String, default: () => new Date().toISOString(), },
    deletedAt: { type: String, default: null, },
    isActive: { type: Boolean, default: true, },
    isEnable: { type: Boolean, default: false, },
})

const userListSchema = mongoose.Schema(
    {
        userUuid: { type: String, required: true, },
        list: {
            type: [categorySchema],
            default: [],
        },
        createdAt: { type: String, default: () => new Date().toISOString(), },
        updatedAt: { type: String, default: () => new Date().toISOString(), },
        deletedAt: { type: String, default: null, },
        isActive: { type: Boolean, default: true, },
    },
);

// Export all schemas as properties of an object
module.exports = {
    CategorySchema: mongoose.model("Category", categorySchema),
    PostSchema: mongoose.model("Post", postSchema),
    UserListSchema: mongoose.model("UserList", userListSchema),
};