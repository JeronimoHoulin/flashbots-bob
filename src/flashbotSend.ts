import { ethers, providers, Wallet } from "ethers";
import {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";

const GWEI = 10n ** 9n;
const ETHER = 10n ** 18n;

const CHAIN_ID = 5; // Goerli
const FLASHBOTS_ENDPOINT = "https://relay-goerli.flashbots.net/";
const DEPLOYED_ADRS = "0x26C4ca34f722BD8fD23D58f34576d8718c883A80"


const provider = new providers.JsonRpcProvider({
  // @ts-ignore
  url: process.env.ETH_RPC_URL,
});


// @ts-ignore
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

async function main() {
  const signer = new Wallet(
    "0x2000000000000000000000000000000000000000000000000000000000000000"
  );
  //   const signer = Wallet.createRandom();
  const flashbot = await FlashbotsBundleProvider.create(
    provider,
    signer,
    FLASHBOTS_ENDPOINT
  );

  console.log("Started...")
  const start = Date.now();

  // Use await to get the nonce
  const nonce = await wallet.getTransactionCount();

  provider.on("block", async (block) => {

    const signedTx = await flashbot.signBundle([
      {
        signer: wallet,
        transaction: {
          nonce: nonce,
          chainId: CHAIN_ID,
          type: 2, // EIP 1559 transaction
          value: 0,
          data: "0x",
          maxFeePerGas: ethers.BigNumber.from(GWEI).mul(10),
          maxPriorityFeePerGas: ethers.BigNumber.from(GWEI).mul(2),
          gasLimit: 1000000,
          to: DEPLOYED_ADRS
        },
      },
    ]);

    const targetBlock = block + 1;
    const sim = await flashbot.simulate(signedTx, targetBlock);

    if ("error" in sim) {
      //console.log(`simulation error: ${sim.error.message}`);
    } else {
      //console.log(`simulation success: ${JSON.stringify(sim, null, 2)}`);
      //console.log(`simulation success`);
    }

    const res = await flashbot.sendRawBundle(signedTx, targetBlock);
    if ("error" in res) {
      throw new Error(res.error.message);
    }

    const bundleResolution = await res.wait();
    if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
      console.log(`Txn included in block: ${targetBlock}`);
      console.log((sim as any)['results'][0]['txHash']);
      const end = Date.now();
      const latency = (end - start) / 1000; 
      console.log(`Latency ${latency} seconds.`);
      process.exit(0);
    } else if (
      bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion
    ) {
      //console.log(`Not included in ${targetBlock}`);
    } else if (
      bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh
    ) {
      console.log("Nonce too high, bailing");
      process.exit(1);
    }
  });
}

main();