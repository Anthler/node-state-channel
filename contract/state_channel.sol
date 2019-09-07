pragma solidity 0.5.1;

contract StateChannel {
    
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
    function claimPayment(
        address _sender, 
        uint256 _amount, 
        uint _timestamp, 
        uint256 _nonce, 
        bytes memory _signature
    ) 
        public 
        returns(bool)  
    {
        
        require(!usedNonces[_sender][_nonce]);
        
        usedNonces[_sender][_nonce] = true;
        
        require(!pendingPayments[_nonce].paid && now >= pendingPayments[_nonce].dueDate);
        
        bytes32 message = prefixed(keccak256(abi.encodePacked(pendingPayments[_nonce].recipient, _amount, _nonce, _timestamp ,this)));
        
        require(recoverSigner(message, _signature) == _sender);
        
        //Operation below can be done using SafeMath library
        balances[_sender] -= _amount;
        
        balances[msg.sender] += _amount;
        
        pendingPayments[_nonce].paid = true;
        
        return true;
    }
    
    function paymentRequest(
        uint _nonce, 
        uint _amount, 
        address _sender, 
        address _recipient, 
        uint _timestamp, 
        bytes memory _signature
    ) 
        public 
        returns(bool)
    {
        
        require(!usedNonces[_sender][_nonce]);
        
        require(isValidSignature( _amount, _nonce, _timestamp, _sender, _recipient,  _signature ));
        
        Payment storage payment = pendingPayments[_nonce];
        
        payment.sender = _sender;
        
        payment.recipient = _recipient;
        
        payment.timestamp = _timestamp;
        
        payment.amount = _amount;
        
        payment.dueDate = now + 10 minutes;
        
        payment.paid = false;
        
        return true;
    }
    
    //Check the validity/authenticity of the signature
    function isValidSignature(
        uint256 _amount, 
        uint _nonce, 
        uint _timestamp, 
        address _sender,  
        address _recipient,  
        bytes memory _signature
    )
        public
        view
        returns (bool)
    {
        bytes32  hash = keccak256(abi.encodePacked(this, _nonce, _recipient, _timestamp, _amount));
        bytes32 message = prefixed(hash);
        return recoverSigner(message, _signature) == address(_sender);
    }
    
    //Challenge/Overwrite a transaction with most current reciept
    
    function challengeTransaction(
        address _recipient, 
        address _sender,  
        uint new_amount,
        uint _nonce, 
        uint last_timestamp, 
        bytes memory _signature
    ) 
        public 
        returns(bool)
    {
        
        require(last_timestamp > pendingPayments[_nonce].timestamp, "Please provide a more current reciept");
        
        require(isValidSignature(new_amount,  _nonce, last_timestamp,_sender, _recipient, _signature), "Invalid signature");
        
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