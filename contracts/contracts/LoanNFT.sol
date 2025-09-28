// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Minimal NFT for loan tokens (OZ v5).
 * - Ownable now requires initial owner (pass msg.sender)
 * - simple counter for token ids
 */
contract LoanNFT is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    constructor() ERC721("LoanNFT", "LNFT") Ownable(msg.sender) {}

    function setBaseURI(string memory newBase) external onlyOwner {
        _baseTokenURI = newBase;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        _nextTokenId += 1;
        _safeMint(to, tokenId);
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
