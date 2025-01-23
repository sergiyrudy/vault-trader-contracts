// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockAerodromeRouter {
    event SwapCalled(
        address caller,
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        bool stable
    );

    function swapExactTokensForTokensSimple(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        bool stable,
        address to,
        uint256 // deadline
    ) external returns (uint256[] memory amounts) {
        // emit an event and return a dummy amounts array for testing purposes
        emit SwapCalled(msg.sender, amountIn, amountOutMin, tokenIn, tokenOut, stable);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        // like we got some bigger or smaller last value
        amounts[1] = amountOutMin + 100;
        return amounts;
    }
}
