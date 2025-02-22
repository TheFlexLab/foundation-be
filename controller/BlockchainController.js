const { INFURA_TESTNET_APIKEY, WALLET_ADDRESS } = require("../config/env");
const UserModel = require("../models/UserModel");
const { createLedger } = require("../utils/createLedger");
const { getUserBalance, updateUserBalance } = require("../utils/userServices");
const crypto = require("crypto");
let lastFetchTime = 0; // Track the last time we fetched from the API
// --- Web3 Start
const Web3 = require("web3").default;
const web3 = new Web3(INFURA_TESTNET_APIKEY);
const fs = require("fs"); // Import the fs module
const provider =
  "wss://base-sepolia.infura.io/ws/v3/cc889c0e0f754dca9822c17dab12ba84";
const web3WSS = new Web3(provider);
// --- Web3 End
const TOKEN_TRANSFER_CONTRACT_ABI = require(`../constants/TokenTransfer.json`); // Ensure you have the ABI JSON file
const FDX_TOKEN_CONTRACT_ABI = require(`../constants/FdxToken.json`); // Ensure you have the ABI JSON file
const Block = require("../models/Block");
const DepositTransactions = require("../models/DepositTransactions");
const TOKEN_TRANSFER_CONTRACT_ADDRESS = process.env.TRANSFER_TOKEN_AGREEMENT;
const FDX_TOKEN_CONTRACT_ADDRESS = process.env.FDX_TOKEN_AGREEMENT;
// Private key for the account paying the gas fees
const PRIVATE_KEY = process.env.PRIVATE_KEY_FEE_ACCOUNT;
const BLOCK_FILE = "lastProcessedBlock.txt";

