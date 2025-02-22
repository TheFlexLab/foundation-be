const dns = require('dns');

const minApiCallDelay = 1200; // about 1 request per second
const maxApiCallsPerDay = 3000;
const oneDayInMillis = 24 * 60 * 60 * 1000;


let lastApiCallTimestamp = 0;
let apiCallCount = 0;

const dnsblServers = [
  'all.s5h.net',
  'multi.surbl.org',
  'b.barracudacentral.org',
  'bl.spamcop.net',
  'blacklist.woody.ch',
  'bogons.cymru.com',
  'combined.abuse.ch',
  'db.wpbl.info',
  'dnsbl-1.uceprotect.net',
  'dnsbl-2.uceprotect.net',
  'dnsbl-3.uceprotect.net',
  'dnsbl.dronebl.org',
  'dnsbl.sorbs.net',
  'drone.abuse.ch',
  'duinv.aupads.org',
  'dul.dnsbl.sorbs.net',
  'dyna.spamrats.com',
  'http.dnsbl.sorbs.net',
  'ips.backscatterer.org',
  'ix.dnsbl.manitu.net',
  'korea.services.net',
  'misc.dnsbl.sorbs.net',
  'noptr.spamrats.com',
  'orvedb.aupads.org',
  'proxy.bl.gweep.ca',
  'psbl.surriel.com',
  'relays.bl.gweep.ca',
  'relays.nether.net',
  'singular.ttk.pte.hu',
  'smtp.dnsbl.sorbs.net',
  'socks.dnsbl.sorbs.net',
  'spam.abuse.ch',
  'spam.dnsbl.anonmails.de',
  'spam.dnsbl.sorbs.net',
  'spam.spamrats.com',
  'spambot.bls.digibase.ca',
  'spamrbl.imp.ch',
  'spamsources.fabel.dk',
  'ubl.lashback.com',
  'ubl.unsubscore.com',
  'virus.rbl.jp',
  'web.dnsbl.sorbs.net',
  'wormrbl.imp.ch',
  'z.mailspike.net',
  'zombie.dnsbl.sorbs.net'
]

let totalResults = dnsblServers.length;
setInterval(() => {
  apiCallCount = 0;
}, oneDayInMillis);

module.exports.checkDNSBlockList = async (req, res) => {
  try {
    const callType = req.params.callType;
    const useDomain = req.query.domain;
    let ipAddress;

    if (!useDomain) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      ipAddress = extractIpAddress(ipAddress);

      if (!ipAddress) {
        res.status(400).json({ message: 'IP Failed to detect', status: 'ERROR' });
      }
    } else ipAddress = useDomain;

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

    checkDNSBL(ipAddress, dnsblServers, (err, failureCount) => {
      if (err) {
        res.json({ message: err, status: 'ERROR' });
      } else {
        res.json({ message: calculatePercentage(totalResults, failureCount), status: 'OK' });
      }
    });

  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: `An error occurred while checkDNSBlockList: ${error.message}` });
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

function checkDNSBL(ip, dnsblServers, callback) {
  let destination

  if (isIpAddress(ip)) {
    destination = ip.split('.').reverse().join('.');
  } else destination = ip


  let failureCount = 0;

  function checkNext(index) {
    if (index >= dnsblServers.length) {
      callback(null, failureCount);
      return;
    }

    const query = `${destination}.${dnsblServers[index]}`;

    dns.resolve4(query, (err, addresses) => {
      if (err) {
        if (err.code !== 'ENOTFOUND') {
          callback(err);
          return;
        }
      } else {
        failureCount++;
      }
      checkNext(index + 1);
    });
  }

  checkNext(0);
}

function calculatePercentage(totalResults, positiveResults) {
  const positivePercentage = (positiveResults / totalResults) * 100;
  return positivePercentage.toFixed(2); // Return percentage rounded to two decimal places
}

function isIpAddress(input) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipRegex.test(input) && input.split('.').every(segment => parseInt(segment, 10) <= 255);
}