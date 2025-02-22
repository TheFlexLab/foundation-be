const BlockchainController = require('../controller/BlockchainController');

exports.runTaskEveryTwoSecondsForDeposits = async () => {
    // // console.log('Cron for deposites initialized successfully.');
    while (true) {
        try {
            await BlockchainController.processMissedTransactions(); // Call the desired function
        } catch (error) {
            // // console.error('Error in scheduled task:', error);
        }
        await new Promise((resolve) => setTimeout(resolve, 3600000)); // Wait for 2 seconds
    }
};
