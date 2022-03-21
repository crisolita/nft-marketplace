const {
  BN,
  expectEvent,
  time,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const ether = require("@openzeppelin/test-helpers/src/ether");
const { current } = require("@openzeppelin/test-helpers/src/balance");
require("chai").use(require("chai-bn")(BN));

const toWei = (value) => web3.utils.toWei(String(value));
describe ("Only super admin functions", () => {
  let nft1155;
  let marketplace;

  beforeEach(async () => {
    [auctioneer, user1, user2] = await ethers.getSigners();

    const NFT1155 = await ethers.getContractFactory("NFT1155");
    nft1155 = await NFT1155.deploy("htttp://");
    await nft1155.deployed();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.connect(auctioneer).deploy(nft1155.address);
    await marketplace.deployed();

    await nft1155
      .connect(auctioneer)
      .mintNew(
        ethers.utils.parseUnits("100", "ether"),
        10,
        "my content",
        "nft-hash-1"
      );
});
it("Only super admin can grant roles", async ()=>{
  const role = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("SIMPLE_ADMIN_ROLE")
  );
await marketplace.connect(auctioneer).grantRole(role,user2.address);

await expectRevert(marketplace.connect(user2).grantRole(role,user1.address),"AccessControl: sender must be an admin to grant");

});
});
describe("Marketplace's auctions", () => {
  let nft1155; 
  let marketplace;

  beforeEach(async () => {
    [auctioneer, user1, user2] = await ethers.getSigners();

    const NFT1155 = await ethers.getContractFactory("NFT1155");
    nft1155 = await NFT1155.deploy("htttp://");
    await nft1155.deployed();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.connect(auctioneer).deploy(nft1155.address);
    await marketplace.deployed();

    await nft1155
      .connect(auctioneer)
      .mintNew(
        ethers.utils.parseUnits("100", "ether"),
        10,
        "my content",
        "nft-hash-1"
      );
  });
  it("Should fail to create auction", async () => {
    const initPrice = ethers.utils.parseUnits("1", "ether"),
      endTime = Number(await time.latest()) + time.duration.days(3),
      tokenId = 1,
      amount = ethers.utils.parseUnits("10", "ether"),
      minPriceForSale = ethers.utils.parseUnits("5", "ether");
    await expectRevert(
      marketplace
        .connect(auctioneer)
        .createAuction(initPrice, tokenId, amount, endTime, minPriceForSale),
      "Not approved"
    );
  });

  it("Errors creating auction", async () => {
    const initPrice = ethers.utils.parseUnits("1", "ether"),
      endTime = Number(await time.latest()) + time.duration.days(3),
      tokenId = 1,
      amount = ethers.utils.parseUnits("10", "ether"),
      minPriceForSale = ethers.utils.parseUnits("5", "ether");
    await nft1155
      .connect(auctioneer)
      .setApprovalForAll(marketplace.address, true);
    await marketplace
      .connect(auctioneer)
      .createAuction(initPrice, tokenId, amount, endTime, minPriceForSale);
    await expectRevert(
      marketplace
        .connect(auctioneer)
        .createAuction(initPrice, tokenId, amount, endTime, minPriceForSale),
      "The current auction isnt over"
    );
    await marketplace.connect(auctioneer).cancelAuction();
    let newEndTime = Number(await time.latest()) + time.duration.days(3);
    await expectRevert(
      marketplace
        .connect(auctioneer)
        .createAuction(
          initPrice,
          tokenId,
          ethers.utils.parseUnits("101", "ether"),
          newEndTime,
          minPriceForSale
        ),
      "Not enough items owned"
    );
    newEndTime = Number(await time.latest()) - time.duration.days(3);

    await expectRevert(
      marketplace
        .connect(auctioneer)
        .createAuction(initPrice, tokenId, amount, newEndTime, minPriceForSale),
      "End time should be greater than now"
    );
    newEndTime = Number(await time.latest()) + time.duration.days(3);

    await expectRevert(
      marketplace
        .connect(auctioneer)
        .createAuction(
          ethers.utils.parseUnits("2", "ether"),
          tokenId,
          amount,
          newEndTime,
          ethers.utils.parseUnits("1", "ether")
        ),
      "priceForSale should be greater than init Price"
    );
  });

  it("Create an auction works!!", async () => {
    const initPrice = ethers.utils.parseUnits("1", "ether"),
      endTime = Number(await time.latest()) + time.duration.days(3),
      tokenId = 1,
      amount = ethers.utils.parseUnits("10", "ether"),
      minPriceForSale = ethers.utils.parseUnits("5", "ether");

    await nft1155
      .connect(auctioneer)
      .setApprovalForAll(marketplace.address, true);
    const tx = await marketplace
      .connect(auctioneer)
      .createAuction(initPrice, tokenId, amount, endTime, minPriceForSale);
    currentAuction = await marketplace.getCurrentAuction();

    expect(currentAuction.initOwner).to.equal(auctioneer.address);
    expect(currentAuction.initPrice).to.equal(initPrice);
    expect(currentAuction.tokenId).to.equal(tokenId);
    expect(currentAuction.amount).to.equal(amount);
    expect(currentAuction.endTime).to.equal(endTime);
  });
  it("Errors making a bid", async () => {
    await nft1155
      .connect(auctioneer)
      .setApprovalForAll(marketplace.address, true);
    const initPrice = ethers.utils.parseUnits("1", "ether"),
      endTime = Number(await time.latest()) + time.duration.days(3),
      tokenId = 1,
      amount = ethers.utils.parseUnits("10", "ether"),
      minPriceForSale = ethers.utils.parseUnits("5", "ether");
    await marketplace
      .connect(auctioneer)
      .createAuction(initPrice, tokenId, amount, endTime, minPriceForSale);

    await expectRevert(
      marketplace.connect(auctioneer).makeAbid({ value: initPrice + 1 }),
      "Already the owner"
    );
    await marketplace.connect(auctioneer).cancelAuction();
    await expectRevert(
      marketplace.connect(user1).makeAbid({ value: initPrice + 1 }),
      "This auction is over"
    );
    await marketplace
      .connect(auctioneer)
      .createAuction(initPrice, tokenId, amount, endTime, minPriceForSale);
    await expectRevert(
      marketplace.connect(user1).makeAbid({ value: initPrice }),
      "Your offer must be greater than the existing one"
    );
    const tx = await marketplace
      .connect(user1)
      .makeAbid({ value: initPrice + 1 });
    await tx.wait;
  });
  it("An user can win an auction", async () => {
    await nft1155
      .connect(auctioneer)
      .setApprovalForAll(marketplace.address, true);
    const initPrice = ethers.utils.parseUnits("1", "ether"),
      endTime = Number(await time.latest()) + Number(time.duration.days(3)),
      tokenId = 1,
      amount = ethers.utils.parseUnits("10", "ether"),
      minPriceForSale = ethers.utils.parseUnits("5", "ether");
    await marketplace
      .connect(auctioneer)
      .createAuction(initPrice, tokenId, amount, endTime, minPriceForSale);
    await marketplace
      .connect(user1)
      .makeAbid({ value: ethers.utils.parseUnits("5", "ether") });
    const balanceNFTUserBefore = await nft1155.balanceOf(user1.address, 1);
    await time.increase(time.duration.days(50));
    const balanceETHAuctioneerBefore = await auctioneer.getBalance();
    const status = await marketplace.connect(user1).checkStatus();
    const balanceNFTUserAfter = await nft1155.balanceOf(user1.address, 1);
    expect(Number(balanceNFTUserAfter)).to.gt(Number(balanceNFTUserBefore));
    await expectRevert(
      marketplace
        .connect(user2)
        .makeAbid({ value: ethers.utils.parseUnits("6", "ether") }),
      "This auction is over"
    );
    const balanceETHAuctioneerAfter = await auctioneer.getBalance();
    expect(Number(balanceETHAuctioneerAfter)).to.gt(
      Number(balanceETHAuctioneerBefore)
    );
  }); });
