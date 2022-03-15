const { ethers, upgrades } = require("hardhat");
const ipfsClient = require("ipfs-http-client");

const ipfs = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

async function main() {
  try {
    const schema = {
      name: "NFT Creator",
      description: "NFT Creator machine",
      image: "https://nft-minter.tk/logo.png",
      external_link: "https://nft-minter.tk",
    }
  
    const contractUri = await ipfs.add(JSON.stringify(schema));
  
    const NFT1155 = await ethers.getContractFactory("NFT1155");
    const nft1155 = await NFT1155.deploy(contractUri.path);

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(nft1155.address);
    console.log("nft1155 deployed to:", nft1155.address);   
    console.log("marketplace deployed to:", marketplace.address);   
  
  } catch (error) {
    console.log(`error`, error)
  }

}

main();