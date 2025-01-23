// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../VaultTraderBase.sol";

contract VaultTraderBaseTest is VaultTraderBase {
    event OwnershipVerified(address indexed owner);
    event SwapperVerified(address indexed swapper);

    function testInitializeBase(
        address _owner,
        address _swapper,
        address _weth
    ) external {
        initializeBase(_owner, _swapper, _weth);
    }

    function testOnlySwapperFunction() external onlySwapper {
        // for testing purposes just emit an event and check if it works
        emit SwapperVerified(swapper);
    }

    function testOnlyOwnerFunction() external onlyOwner {
        emit OwnershipVerified(owner);
    }

    function getWethBalance() external view returns (uint256) {
        return weth.balanceOf(address(this));
    }
}
