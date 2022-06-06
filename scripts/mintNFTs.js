const { ethers, upgrades } = require("hardhat");
const ipfsClient = require("ipfs-http-client");
const { nftsArray, ipfsArrayNFT } = require("./nfticos");

const ipfs = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});
const category = "Colección GENIUS";
const externalUrl = "http://geniusclub.info/";
const ownerContent = "0xDe1bD72a56b02A111C1ddB44051312DA2ec0C849";
const recibos = [];
const name = nftsArray[0].name;
const description = nftsArray[0].description;
const ipfsHash = ipfsArrayNFT[0].hash;
const addToIpfs = async (content) => {
  console.log("adding to IPFS...");
  const added = await ipfs.add(content, {
    progress: (prog) => console.log(`received: ${prog}`),
  });
  return added.cid.toString();
};
async function main() {
  try {
    const nft1155 = await ethers.getContractAt(
      "NFT1155",
      "0x36e823aDb470996573d0fea4F78787Ced2251bA5"
    );
    for (let i = 0; i < nftsArray.length; i++) {
      const ipfsHash = ipfsArrayNFT[i].hash;
      let loadAttributes = [];
      loadAttributes.push({
        category: category,
      });
      loadAttributes.push({
        amount: nftsArray[i].amount,
      });

      loadAttributes.push({
        royalty: nftsArray[i].royalty,
      });
      loadAttributes.push({
        externalUrl: externalUrl,
      });

      let schema = {
        name: nftsArray[i].name,
        description: nftsArray[i].description,
        image: "ipfs://" + ipfsHash,
        attributes: loadAttributes,
      };
      let schemaHash = await addToIpfs(JSON.stringify(schema));
      schema.description += `
      \n
      Metadata JSON:
      https://ipfs.io/ipfs/${schemaHash}
      `;
      schemaHash = await addToIpfs(JSON.stringify(schema));

      // Trigger Tx to smart contract

      const mintTransaction = await nft1155.mintNew(
        nftsArray[i].amount,
        nftsArray[i].royalty,
        ownerContent,
        schemaHash
      );
      const receipt = await mintTransaction.wait();
      recibos.push(receipt.transactionHash);
    }
    console.log(recibos, recibos.length);
  } catch (error) {
    console.log(`error`, error);
  }
}

main();

// console.log(ipfsArrayNFT.length, nftsArray.length);
// for (let i = 1; i < 500; i++) {
//   const balance = await nft1155.balanceOf(
//     "0xc2584107dbb06363abab8ec49beff5cbce75823e",
//     i
//   );
//   if (balance > 0) {
//     const burn = await nft1155.burnIt(i, balance, {
//       gasLimit: 300000,
//     });
//     const receipt = await burn.wait();
//     console.log(receipt.blockHash);
//   }
// }
