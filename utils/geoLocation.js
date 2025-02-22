const axios = require('axios');

const minApiCallDelay = 1200; // about 1 request per second
const maxApiCallsPerDay = 33; // limited until api subscription is payed for
const oneDayInMillis = 24 * 60 * 60 * 1000;

let lastApiCallTimestamp = 0;
let apiCallCount = 0;

const apiKey = '02f7d07c8c5140299b0b73ae2ac24b68';
const apiUrl = 'https://ipgeolocation.abstractapi.com/v1/?api_key=' + apiKey + '&ip_address=';

setInterval(() => {
  apiCallCount = 0;
}, oneDayInMillis);

module.exports.geoLocation = async (req, res) => {
  try {
    let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    ipAddress = extractIpAddress(ipAddress);

    if (!ipAddress) {
      res.status(400).json({ message: 'IP Failed to detect', status: 'ERROR' });
    }

    // Api Calls Restrictions
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTimestamp;

    if (timeSinceLastCall < minApiCallDelay) {
      const delay = minApiCallDelay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (apiCallCount >= maxApiCallsPerDay) {
      res.status(429).json({ message: 'API Limit', status: 'ERROR' });
      return;
    }

    lastApiCallTimestamp = Date.now();
    apiCallCount++;

    const query = apiUrl + ipAddress

    const response = await axios.get(query);

    res.json(response.data);


  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: `An error occurred in geoLocation: ${error.message}` });
  }
};

function extractIpAddress(inputString) {
  const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
  const match = inputString.match(ipPattern);

  if (match) {
    return match[0];
  } else {
    return null;
  }
}