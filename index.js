const express = require("express");
const Web3 = require("web3");
const abi = require("ethereumjs-abi");

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));

const app = express();
app.use(express.json());

const CONTRACT_ADDR = "0xA0Df493ED0EBdA61da690A9e068F9B39C035758F";

const users = [
  {
    id: 1,
    balance: 300,
    address: "0x890575Aee83E2b50869B3917A77a5578b86b0e98",
    password: "123456",
    nonces: 0
  },
  {
    id: 2,
    balance: 200,
    address: "0xB36023D6626841e825b99eF410F2fB84a9B9c970",
    password: "123456",
    nonces: 0
  }
];
0x10ecf4afc5142e83d16b45df1a896e49023b61edd01fda6f06b61e999b74a299;
app.post("/users/transactions/sign/:id", async (req, res) => {
  //extract the user's ID from request parameters

  try {
    const id = req.params.id;

    //Loop through the users array to find the
    const user = users.find(u => u.id === parseInt(id));

    // Check to see if the user id provided exist for a user in our users array
    if (!user) return res.status(404).send(" Invlid user ID provided");

    let { balance, password, nonces } = user;

    //Get amount sent from the request body
    const { amount, recipient } = req.body;

    //check to see if the sender has enough balance to sign a transaction
    if (balance < amount) return res.status(400).send("Insufficient balance");

    //Get the nonce to be used for the transaction
    nonce = nonces += 1;

    //Get milliseconds because now solidity returns current block timestamp in milliseconds
    const timestamp = Date.now();
    //console.log(timestamp);

    //Hash the transaction message to be signed
    const hash = web3.utils.soliditySha3(
      recipient,
      amount,
      nonce,
      timestamp,
      CONTRACT_ADDR
    );

    // const prefixed =
    //   "0x" +
    //   abi
    //     .soliditySHA3(
    //       ["string", "bytes32"],
    //       ["\x19Ethereum Signed Message:\n32", hash]
    //     )
    //     .toString("hex");

    // To prevent errors like unknown account, we create a new account the is sync with our geth node running
    const address = await web3.eth.personal.newAccount(password);

    //address = web3.utils.toChecksumAddress(address);
    console.log(address);

    // Sign the transaction
    const signature = await web3.eth.personal.sign(hash, address, password);
    //const signature = "helloworld";

    //The current/ updated balance after transaction is signed
    balance = balance -= amount;

    //Send the signed signature to the signer to be sent to the recipient
    res.status(200).send({
      signer: address,
      hash: hash,
      signature: signature,
      nonce: nonce,
      amount: amount,
      timestamp: timestamp
    });
  } catch (error) {
    console.log(error);
  }
});

app.use("/users/transactions/sender/verify", async (req, res) => {
  // Destructure required parameters from body of request
  const {
    signature,
    recipient,
    expected_sender,
    nonce,
    amount,
    timestamp
  } = req.body;

  // Rehash the message
  const hash = web3.utils.soliditySha3(
    recipient,
    amount,
    nonce,
    timestamp,
    CONTRACT_ADDR
  );

  // const prefixed = "0x" + abi.soliditySHA3(
  //   ["string", "bytes32"],
  //   ["\x19Ethereum Signed Message:\n32", hash]
  // );

  // Recover signer account of the signature
  const signer = await web3.eth.personal.ecRecover(hash, signature);

  // Check if signer is the expected signer
  if (signer !== expected_sender.toLowerCase()) {
    return res.status(404).send({ message: "Signature is invalid" });
  }

  res.status(200).send({ valid: true });
});

app.post("/users/transactions/challenge", (req, res) => {
  //get contract instance
  //send expected paramters from request body to smart contract challenge function
  //return true if challenge accepted
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`App Listening on PORT: ${PORT}`);
});
