// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./VaultTraderBase.sol";

interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function getAmountsOut(uint256 amountIn, Route[] calldata routes)
    external
    view
    returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/**
 * @title VaultTraderAerodrome
 */
contract VaultTraderAerodrome is VaultTraderBase {
    using SafeERC20 for IERC20;

    address public aerodromeRouter;

    event SwapPerformed(
        address indexed swapper,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bool stable
    );

    /**
     * @notice Initializes the contract with the given parameters.
     */
    function initialize(
        address _owner,
        address _swapper,
        address _weth,
        address _aerodromeRouter
    ) public initializer {
        initializeBase(_owner, _swapper, _weth);
        require(_aerodromeRouter != address(0), "VaultTrader: invalid router address");
        aerodromeRouter = _aerodromeRouter;
    }

    /**
     * @notice Executes a swap with dynamic route configuration.
     */
    function swapExactIn(
        uint256 amountIn,
        uint256 amountOutMin,
        IAerodromeRouter.Route[] memory routes
    ) internal returns (uint256[] memory amounts) {
        require(amountIn > 0, "VaultTrader: amountIn must be greater than 0");
        require(routes.length > 0, "VaultTrader: invalid route");

        address tokenIn = routes[0].from;
        IERC20(tokenIn).approve(aerodromeRouter, amountIn);

        amounts = IAerodromeRouter(aerodromeRouter).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            routes,
            address(this),
            block.timestamp
        );

        emit SwapPerformed(
            msg.sender,
            tokenIn,
            routes[routes.length - 1].to,
            amountIn,
            amounts[amounts.length - 1],
            routes[0].stable
        );
    }

    /**
     * @notice Executes a stable swap on the Aerodrome Router.
     */
    function swapStableExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlySwapper returns (uint256[] memory amounts) {
        IAerodromeRouter.Route[] memory routes;
        routes[0] = IAerodromeRouter.Route({
            from: tokenIn,
            to: tokenOut,
            stable: true,
            factory: address(0) // Use default factory
        });

        return swapExactIn(amountIn, amountOutMin, routes);
    }

    /**
     * @notice Executes a volatile swap on the Aerodrome Router.
     */
    function swapVolatileExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlySwapper returns (uint256[] memory amounts) {
        IAerodromeRouter.Route[] memory routes;
        routes[0] = IAerodromeRouter.Route({
            from: tokenIn,
            to: tokenOut,
            stable: false,
            factory: address(0) // Use default factory
        });

        return swapExactIn(amountIn, amountOutMin, routes);
    }
}