// Define the bigIntReplacer function to handle BigInt conversion
function bigIntReplacer(key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

// Function to process logs for ERC20 token deposits
async function processERC20Logs(log) {
  try {
    // Decode log data to extract ERC20 event details
    const { from, to, value } = web3WSS.eth.abi.decodeLog(
      [
        { type: "address", name: "from", indexed: true },
        { type: "address", name: "to", indexed: true },
        { type: "uint256", name: "value" },
      ],
      log.data,
      log.topics.slice(1) // Remove the event signature topic
    );

    // Check if the 'to' address matches the target wallet
    if (to.toLowerCase() === WALLET_ADDRESS.toLowerCase()) {
      const depositDetails = {
        from,
        to,
        amount: web3.utils.fromWei(value, "ether"),
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: new Date(), // Optional: Add a timestamp for your record
      };
      // console.log("log", log);

      // console.log("ERC20 Token Deposit Detected:",depositDetails);

      // Store the transaction in your database or further processing
      await saveDepositToDatabase(depositDetails);

      // Update the latest processed block number for recovery purposes
      await updateLastProcessedBlock(Number(log.blockNumber));
      await DepositTransactions.create({
        //saving tx to DB
        transactionHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
      });
    }
  } catch (error) {
    // console.error("Error processing ERC20 log:", error);
  }
}

async function saveLastProcessedBlock(blockNumber) {
  const typedNumberBlockNumber = Number(blockNumber);
  // console.log(`Block ${typedNumberBlockNumber} will be saved.`);
  await Block.findOneAndUpdate({}, { blockNumber: typedNumberBlockNumber }, { upsert: true });
  // console.log(`Block: ${blockNumber} is saved.`);
}

async function loadLastProcessedBlock() {
  const record = await Block.findOne({});
  return record ? record.blockNumber : INITIAL_BLOCK_NUMBER;
}

// Update the last processed block
async function updateLastProcessedBlock(blockNumber) {
  // console.log(`Updating last processed block to ${blockNumber}`);
  saveLastProcessedBlock(blockNumber);
}

async function fetchAndProcessPastTransactions(fromBlock, toBlock) {
  // console.log(fromBlock,toBlock,web3WSS.utils.toHex(fromBlock),web3WSS.utils.toHex(toBlock));

  try {
    const logs = await web3WSS.eth.getPastLogs({
      fromBlock: web3WSS.utils.toHex(fromBlock), // Convert BigInt to Number
      toBlock: web3WSS.utils.toHex(toBlock),
      address: FDX_TOKEN_CONTRACT_ADDRESS,
      topics: [
        web3WSS.utils.sha3("Transfer(address,address,uint256)"),
        null,
        web3WSS.eth.abi.encodeParameter("address", WALLET_ADDRESS),
      ],
    });

    for (const log of logs) {
      const transactionHash = log.transactionHash;
      const blockNumber = Number(log.blockNumber.toString());

      // Check if the transaction is already in the database
      const existingTransaction = await DepositTransactions.findOne({
        transactionHash,
        blockNumber,
      });

      if (existingTransaction) {
        // console.log(`Transaction already processed: Hash = ${transactionHash}, Block = ${blockNumber}`);
        continue; // Skip this transaction
      }

      // Use JSON.stringify to traverse and apply bigIntReplacer to the log
      const processedLog = JSON.parse(JSON.stringify(log, bigIntReplacer));

      await processERC20Logs(processedLog);
    }
  } catch (error) {
    // console.error("Error fetching past transactions:", error);
  }
}

// Function to process missed transactions
async function processMissedTransactions() {
  try {
    const lastProcessedBlock = await loadLastProcessedBlock();
    const latestBlock = await web3WSS.eth.getBlockNumber();

    // console.log(`Checking missed transactions from ${lastProcessedBlock + 1} to ${latestBlock}`);

    if (lastProcessedBlock < latestBlock) {
      await fetchAndProcessPastTransactions(
        lastProcessedBlock + 1,
        latestBlock
      );
      // saveLastProcessedBlock(latestBlock);
    }
  } catch (error) {
    // console.error("Error processing missed transactions:", error);
  }
}

//Calling function from backend to pay tx fee by Foundation
async function transferTokens(toAddress, fromAddress, amount) {
  try {
    // Instantiate the contract
    const contract = new web3.eth.Contract(
      TOKEN_TRANSFER_CONTRACT_ABI,
      TOKEN_TRANSFER_CONTRACT_ADDRESS
    );

    // Convert amount to Wei
    const amountInWei = web3.utils.toWei(amount.toString(), "ether");

    // Encode the transaction data
    const txData = contract.methods
      .transferTokens(fromAddress, toAddress, amountInWei)
      .encodeABI();

    // Get the gas price
    const gasPrice = await web3.eth.getGasPrice();

    // Get the nonce
    const nonce = await web3.eth.getTransactionCount(process.env.FEE_ACCOUNT);

    // Build the transaction object
    const tx = {
      to: TOKEN_TRANSFER_CONTRACT_ADDRESS,
      data: txData,
      gasPrice: web3.utils.toHex(gasPrice),
      gas: web3.utils.toHex(3000000), // Set a reasonable gas limit
      nonce: web3.utils.toHex(nonce),
      value: "0x0",
    };

    // Sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);

    // Send the transaction
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    // console.log("Transaction successful with hash:", receipt.transactionHash);
    return receipt;
  } catch (error) {
    // console.error("Error during transaction:", error);
    throw error;
  }
}

const fetchFeeBalance = async (req, res) => {
  try {
    const contract = new web3.eth.Contract(
      FDX_TOKEN_CONTRACT_ABI,
      FDX_TOKEN_CONTRACT_ADDRESS
    );

    // Call the `balance` function
    const balance = await web3.eth.getBalance(process.env.FEE_ACCOUNT);

    const balanceTokenIssuer = await contract.methods
      .balanceOf(process.env.DEPLOYER_ACCOUNT)
      .call();
    // console.log(balance);

    // Convert balance from Wei to Ether
    const etherBalance = web3.utils.fromWei(balance, "ether");
    const etherBalanceOfIssuer = web3.utils.fromWei(
      balanceTokenIssuer,
      "ether"
    );

    // Check if balance is greater than $20
    const feeByFoundation = parseFloat(etherBalance) >= 0.01; // Assuming $1 = 1 Ether (adjust conversion as needed)

    res.json({
      balance: etherBalance,
      feeByFoundation,
      issuerBalance: etherBalanceOfIssuer,
    });
  } catch (err) {
    // console.log(err);
    res
      .status(500)
      .json({ message: `Error occured while widthrawl`, error: err });
  }
};

const widthraw = async (req, res) => {
  try {
    let { uuid, amount, data, from, to, feePaid } = req.body;

    if (!feePaid) {
      data = transferTokens(to, from, amount);
    }

    // check user exist
    const User = await UserModel.findOne({ uuid });
    if (!User) throw new Error("No such User!");

    // check user balance
    const userBalance = await getUserBalance(req.body.uuid);
    if (userBalance < amount * 1)
      throw new Error("Your balance is insufficient to widthrawl");

    const txID = crypto.randomBytes(11).toString("hex");

    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "fdxWidthrawl",
      txID: txID,
      txAuth: "User",
      txFrom: req.body.uuid,
      txTo: "User Wallet",
      txAmount: "0",
      txData: data,
      type: "widthraw",
      status: "complete",
    });
    // Create Ledger
    await createLedger({
      uuid: req.body.uuid,
      txUserAction: "fdxWidthrawl",
      txID: txID,
      txAuth: "DAO",
      txFrom: req.body.uuid,
      txTo: "User Wallet",
      txAmount: amount,
      txData: data,
      type: "widthraw",
      status: "complete",
    });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: amount,
      dec: true,
    });
    User.fdxWidthrawn = User.fdxWidthrawn + Number(amount);
    res.status(200).json({ message: "Widthrawl Successful" });
    await User.save();
  } catch (err) {
    // console.log(err);
    res
      .status(500)
      .json({ message: `Error occured while widthrawl`, error: err });
  }
};

