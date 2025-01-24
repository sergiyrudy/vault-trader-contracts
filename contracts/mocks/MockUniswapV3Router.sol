// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IUniswapV3Router.sol";

contract MockUniswapV3SwapRouter is IUniswapV3SwapRouter {
    event ExactInputSingleCalled(
        address indexed caller,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 amountOut
    );

    function exactInputSingle(ExactInputSingleParams calldata params)
    external
    payable
    override
    returns (uint256 amountOut)
    {
        amountOut = params.amountIn * 2;

        emit ExactInputSingleCalled(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            params.amountOutMinimum,
            amountOut
        );
    }
}
