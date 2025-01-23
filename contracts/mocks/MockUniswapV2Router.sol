// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockUniswapV2Router {
    event SwapCalled(address caller, uint256 amountIn, uint256 amountOutMin, address[] path);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 // deadline
    ) external returns (uint256[] memory amounts) {
        // just for test return a dummy amount
        emit SwapCalled(msg.sender, amountIn, amountOutMin, path);

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[amounts.length - 1] = amountOutMin + 42;
        return amounts;
    }
}
