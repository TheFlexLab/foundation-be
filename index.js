const dotenv = require("dotenv");
const app = require("./server");
const connectDB = require("./config/db");
const connectSecondaryDB = require("./config/secondaryDB");
const nodeHtmlToImage = require("node-html-to-image");
const { indexHTML } = require("./templates/indexHTML");
const { runTaskEveryTwoSecondsForDeposits } = require("./service/deposits");
dotenv.config();

const initializeConnections = async () => {
  await connectDB(); // Connect to the primary database
  global.connKnowledgeBase = await connectSecondaryDB(); // Connect to the secondary database

  let port = process.env.BASE_PORT;

  // Define your routes after connections are established
  app.get("/api/test/img", async (req, res) => {
    try {
      // Set Puppeteer options with --no-sandbox flag
      const puppeteerOptions = {
        args: ["--no-sandbox"],
      };

      const image = await nodeHtmlToImage({
        html: indexHTML(),
        puppeteerArgs: puppeteerOptions,
      });
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(image, "binary");
    } catch (error) {
      // console.error("Error generating image:", error);
      res.status(500).send(`Internal Server Error: ${error.message}`);
    }
  });

  app.listen(port, "0.0.0.0", () => {
    console.log("Server is listening on port:", port);
    runTaskEveryTwoSecondsForDeposits();
  });
};

initializeConnections().catch((err) => {
  console.error("Failed to initialize connections:", err);
});
