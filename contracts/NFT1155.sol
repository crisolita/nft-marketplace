//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC1155/ERC1155Burnable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract NFT1155 is ERC1155Burnable, AccessControl{

    uint private id = 1;
    string private _baseUri;
    string private _contractUri;

    struct tokenData{
        address creator;
        uint256 royalty;
    }

    // save all NFT IPFS hashes
    mapping (uint => string) public ipfsHashes;
    mapping (uint => tokenData) public tokenDatas;
    mapping (uint => string) private ownerContents;

    //EVENTS
    event newNFT(address creator, uint amount, uint id);
    event burnNFT(address creator, uint amount, uint id);

    //MODIFIERS
    modifier onlyOwner(){
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only owner can access");
        _;
    }

    constructor(string memory contractUri) ERC1155(""){
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _baseUri = "ipfs://";
        _contractUri = string(abi.encodePacked("ipfs://", contractUri));
    }

    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    function owner() public virtual returns (address){
        return getRoleMember(DEFAULT_ADMIN_ROLE, 0);
    }

    function getTokenData(uint256 tokenId) public view returns (tokenData memory){
        return tokenDatas[tokenId];
    }

    function getOwnerContent(uint256 tokenId) public view returns (string memory){
        require(balanceOf(msg.sender, tokenId) > 0, "You dont own tokens");

        return ownerContents[tokenId];
    }

    /**
     * @dev user creates new NFTs
     */
    function mintNew(uint amount, uint256 royalty, string memory ownerContent, string memory ipfshash) public onlyOwner returns (uint){
        _mint(msg.sender, id, amount, "");
        
        ipfsHashes[id] = ipfshash;
        tokenDatas[id] = tokenData({
            creator: msg.sender,
            royalty: royalty
        });
        ownerContents[id] = ownerContent;
        emit newNFT(msg.sender, amount, id);
        id++;
        return(id-1);
    }

    /**
     * @dev user burns his NFTs
     */
    function burnIt(uint tokenId, uint amount) public onlyOwner{
        burn(msg.sender, tokenId, amount);
        emit burnNFT(msg.sender, amount, tokenId);
    }

    /**
     * @dev returns the ipfs uri to get token data
     */
    function uri(uint256 tokenId) external view override returns (string memory) {
        return string(abi.encodePacked(_baseUri, ipfsHashes[tokenId]));
    }

}