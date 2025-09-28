// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleStorage {
    uint256 private _value;
    function set(uint256 newValue) external { _value = newValue; }
    function get() external view returns (uint256) { return _value; }
}
