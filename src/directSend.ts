import { ethers, providers, Wallet } from "ethers";

const GWEI = 10n ** 9n;
const CHAIN_ID = 5; // Goerli

const infuraUrl = process.env.ETH_RPC_URL;
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

const DEPLOYED_ADRS = "0x26C4ca34f722BD8fD23D58f34576d8718c883A80"
// @ts-ignore
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

async function waitUntilBlockNumberPresent(transactionHash: string, provider: providers.Provider): Promise<providers.TransactionReceipt> {
    let txReceipt: providers.TransactionReceipt | null = null;
  
    // Loop until the blockNumber property is present in the receipt
    while (!txReceipt || !txReceipt.blockNumber) {
      try {
        txReceipt = await provider.getTransactionReceipt(transactionHash);
      } catch (error) {
        console.error("Error fetching transaction receipt:", error);
      }
  
      // Wait for some time before retrying
      await new Promise(resolve => setTimeout(resolve, 5000)); // Adjust the delay as needed
    }
  
    return txReceipt;
}

  
  

// Sign the transaction
async function signAndSendTransaction() {

    // Use await to get the nonce
    const nonce = await wallet.getTransactionCount();

    // Create a transaction object
    const transaction = {
        nonce: nonce,
        chainId: CHAIN_ID,
        type: 2, // EIP 1559 transaction
        value: 0,
        data: "0x",
        maxFeePerGas: ethers.BigNumber.from(GWEI).mul(10),
        maxPriorityFeePerGas: ethers.BigNumber.from(GWEI).mul(2),
        gasLimit: 1000000,
        to: DEPLOYED_ADRS
    };



    try {
        const signedTransaction = await wallet.signTransaction(transaction);
        
        // Send the signed transaction
        const transactionResponse = await wallet.provider.sendTransaction(signedTransaction);

        const txReceiptWithBlockNumber = await waitUntilBlockNumberPresent(transactionResponse.hash, provider);
        console.log(`Txn succesfully included in block: ${txReceiptWithBlockNumber.blockNumber}`);
        console.log(transactionResponse.hash);

        const end = Date.now();
        const latency = (end - start) / 1000; 
        console.log(`Latency ${latency} seconds.`);

    } catch (error) {
        console.error('Error signing or sending transaction:', error);
    }
}

// Call the function to sign and send the transaction
console.log("Started...")
const start = Date.now();

signAndSendTransaction();