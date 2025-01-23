// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./VaultTraderBase.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Minimal interface for Uniswap V2 Router.
 */
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/**
 * @dev Minimal interface for Uniswap V3 Router.
 */
interface IUniswapV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title VaultTraderUniswap
 * @notice Implements token swaps on Uniswap V2 & V3.
 */
contract VaultTraderUniswap is VaultTraderBase {
    address public uniswapV2Router;
    address public uniswapV3SwapRouter;

    event V2SwapPerformed(
        address indexed swapper,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event V3SwapPerformed(
        address indexed swapper,
        address indexed tokenIn,
        address indexed tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @notice Initializes the contract with owner, swapper, WETH, and Uniswap router addresses.
     */
    function initialize(
        address _owner,
        address _swapper,
        address _weth,
        address _uniswapV2Router,
        address _uniswapV3SwapRouter
    ) public initializer {
        initializeBase(_owner, _swapper, _weth);
        require(_uniswapV2Router != address(0), "VaultTrader: invalid V2 router address");
        require(_uniswapV3SwapRouter != address(0), "VaultTrader: invalid V3 router address");

        uniswapV2Router = _uniswapV2Router;
        uniswapV3SwapRouter = _uniswapV3SwapRouter;
    }

    /**
     * @notice Perform a token swap on Uniswap V2 via swapExactTokensForTokens.
     */
    function swapV2ExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlySwapper returns (uint256[] memory amounts) {
        require(amountIn > 0, "VaultTrader: amountIn must be greater than 0");
        require(tokenIn != address(0) && tokenOut != address(0), "VaultTrader: invalid token address");

        IERC20(tokenIn).approve(uniswapV2Router, amountIn);

        // Construct path: if either tokenIn or tokenOut is WETH, path is length 2; otherwise tokenIn -> WETH -> tokenOut
        address[] memory path;
        if (tokenIn == address(weth) || tokenOut == address(weth)) {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
        } else {
            path = new address[](3);
            path[0] = tokenIn;
            path[1] = address(weth);
            path[2] = tokenOut;
        }

        amounts = IUniswapV2Router(uniswapV2Router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );

        emit V2SwapPerformed(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amounts[amounts.length - 1]
        );
    }

    /**
     * @notice Perform a token swap on Uniswap V3 via exactInputSingle.
     */
    function swapV3ExactIn(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external onlySwapper returns (uint256 amountOut) {
        require(amountIn > 0, "VaultTrader: amountIn must be greater than 0");
        require(tokenIn != address(0) && tokenOut != address(0), "VaultTrader: invalid token address");

        IERC20(tokenIn).approve(uniswapV3SwapRouter, amountIn);

        IUniswapV3SwapRouter.ExactInputSingleParams memory params = IUniswapV3SwapRouter
            .ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this),
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = IUniswapV3SwapRouter(uniswapV3SwapRouter).exactInputSingle(params);

        emit V3SwapPerformed(msg.sender, tokenIn, tokenOut, fee, amountIn, amountOut);
    }
}
