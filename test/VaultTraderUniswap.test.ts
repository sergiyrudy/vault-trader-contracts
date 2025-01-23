import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers, upgrades } from "hardhat";
import type {
    MockERC20,
    MockUniswapV2Router,
    MockUniswapV3SwapRouter,
    VaultTraderUniswap,
} from "../typechain-types";

describe("VaultTraderUniswap", function () {
    async function deployFixture() {
        const [owner, swapper, other] = await ethers.getSigners();

        // 1. Deploy Mock Tokens
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const tokenIn = (await MockERC20Factory.deploy("TokenIn", "TIN", 18)) as MockERC20;
        await tokenIn.waitForDeployment();

        const tokenOut = (await MockERC20Factory.deploy("TokenOut", "TOUT", 18)) as MockERC20;
        await tokenOut.waitForDeployment();

        // Mock WETH
        const weth = (await MockERC20Factory.deploy("Wrapped Ether", "WETH", 18)) as MockERC20;
        await weth.waitForDeployment();

        // 2. Deploy Mock Routers
        const UniswapV2RouterFactory = await ethers.getContractFactory("MockUniswapV2Router");
        const uniswapV2Router = (await UniswapV2RouterFactory.deploy()) as MockUniswapV2Router;
        await uniswapV2Router.waitForDeployment();

        const UniswapV3RouterFactory = await ethers.getContractFactory("MockUniswapV3SwapRouter");
        const uniswapV3Router = (await UniswapV3RouterFactory.deploy()) as MockUniswapV3SwapRouter;
        await uniswapV3Router.waitForDeployment();

        // 3. Deploy VaultTraderUniswap as an upgradeable contract
        const VaultTraderUniswapFactory = await ethers.getContractFactory("VaultTraderUniswap");
        const vaultTrader = (await upgrades.deployProxy(
            VaultTraderUniswapFactory,
            [
                owner.address,                 // _owner
                swapper.address,               // _swapper
                await weth.getAddress(),       // _weth
                await uniswapV2Router.getAddress(), // Uniswap V2 router
                await uniswapV3Router.getAddress()  // Uniswap V3 router
            ],
            { initializer: "initialize" }
        )) as VaultTraderUniswap;
        await vaultTrader.waitForDeployment();

        return {
            owner,
            swapper,
            other,
            tokenIn,
            tokenOut,
            weth,
            uniswapV2Router,
            uniswapV3Router,
            vaultTrader
        };
    }

    describe("Initialization", function () {
        it("should set the correct owner, swapper, WETH, and routers", async () => {
            const {
                vaultTrader,
                owner,
                swapper,
                weth,
                uniswapV2Router,
                uniswapV3Router,
            } = await loadFixture(deployFixture);

            expect(await vaultTrader.owner()).to.equal(owner.address);
            expect(await vaultTrader.swapper()).to.equal(swapper.address);
            expect(await vaultTrader.weth()).to.equal(await weth.getAddress());
            expect(await vaultTrader.uniswapV2Router()).to.equal(
                await uniswapV2Router.getAddress()
            );
            expect(await vaultTrader.uniswapV3SwapRouter()).to.equal(
                await uniswapV3Router.getAddress()
            );
        });

        it("should revert if any address is zero in the initializer", async () => {
            const [owner, swapper] = await ethers.getSigners();
            const { weth } = await loadFixture(deployFixture);
            const VaultTraderUniswapFactory = await ethers.getContractFactory("VaultTraderUniswap");
            // Attempt to deploy with zero address for uniswapV2, for example:
            await expect(
                upgrades.deployProxy(
                    VaultTraderUniswapFactory,
                    [
                        owner.address,
                        swapper.address,
                        await weth.getAddress(),
                        ethers.ZeroAddress,
                        ethers.ZeroAddress
                    ],
                    { initializer: "initialize" }
                )
            ).to.be.revertedWith("VaultTrader: invalid V2 router address");
        });
    });

    describe("swapV2ExactIn", function () {
        it("should swap tokens via the mocked Uniswap V2 router", async () => {
            const { vaultTrader, tokenIn, tokenOut, swapper } = await loadFixture(deployFixture);

            // Mint some tokenIn to the vault
            await tokenIn.mint(await vaultTrader.getAddress(), ethers.parseUnits("100", 18));

            const amountIn = ethers.parseUnits("10", 18);
            const amountOutMin = ethers.parseUnits("5", 18);

            // Connect as swapper
            await expect(
                vaultTrader.connect(swapper).swapV2ExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    amountIn,
                    amountOutMin
                )
            )
                .to.emit(vaultTrader, "V2SwapPerformed")
                // The event has 5 arguments: swapper, tokenIn, tokenOut, amountIn, amountOut
                // We'll fully match the first four, and the last can be 'anyValue'
                .withArgs(
                    swapper.address,
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    amountIn,
                    anyValue // partial match for the final output
                );
        });

        it("should revert if not called by swapper", async () => {
            const { vaultTrader, owner, tokenIn, tokenOut } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(owner).swapV2ExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    100,
                    50
                )
            ).to.be.revertedWith("VaultTrader: caller is not the swapper");
        });

        it("should revert if amountIn == 0", async () => {
            const { vaultTrader, swapper, tokenIn, tokenOut } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(swapper).swapV2ExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    0,
                    50
                )
            ).to.be.revertedWith("VaultTrader: amountIn must be greater than 0");
        });

        it("should revert if tokenIn or tokenOut is zero address", async () => {
            const { vaultTrader, swapper, tokenIn } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(swapper).swapV2ExactIn(
                    ethers.ZeroAddress,
                    await tokenIn.getAddress(),
                    1000,
                    500
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");

            await expect(
                vaultTrader.connect(swapper).swapV2ExactIn(
                    await tokenIn.getAddress(),
                    ethers.ZeroAddress,
                    1000,
                    500
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");
        });
    });

    describe("swapV3ExactIn", function () {
        it("should swap tokens via the mocked Uniswap V3 router", async () => {
            const { vaultTrader, tokenIn, tokenOut, swapper } = await loadFixture(deployFixture);

            await tokenIn.mint(await vaultTrader.getAddress(), ethers.parseUnits("50", 18));
            const fee = 3000; // e.g. 0.3%
            const amountIn = ethers.parseUnits("10", 18);
            const amountOutMin = ethers.parseUnits("4", 18);

            await expect(
                vaultTrader.connect(swapper).swapV3ExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    fee,
                    amountIn,
                    amountOutMin
                )
            )
                .to.emit(vaultTrader, "V3SwapPerformed")
                .withArgs(
                    swapper.address,
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    fee,
                    amountIn,
                    anyValue
                );
        });

        it("should revert if amountIn == 0", async () => {
            const { vaultTrader, swapper, tokenIn, tokenOut } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(swapper).swapV3ExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    3000,
                    0,
                    10
                )
            ).to.be.revertedWith("VaultTrader: amountIn must be greater than 0");
        });

        it("should revert if tokenIn or tokenOut is zero address", async () => {
            const { vaultTrader, swapper, tokenIn } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(swapper).swapV3ExactIn(
                    ethers.ZeroAddress,
                    await tokenIn.getAddress(),
                    3000,
                    1000,
                    500
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");

            await expect(
                vaultTrader.connect(swapper).swapV3ExactIn(
                    await tokenIn.getAddress(),
                    ethers.ZeroAddress,
                    3000,
                    1000,
                    500
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");
        });
    });
});
