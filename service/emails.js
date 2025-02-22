const express = require("express");
const { BACKEND_URL } = require("../config/env");
const axios = require("axios");
const router = express.Router();
const { calculateTimeAgo, formatDateMDY } = require("../utils/templatesUtils");
const {
  sendEmailMessageTemplate,
} = require("../utils/sendEmailMessageTemplate");
const Email = require("../models/Email");

router.get("/testEmailTemplateRoute", (req, res) => {
  res.render("index.pug");
});

router.get("/sendPostsEmails", async (req, res) => {

  const emailDocs = await Email.find(
    {
      newPostsNotifications: true,
    }
  );

  const mails = emailDocs.map(doc => doc.email);

  const API_URL = `${BACKEND_URL}/infoquestions/getQuestsAll`;

  // // console.log("Posts Email being sent.");

  try {
    const response = await axios.get(
      `${API_URL}?sort=Most+Popular&email=true&moderationRatingInitial=0&moderationRatingFinal=0`
    );

    const posts = response.data.data;

    // // // console.log("Posts: ", posts);

    if (posts.length > 0) {
      const formattedPosts = posts.map((post) => {
        return {
          ...post,
          timeAgo: calculateTimeAgo(post.createdAt),
        };
      });

      // res.render("baseEmail.pug", { posts: formattedPosts });

      // const mails = await Email.find({
      //   newPostsNotifications: true,
      // });

      // Sending emails concurrently
      await Promise.all(
        mails.map((email) =>
          sendEmailMessageTemplate(
            email,
            req.body.subject,
            req.body.message,
            req.body.sender,
            "posts",
            formattedPosts
          )
        )
      );

      return res.status(200).json({ message: "Emails Sent" });
    }
    else {
      return res.status(200).json({ message: "Posts were not enough." });
    }

  } catch (error) {
    // // console.error("Error fetching questions:", error);
    res.render("baseEmail.pug", { posts: [] });
  }
});

router.get("/sendArticlesEmails", async (req, res) => {

  const emailDocs = await Email.find(
    {
      newNewsNotifications: true,
    }
  );

  const mails = emailDocs.map(doc => doc.email);

  const API_URL = `${BACKEND_URL}/article/articles`;

  // // console.log("News Email being sent.");

  try {
    const response = await axios.get(`${API_URL}?email=true`);

    const posts = response.data.data;

    // // // console.log("News: ", posts);

    if (posts.length > 0) {
      const formattedPosts = posts.map((post) => {
        return {
          ...post,
          timeAgo: formatDateMDY(post.createdAt),
        };
      });

      // res.render("article.pug", { posts: formattedPosts });

      // const mails = await Email.find({
      //     newNewsNotifications: true
      // });

      // Sending emails concurrently
      await Promise.all(
        mails.map((email) =>
          sendEmailMessageTemplate(
            email,
            req.body.subject,
            req.body.message,
            req.body.sender,
            "news",
            formattedPosts
          )
        )
      );

      return res.status(200).json({ message: "Emails Sent" });
    }
    else {
      return res.status(200).json({ message: "News were not enough." });
    }

  } catch (error) {
    // // console.error("Error fetching questions:", error);
    res.render("article.pug", { posts: [] });
  }
});

module.exports = router;