describe("Markeplace", () => {
  let admin;
  let alice;
  let bob;
  let recipient;

  let nft1155;
  let marketplace;

  before(async () => {
    [admin, alice, bob, recipient] = await ethers.getSigners();

    const NFT1155 = await ethers.getContractFactory("NFT1155");
    nft1155 = await NFT1155.deploy("htttp://");
    await nft1155.deployed();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(nft1155.address);
    await marketplace.deployed();
  });

  it("Should create NFT", async () => {
    let before = await nft1155.balanceOf(admin.address, 1);
    await nft1155.connect(admin).mintNew(100, 10, "my content", "nft-hash-1");
    let after = await nft1155.balanceOf(admin.address, 1);

    expect(Number(after)).to.gt(Number(before));
  });

  it("Should fail to create sell order (not apporved)", async () => {
    await expectRevert(
      marketplace.connect(admin).sell(1, 10, toWei(0.1)),
      "Not approved"
    );
  });

  it("Should create a sell order", async () => {
    await nft1155.connect(admin).setApprovalForAll(marketplace.address, true);
    await marketplace.connect(admin).sell(1, 10, toWei(0.1));
    let order = await marketplace.orders(1);
    expect(order.seller).to.equal(admin.address);
    expect(Number(order.tokenId)).to.equal(1);
    expect(Number(order.amount)).to.equal(10);
    expect(Number(order.price)).to.equal(Number(toWei(0.1)));

    // let tx = await marketplace.connect(alice).sell(1, 10, Number(time.duration.days(10)), 100);
    // expectEvent(tx, "Sell", {
    //   seller: alice.address,
    //   orderId: ethers.BigNumber.from(1)
    // });
  });

  it("Should buy an order", async () => {
    let prevBalance = await nft1155.balanceOf(bob.address, 1);
    let prevEth = await admin.getBalance();
    await marketplace.connect(bob).buy(1, { value: toWei("1") });
    let postBalance = await nft1155.balanceOf(bob.address, 1);
    let postEth = await admin.getBalance();
    expect(Number(postBalance)).to.gt(Number(prevBalance));
    expect(Number(postEth)).to.gt(Number(prevEth));
  });

  it("Should not buy an order not active", async () => {
    await expectRevert(
      marketplace.connect(bob).buy(1, { value: toWei("1") }),
      "Order not active"
    );
  });

  it("Should create a sell order", async () => {
    await nft1155.connect(bob).setApprovalForAll(marketplace.address, true);
    await marketplace.connect(bob).sell(1, 10, toWei(1));
    let order = await marketplace.orders(2);
    expect(order.seller).to.equal(bob.address);
    expect(Number(order.tokenId)).to.equal(1);
    expect(Number(order.amount)).to.equal(10);
    expect(Number(order.price)).to.equal(Number(toWei(1)));

    // let tx = await marketplace.connect(alice).sell(1, 10, toWei(1));
    // expectEvent(tx, "Sell", {
    //   seller: alice.address,
    //   orderId: ethers.BigNumber.from(1)
    // });
  });

  it("Should cancel an order", async () => {
    let orderPrev = await marketplace.orders(2);
    await marketplace.connect(bob).cancelOrder(2);
    let orderPost = await marketplace.orders(2);
    expect(orderPrev.active).to.not.equal(orderPost.active);
  });
});