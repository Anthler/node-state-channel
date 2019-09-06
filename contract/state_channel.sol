pragma solidity 0.5.1;

contract StateChannel {
    
    address payable recipient;
    address payable sender;
    mapping(address => uint) balances;
    mapping(address=>mapping(uint => bool)) usedNonces;
    mapping(uint => Payment) pendingPayments;
    
    struct Payment{
        
        address sender;
        address recipient;
        uint amount;
        uint timestamp;
        uint dueDate;
        bool paid;
    }
    
    // Function makes final settlement between two participants in the channel on chain
    function claimPayment(uint256 amount, uint timestamp, uint256 nonce, bytes memory signature) public returns(bool)  {
        
        require(!usedNonces[sender][nonce]);
        usedNonces[sender][nonce] = true;
        require(!pendingPayments[nonce].paid && now > pendingPayments[nonce].dueDate);
        bytes32 message = prefixed(keccak256(abi.encodePacked(msg.sender, amount, nonce, timestamp ,this)));
        require(recoverSigner(message, signature) == sender);
        
        //Operation below can be done using SafeMath library
        balances[sender] -= amount;
        balances[msg.sender] += amount;
        pendingPayments[nonce].paid = true;
        return true;
    }
    
    function paymentRequest(uint _nonce, uint _amount, uint _timestamp) public returns(bool){
        
        require(!usedNonces[sender][_nonce]);

        Payment storage payment = pendingPayments[_nonce];
        payment.sender = sender;
        payment.recipient = recipient;
        payment.timestamp = _timestamp;
        payment.amount = _amount;
        payment.dueDate = now + 10 minutes;
        payment.paid = false;
        
        return true;
    }
    
    //Check the validity/authenticity of the signature
    function isValidSignature(uint256 _amount, uint _nonce, uint _timestamp, address _recipient,  bytes memory _signature)
        internal
        view
        returns (bool)
    {
        bytes32 message = prefixed(keccak256(abi.encodePacked(this, _nonce, _recipient, _timestamp, _amount)));
        return recoverSigner(message, _signature) == sender;
    }
    
    //Challenge/Overwrite a transaction with most current reciept
    function challengeTransaction(uint new_amount,uint _nonce, uint last_timestamp, bytes memory _signature) public returns(bool){
        require(last_timestamp > pendingPayments[_nonce].timestamp);
        require(isValidSignature(new_amount, _nonce, last_timestamp, msg.sender, _signature), "Invalid signature");
        pendingPayments[_nonce].amount = new_amount;
        return true;
    }
    
    //==================== Helper Functions =====================

    //returns the address which signed a signature
    function splitSignature(bytes memory signature)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(signature.length == 65);

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(signature, 32))
            // second 32 bytes
            s := mload(add(signature, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(signature, 96)))
        }

        return (v, r, s);
    }

    // recovers the signer of a transaction message from a signature
    function recoverSigner(bytes32 message, bytes memory signature)
        internal
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(signature);
        return ecrecover(message, v, r, s);
    }
    
    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}