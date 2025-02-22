const AWS = require("aws-sdk");
const pug = require("pug");
const path = require("path");

module.exports.sendEmailMessageTemplate = async (
  email,
  subject,
  message,
  sender,
  type,
  data
) => {
  const SES_CONFIG = {
    region: process.env.AWS_SES_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  const sesClient = new AWS.SES(SES_CONFIG);

  let receiverEmail = email ? [email] : [process.env.AWS_SES_ReceiverEmails];

  if (sender) {
    message = `Sender Email: <b>${sender}</b> <br /> <br /> ${message}`;
  }

  let params;

  if (type === "posts") {
    // Load and render the Pug template into HTML
    const htmlContent = pug.renderFile(
      path.join(__dirname, "../templates/pug/email/baseEmail.pug"),
      {
        subject: subject,
        message: message,
        receiverEmail: email || "User",
        sender: sender,
        posts: data,
      }
    );

    params = {
      Source: process.env.AWS_SES_SENDER,
      Destination: {
        ToAddresses: receiverEmail,
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlContent, // Use the rendered HTML content from Pug
          },
          Text: {
            Charset: "UTF-8",
            Data: "Verify Account",
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `Explore New Posts on Foundation This Week!`,
        },
      },
    };
  }
  if (type === "news") {
    // Load and render the Pug template into HTML
    const htmlContent = pug.renderFile(
      path.join(__dirname, "../templates/pug/email/article.pug"),
      {
        subject: subject,
        message: message,
        receiverEmail: email || "User",
        sender: sender,
        posts: data,
      }
    );

    params = {
      Source: process.env.AWS_SES_SENDER,
      Destination: {
        ToAddresses: receiverEmail,
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlContent, // Use the rendered HTML content from Pug
          },
          Text: {
            Charset: "UTF-8",
            Data: "Verify Account",
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `Fresh News, Shaped by Our Community!`,
        },
      },
    };
  }

  try {
    const result = await sesClient.sendEmail(params).promise();
    if (!result) throw new Error("Mail Not Sent");
    return result;
  } catch (error) {
    // // console.log(error);
    throw error;
  }
};
