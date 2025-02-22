const mongoose = require("mongoose");

// Define Article Schema
const Article = mongoose.Schema(
  {
    userUuid: {
      type: String,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    abstract: {
      type: String,
      required: true,
    },
    groundBreakingFindings: {
      type: [Object],
      required: true,
    },
    discussion: {
      type: String,
      required: true,
    },
    conclusion: {
      type: String,
      required: true,
    },
    source: {
      type: [String],
      required: true,
    },
    suggestions: {
      type: [Object],
      required: true,
    },
    seoSummary: {
      type: String,
      required: true,
    },
    linkGenerated: {
      type: Boolean,
      default: false,
    },
    settings: {
      type: Object,
      default: null,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    submitEngagementsOfArticleSharedById: {
      type: [String],
      default: [],
    },
    s3Urls: {
      type: [String],
      default: [],
    },
    deletedAt: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Create Article Model
module.exports = {
  Article: mongoose.model("Article", Article),
};
