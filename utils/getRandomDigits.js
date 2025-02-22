const crypto = require('crypto');

module.exports.getRandomDigits = (numberOfDigits) => {
    const max = Math.pow(10, numberOfDigits) - 1;
    const randomValue = crypto.randomInt(0, max);
    return randomValue.toString().padStart(numberOfDigits, '0');
}