// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IAerodromeRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAerodromeRouter is IAerodromeRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external override returns (uint256[] memory amounts) {
        require(routes.length > 0, "MockAerodromeRouter: invalid route");

        address tokenIn = routes[0].from;
        address tokenOut = routes[0].to;

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 2;

        IERC20(tokenOut).transfer(to, amounts[1]);
    }
}
