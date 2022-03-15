//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/math/SafeMath.sol';
import './INFT1155.sol';
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";


contract Marketplace is AccessControl{
  
  using SafeMath for uint256;


  //EVENTS
  event Sell(address seller, uint256 orderId, uint256 tokenId);
  event Buy(address buyer, uint256 orderId, uint256 tokenId);
  event Cancel(address seller, uint256 orderId, uint256 tokenId);
  event AuctionCreated(address initOwner,uint256 amount, uint256 tokenId, uint256 endTime);
  event BidCreated(address bidder, uint256 newPrice);
  bytes32 public constant SIMPLE_ADMIN_ROLE = keccak256("SIMPLE_ADMIN_ROLE");


  INFT1155 token;
  struct Order{
    uint256 orderId;
    address seller;
    uint256 tokenId;
    uint256 amount;
    uint256 price;
    bool active;
  }
  struct Auction {
    uint256 endTime;
    uint256 initPrice;
    uint256 currentPrice;
    uint256 minPriceForSale;
    uint256 tokenId;
    uint256 amount;
    Status status;
    address initOwner;
    address newOwner;
  }
  mapping(uint256 =>Auction) public auctions;
  mapping(uint256 => Order) public orders;
  uint256 public orderId = 1;
  uint256 public currentAuction;

  enum Status {
    OVER,
    INPROCESS
  }


  constructor(INFT1155 _token){
    _setupRole(DEFAULT_ADMIN_ROLE,msg.sender);
    token = _token;
  }

  modifier onlyAuctioneer() {
    require(msg.sender==auctions[currentAuction].initOwner);
    _;
  }

  /**
    @notice creates a sell order
    @param tokenId token id
    @param amount amounts of tokens to sell
    @param price order price
  */
  function sell(uint256 tokenId, uint256 amount, uint256 price) public {
    require(INFT1155(token).balanceOf(msg.sender, tokenId) >= amount, "Not enough items owned");
    require(INFT1155(token).isApprovedForAll(msg.sender, address(this)), "Not approved");

    Order memory newOrder = Order({
      orderId: orderId,
      seller: msg.sender,
      tokenId: tokenId,
      amount: amount,
      price: price,
      active: true
    });
    orders[orderId] = newOrder;
    emit Sell(msg.sender, orderId, tokenId);
    orderId++;
  }
  /***
    @notice create auction
    @param _initPrice initial price for auction
    @param _tokenId token id 
    @param _amount amount of tokens in collection
    @param _endTime timestamp when the auction is over
    @param _minPriceForSale if the current price do not reach this value cancel auction
  */
  function createAuction (uint256 _initPrice,uint256 _tokenId,uint256 _amount,uint256 _endTime, uint256 _minPriceForSale)public {
    require(hasRole(SIMPLE_ADMIN_ROLE,msg.sender)||hasRole(DEFAULT_ADMIN_ROLE,msg.sender),"Not admin");
    require(checkStatus()==Status.OVER,"The current auction isnt over");
    require(INFT1155(token).balanceOf(msg.sender, _tokenId) >= _amount, "Not enough items owned");
    require(INFT1155(token).isApprovedForAll(msg.sender, address(this)), "Not approved");
    require(block.timestamp<_endTime,"End time should be greater than now");
    require(_minPriceForSale>=_initPrice,"priceForSale should be greater than init Price");
    Auction memory newAuction = Auction({
    endTime:_endTime,
    initPrice:_initPrice,
    currentPrice:_initPrice,
    minPriceForSale:_minPriceForSale,
    tokenId:_tokenId,
    amount:_amount,
    status:Status.INPROCESS,
    initOwner:msg.sender,
    newOwner:msg.sender
    });
    currentAuction++;
    auctions[currentAuction] = newAuction;
    emit AuctionCreated(msg.sender, _amount, _tokenId, _endTime);
  }
   /**
    @notice make a bid payable
  */
  function makeAbid() public payable {
    require(msg.sender!=auctions[currentAuction].initOwner,"Already the owner");
    require(checkStatus()==Status.INPROCESS,"This auction is over");
    require(auctions[currentAuction].endTime>block.timestamp,"This auction is over");
    require(msg.value>auctions[currentAuction].currentPrice,"Your offer must be greater than the existing one");
    if(auctions[currentAuction].newOwner==auctions[currentAuction].initOwner) {
    auctions[currentAuction].newOwner=msg.sender;
    auctions[currentAuction].currentPrice=msg.value;
    } else {
      payable(auctions[currentAuction].newOwner).transfer(auctions[currentAuction].currentPrice);
      auctions[currentAuction].newOwner=msg.sender;
      auctions[currentAuction].currentPrice=msg.value;
    }
    emit BidCreated(msg.sender,msg.value);
  }
  /**
    @notice cancel auction
  */
  function cancelAuction() public onlyAuctioneer {
  require(checkStatus()!=Status.OVER);
  if(auctions[currentAuction].newOwner!=auctions[currentAuction].initOwner) {
  payable(auctions[currentAuction].newOwner).transfer(auctions[currentAuction].currentPrice);}
  auctions[currentAuction].status= Status.OVER;
  }
   /**
    @notice check status
  */
  function checkStatus() public returns (Status) {
    if(auctions[currentAuction].status==Status.OVER) {
      return Status.OVER;
    } else if(block.timestamp>auctions[currentAuction].endTime) {
      if(auctions[currentAuction].initOwner!=auctions[currentAuction].newOwner){ 
        if(auctions[currentAuction].currentPrice>=auctions[currentAuction].minPriceForSale) {
        payable(auctions[currentAuction].initOwner).transfer(auctions[currentAuction].currentPrice);
        INFT1155(token).safeTransferFrom(auctions[currentAuction].initOwner,auctions[currentAuction].newOwner, auctions[currentAuction].tokenId, auctions[currentAuction].amount, "");
            auctions[currentAuction].status=Status.OVER;
      return Status.OVER;
      } else {
       payable(auctions[currentAuction].newOwner).transfer(auctions[currentAuction].currentPrice);
      auctions[currentAuction].status=Status.OVER;
      return Status.OVER;
      }} else {
        console.log("AQuiii");
        auctions[currentAuction].status=Status.OVER;
        return Status.OVER;
      }
     
    }
    return Status.INPROCESS;
  }
  /**
    @notice cancels order
    @param _orderId orderId to cancel
  */
  function cancelOrder(uint256 _orderId) public {
    Order storage order = orders[_orderId];
    require(order.seller == msg.sender, "Order is not yours");
    order.active = false;
    emit Cancel(msg.sender, _orderId, order.tokenId);
  }

  /**
    @notice buy an order with ETH
    @param _orderId orderId to buy
  */
  function buy(uint256 _orderId) public payable {
    require(msg.value > 0, "You must pay!");

    Order storage order = orders[_orderId];

    require(order.active, "Order not active");
    require(order.seller != msg.sender, "Its your own item");

    require(msg.value >= order.price);
    (address creator, uint256 royalty) = INFT1155(token).getTokenData(order.tokenId);
    uint resto = msg.value - order.price;
    uint comision = order.price.mul(royalty).div(100);
    uint payAmount = order.price.sub(comision);
    order.active = false;

    payable(msg.sender).transfer(resto);
    payable(order.seller).transfer(payAmount);
    payable(creator).transfer(comision);

    INFT1155(token).safeTransferFrom(order.seller, msg.sender, order.tokenId, order.amount, "");

    emit Buy(msg.sender, _orderId, order.tokenId);
  }

  /// ONLY VIEW FUNCTIONS
  function getCurrentAuction() public view returns (Auction memory) {
    return auctions[currentAuction];
  }

}