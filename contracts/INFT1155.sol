//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INFT1155{

    function getTokenData(uint256 tokenId) external view returns (address creator, uint256 royalty);

    function mintNew(uint amount, uint256 royalty, string memory ipfshash) external returns (uint);

    function balanceOf(address account, uint256 id) external view returns (uint256);

    function isApprovedForAll(address account, address operator) external view returns (bool);

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;

}