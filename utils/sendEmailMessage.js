const AWS = require("aws-sdk")

module.exports.sendEmailMessage = async (email, subject, message, sender) => {
  const SES_CONFIG = {
    region: process.env.AWS_SES_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  const sesClient = new AWS.SES(SES_CONFIG);

  let receiverEmail = email ? [email] : [process.env.AWS_SES_ReceiverEmails];

  if (sender !== undefined || "") {
    message = `Sender Email: <b>${sender}</b> <br /> <br /> ${message}`
  }

  let params = {
    Source: process.env.AWS_SES_SENDER,
    Destination: {
      ToAddresses: receiverEmail
    },
    ReplyToAddresses: [],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `${message} <br /> <br />
                This message is from on.foundation <br /> <br />`
          // Here is the link <a href='${url}>Quest</a> <br /> <br />
          // Please feel free to engage with the quest`,
        },
        Text: {
          Charset: 'UTF-8',
          Data: 'Verify Account'
        }
      },

      Subject: {
        Charset: 'UTF-8',
        Data: `${subject}`,
      }
    },
  }

  try {
    const result = await sesClient.sendEmail(params).promise();
    if (!result) throw new Error("Mail Not Sent");
    return result;
  } catch (error) {
    // // console.log(error);
    throw error;
  }
}