const saveDepositToDatabase = async (depositDetails) => {
  try {
    // This is what we got in `depositDetails`:
    // let depositDetails = {
    //   from,
    //   to,
    //   amount: web3.utils.fromWei(value, "ether"),
    //   transactionHash: log.transactionHash,
    //   blockNumber: log.blockNumber,
    //   timestamp: new Date(),
    // };

    // check user exist
    const User = await UserModel.findOne({
      "badges.web3.etherium-wallet": { $exists: true, $eq: depositDetails?.from }
    });
    if (!User) throw new Error("No such User!");

    // Create Ledger
    const txID = crypto.randomBytes(11).toString("hex");
    await createLedger({
      uuid: User.uuid,
      txUserAction: "fdxDeposit",
      txID: txID,
      txAuth: "User",
      txFrom: "User Wallet",
      txTo: User.uuid,
      txAmount: "0",
      txData: depositDetails?.transactionHash,
      type: "deposit",
      status: "complete",
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "fdxDeposit",
      txID: txID,
      txAuth: "DAO",
      txFrom: "User Wallet",
      txTo: User.uuid,
      txAmount: depositDetails?.amount,
      txData: depositDetails?.transactionHash,
      type: "deposit",
      status: "complete",
    });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: User.uuid,
      amount: depositDetails?.amount,
      inc: true,
    });
    User.fdxDeposit = User.fdxDeposit + Number(depositDetails?.amount);
    await User.save();
    // console.log(`Deposit Succcessful for User: ${User.uuid} for Amount: ${depositDetails?.amount} Transection-Hash ${depositDetails?.transactionHash}`);
  } catch (error) {
    // console.log(error);
    throw error;
  }
};

const deposit = async (tx) => {
  try {
    const from = tx?.from;
    const value = tx?.value;

    // check user exist
    const User = await UserModel.findOne({ uuid: user.uuid });
    if (!User) throw new Error("No such User!");

    // Create Ledger
    const txID = crypto.randomBytes(11).toString("hex");
    await createLedger({
      uuid: User.uuid,
      txUserAction: "fdxDeposit",
      txID: txID,
      txAuth: "User",
      txFrom: "User Wallet",
      txTo: User.uuid,
      txAmount: "0",
      txData: tx,
      type: "deposit",
      status: "complete",
    });
    await createLedger({
      uuid: User.uuid,
      txUserAction: "fdxDeposit",
      txID: txID,
      txAuth: "DAO",
      txFrom: "User Wallet",
      txTo: User.uuid,
      txAmount: amount,
      txData: tx,
      type: "deposit",
      status: "complete",
    });
    // Decrement the UserBalance
    await updateUserBalance({
      uuid: req.body.uuid,
      amount: amount,
      inc: true,
    });
    User.fdxDeposit = User.fdxDeposit + Number(amount);
    await User.save();
    // console.log("Deposit Succcessful");
  } catch (error) {
    // console.log(error);
    throw error;
  }
};

function convertBigIntToString(obj) {
  if (typeof obj === "bigint") {
    return obj.toString(); // Convert BigInt to string
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertBigIntToString(item)); // Recursively handle arrays
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        convertBigIntToString(value),
      ])
    );
  }

  return obj; // Return non-BigInt values as-is
}

// Function to subscribe to ERC20 token logs
async function subscribeToERC20TokenDeposits() {
  try {
    // console.log("Listening for ERC20 token deposits...");

    // Subscribe to the 'logs' event for the specific token contract
    const subscription = await web3WSS.eth.subscribe("logs", {
      address: FDX_TOKEN_CONTRACT_ADDRESS, // Replace with your token contract address
      topics: [
        web3WSS.utils.sha3("Transfer(address,address,uint256)"), // Event signature for Transfer
        null, // No filter for 'from'
        web3WSS.eth.abi.encodeParameter("address", WALLET_ADDRESS), // Filter for 'to'
      ],
    });

    subscription.on("data", async function (log) {
      // Process the log for ERC20 token deposit
      await processERC20Logs(log);
    });

    subscription.on("error", function (error) {
      // console.error("Subscription error:", error);
    });
  } catch (error) {
    // console.error("Error subscribing to ERC20 token deposits:", error);
  }
}

module.exports = {
  widthraw,
  fetchFeeBalance,
  subscribeToERC20TokenDeposits,
  processMissedTransactions,
};
