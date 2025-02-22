var cron = require("node-cron");
const LedgerController = require("../controller/LedgerController");
const AuthController = require("../controller/AuthController");

module.exports = cronIntialize = () => {
  cron.schedule("0 0 1 * *", () => {
    LedgerController.deleteGuestOver30Days();
  });

  //Every 2 mins to resolve cold start issue
  cron.schedule("*/2 * * * *", () => {
    AuthController.getRefresh();
  });

  cron.schedule("*/2 * * * *", () => {
    AuthController.getRefresh();
  });
};
