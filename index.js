const express = require("express");
const Web3 = require("web3");
const ethereumjs = require("ethereumjs-util");

const web3 = new Web3();
const app = express();

const users = [
  { id: 1, balance: 300, password: 12345, nonces: 0 },
  { id: 2, balance: 200, password: 67890, nonces: 0 }
];

app.post("/user/transaction/sign/:id", async (req, res) => {
  //extract the user's ID from request parameters
  const id = req.params.id;

  //Loop through the users array to find the
  const user = users.find(u => u.id === parseInt(id));

  // Check to see if the user id provided exist for a user in our users array
  if (!user) return res.status(404).send(" Invlid user ID provided");

  //Get balance of the user signing transaction
  const balance = user.balance;

  //Get amount sent from the request body
  const amount = req.body.amount;

  //check to see if the sender has enough balance to sign a transaction
  if (balance < amount) return res.status(400).send("Insufficient balance");

  //Get the nonce to be used for the transaction
  const nonce = (user.nonces += 1);

  // Hash the transaction message to be signed
  const hash = ethereumjs.ABI.soliditySHA3(
    ["address", "uint256", "uint256"],
    [web3.eth.defaultAccount, amount, nonce]
  ).toString("hex");

  // Sign the transaction
  const signature = await web3.eth.personal.sign(
    hash,
    web3.eth.defaultAccount,
    user.password
  );

  //The current/ updated balance after transaction is signed
  const currentBalance = balance - amount;

  //Update the signer balance to reflect current balance
  user.balance = currentBalance;

  //Send the signed signature to the signer to be sent to the recipient
  res.status(200).send(signature);
});

app.use("/transaction/verify", (req, res) => {});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App Listening on PORT: ${PORT}`);
});
