// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @dev Interface for WETH to allow deposit/withdraw of native Ether.
 */
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/**
 * @title VaultTraderBase
 * @dev Abstract base contract for managing ownership, swapper permissions, and WETH wrapping/unwrapping.
 */
abstract contract VaultTraderBase is Initializable {
    address public owner;
    address public swapper;
    IWETH public weth;

    /**
     * @dev Emitted when tokens are withdrawn from the contract.
     * @param token The address of the token withdrawn.
     * @param amount The amount of tokens withdrawn.
     * @param to The recipient address.
     */
    event TokensWithdrawn(address indexed token, uint256 amount, address indexed to);

    /**
     * @dev Emitted when Ether is withdrawn from the contract (after unwrapping WETH).
     * @param amount The amount of Ether withdrawn.
     * @param to The recipient address.
     */
    event EtherWithdrawn(uint256 amount, address indexed to);

    modifier onlyOwner() {
        require(msg.sender == owner, "VaultTrader: caller is not the owner");
        _;
    }

    modifier onlySwapper() {
        require(msg.sender == swapper, "VaultTrader: caller is not the swapper");
        _;
    }

    /**
     * @notice Initialize the base contract with owner, swapper, and WETH addresses.
     * @param _owner The contract owner address.
     * @param _swapper The address authorized to perform swaps.
     * @param _weth The WETH contract address.
     */
    function initializeBase(
        address _owner,
        address _swapper,
        address _weth
    ) internal initializer {
        require(_owner != address(0), "VaultTrader: invalid owner address");
        require(_swapper != address(0), "VaultTrader: invalid swapper address");
        require(_weth != address(0), "VaultTrader: invalid WETH address");

        owner = _owner;
        swapper = _swapper;
        weth = IWETH(_weth);
    }

    /**
     * @notice Automatically wraps any native Ether sent into WETH.
     */
    receive() external payable {
        if (msg.value > 0) {
            weth.deposit{value: msg.value}();
        }
    }

    /**
     * @notice Withdraw tokens from the contract to the owner.
     *         If token is WETH, unwrap it to Ether before sending.
     * @param tokenAddress The address of the token to withdraw.
     */
    function withdrawTokensWithUnwrapIfNecessary(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));

        require(balance > 0, "VaultTrader: no tokens to withdraw");

        if (tokenAddress == address(weth)) {
            weth.withdraw(balance);
            payable(owner).transfer(balance);

            emit EtherWithdrawn(balance, owner);
        } else {
            token.transfer(owner, balance);
            emit TokensWithdrawn(tokenAddress, balance, owner);
        }
    }

    function setSwapper(address newSwapper) external onlyOwner {
        require(newSwapper != address(0), "Invalid swapper");
        swapper = newSwapper;
    }
}
