const express = require("express");
const Web3 = require("web3");

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));

const app = express();
app.use(express.json());

const CONTRACT_ADDR = "0xec8346021bfaeb25d7184b9682781a5cccfcdb03";

const users = [
  {
    id: 1,
    balance: 300,
    address: "0x890575Aee83E2b50869B3917A77a5578b86b0e98",
    password: "Anthler01",
    nonces: 0
  },
  {
    id: 2,
    balance: 200,
    address: "0xB36023D6626841e825b99eF410F2fB84a9B9c970",
    password: "Anthler01",
    nonces: 0
  }
];

app.post("/users/transactions/sign/:id", async (req, res) => {
  //extract the user's ID from request parameters

  try {
    const id = req.params.id;

    //Loop through the users array to find the
    const user = users.find(u => u.id === parseInt(id));

    // Check to see if the user id provided exist for a user in our users array
    if (!user) return res.status(404).send(" Invlid user ID provided");

    let { balance, address, password, nonces } = user;

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

    //await web3.eth.personal.unlockAccount(address, password, 1);

    // Sign the transaction
    const signature = await web3.eth.personal.sign(hash, address, password);
    //const signature = "helloworld";

    //The current/ updated balance after transaction is signed
    balance -= amount;

    //Send the signed signature to the signer to be sent to the recipient
    res.status(200).send({
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
  const { signature, expected_sender, nonce, amount, timestamp } = req.body;

  const hash = web3.utils.soliditySha3(
    recipient,
    amount,
    nonce,
    timestamp,
    CONTRACT_ADDR
  );
  const signer = await web3.eth.personal.ecRecover(hash, signature);

  if (expected_sender !== signer) {
    return res.send(404).send("Signature is invalid");
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
