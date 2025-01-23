// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    receive() external payable {
        _deposit(msg.value, msg.sender);
    }

    function deposit() external payable {
        _deposit(msg.value, msg.sender);
    }

    function _deposit(uint256 amount, address account) internal {
        require(amount > 0, "MockWETH: Must send ETH");
        _mint(account, amount);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "MockWETH: Insufficient balance");
        // burn WETH tokens from the caller in exchange for Ether
        _burn(msg.sender, amount);

        // transfer Ether to the caller
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "MockWETH: Ether transfer failed");
    }
}
