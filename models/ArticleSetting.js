const mongoose = require("mongoose");

// Define ArticleSetting Schema
const ArticleSetting = mongoose.Schema(
    {
        articleId: {
            type: String,
            required: true,
        },
        userUuid: {
            type: String,
            required: true,
        },
        uniqueLink: {
            type: String,
            default: "",
        },
        viewCount: {
            type: Number,
            default: 0,
        },
        uniqueCustomizedLinkGenerated: {
            type: Boolean,
            default: false,
        },
        submitEngagementsOfArticleSharedByUniqueLink: {
            type: [String],
            default: [],
        },
        spotLight: {
            type: Boolean,
            default: false,
        },
        isEnable: { type: Boolean, default: true },
        deletedAt: { type: String, default: null },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

// Create ArticleSetting Model
module.exports = {
    ArticleSetting: mongoose.model("ArticleSetting", ArticleSetting),
};
