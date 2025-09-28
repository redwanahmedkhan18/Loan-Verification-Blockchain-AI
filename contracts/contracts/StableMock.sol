// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** Simple ERC20 used as a stable token in local dev */
contract StableMock is ERC20 {
    constructor() ERC20("StableMock", "USDM") {
        _mint(msg.sender, 1_000_000 ether); // 1M for the deployer
    }
}
