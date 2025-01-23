import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { ethers, upgrades } from "hardhat";
import type {
    MockERC20,
    MockAerodromeRouter,
    VaultTraderAerodrome
} from "../typechain-types";

describe("VaultTraderAerodrome", function () {
    async function deployFixture() {
        const [owner, swapper, other] = await ethers.getSigners();

        // 1. Deploy Mock Tokens
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const tokenIn = (await MockERC20Factory.deploy("TokenIn", "TIN", 18)) as MockERC20;
        await tokenIn.waitForDeployment();

        const tokenOut = (await MockERC20Factory.deploy("TokenOut", "TOUT", 18)) as MockERC20;
        await tokenOut.waitForDeployment();

        // WETH mock
        const weth = (await MockERC20Factory.deploy("Wrapped Ether", "WETH", 18)) as MockERC20;
        await weth.waitForDeployment();

        // 2. Deploy Mock Aerodrome Router
        const MockAerodromeRouterFactory = await ethers.getContractFactory("MockAerodromeRouter");
        const aerodromeRouter = (await MockAerodromeRouterFactory.deploy()) as MockAerodromeRouter;
        await aerodromeRouter.waitForDeployment();

        // 3. Deploy VaultTraderAerodrome as an upgradeable contract
        const VaultTraderAerodromeFactory = await ethers.getContractFactory("VaultTraderAerodrome");
        const vaultTrader = (await upgrades.deployProxy(
            VaultTraderAerodromeFactory,
            [
                owner.address,                 // _owner
                swapper.address,               // _swapper
                await weth.getAddress(),       // _weth
                await aerodromeRouter.getAddress()  // _aerodromeRouter
            ],
            { initializer: "initialize" }
        )) as VaultTraderAerodrome;
        await vaultTrader.waitForDeployment();

        return {
            owner,
            swapper,
            other,
            tokenIn,
            tokenOut,
            weth,
            aerodromeRouter,
            vaultTrader
        };
    }

    describe("Initialization", function () {
        it("should set the correct owner, swapper, WETH, and router", async () => {
            const { vaultTrader, owner, swapper, weth, aerodromeRouter } = await loadFixture(deployFixture);

            expect(await vaultTrader.owner()).to.equal(owner.address);
            expect(await vaultTrader.swapper()).to.equal(swapper.address);
            expect(await vaultTrader.weth()).to.equal(await weth.getAddress());
            expect(await vaultTrader.aerodromeRouter()).to.equal(await aerodromeRouter.getAddress());
        });

        it("should revert if _aerodromeRouter is zero", async () => {
            const [owner, swapper] = await ethers.getSigners();
            const {  weth } = await loadFixture(deployFixture);

            const VaultTraderAerodromeFactory = await ethers.getContractFactory("VaultTraderAerodrome");
            await expect(
                upgrades.deployProxy(
                    VaultTraderAerodromeFactory,
                    [owner.address, swapper.address, await weth.getAddress(), ethers.ZeroAddress],
                    { initializer: "initialize" }
                )
            ).to.be.revertedWith("VaultTrader: invalid router address");
        });
    });

    describe("swapStableExactIn", function () {
        it("should swap tokens via the mocked Aerodrome Router (stable)", async () => {
            const { vaultTrader, tokenIn, tokenOut, swapper } = await loadFixture(deployFixture);

            // Mint some tokenIn to the vault
            await tokenIn.mint(await vaultTrader.getAddress(), ethers.parseUnits("100", 18));

            const amountIn = ethers.parseUnits("10", 18);
            const amountOutMin = ethers.parseUnits("5", 18);

            // Connect as swapper
            await expect(
                vaultTrader.connect(swapper).swapStableExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    amountIn,
                    amountOutMin
                )
            )
                .to.emit(vaultTrader, "SwapPerformed")
                // The event has 6 args: swapper, tokenIn, tokenOut, amountIn, amountOut, stable
                .withArgs(
                    swapper.address,
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    amountIn,
                    anyValue, // final amount from the mock
                    true      // stable = true
                );
        });

        it("should revert if not called by swapper", async () => {
            const { vaultTrader, owner, tokenIn, tokenOut } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(owner).swapStableExactIn(
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
                vaultTrader.connect(swapper).swapStableExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    0,
                    100
                )
            ).to.be.revertedWith("VaultTrader: amountIn must be greater than 0");
        });

        it("should revert if tokenIn or tokenOut is zero address", async () => {
            const { vaultTrader, swapper, tokenIn } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(swapper).swapStableExactIn(
                    ethers.ZeroAddress,
                    await tokenIn.getAddress(),
                    100,
                    50
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");

            await expect(
                vaultTrader.connect(swapper).swapStableExactIn(
                    await tokenIn.getAddress(),
                    ethers.ZeroAddress,
                    100,
                    50
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");
        });
    });

    describe("swapVolatileExactIn", function () {
        it("should swap tokens via the mocked Aerodrome Router (volatile)", async () => {
            const { vaultTrader, tokenIn, tokenOut, swapper } = await loadFixture(deployFixture);

            // Mint some tokenIn to the vault
            await tokenIn.mint(await vaultTrader.getAddress(), ethers.parseUnits("50", 18));

            const amountIn = ethers.parseUnits("10", 18);
            const amountOutMin = ethers.parseUnits("4", 18);

            await expect(
                vaultTrader.connect(swapper).swapVolatileExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    amountIn,
                    amountOutMin
                )
            )
                .to.emit(vaultTrader, "SwapPerformed")
                .withArgs(
                    swapper.address,
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    amountIn,
                    anyValue,
                    false // stable = false
                );
        });

        it("should revert if not called by swapper", async () => {
            const { vaultTrader, owner, tokenIn, tokenOut } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(owner).swapVolatileExactIn(
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
                vaultTrader.connect(swapper).swapVolatileExactIn(
                    await tokenIn.getAddress(),
                    await tokenOut.getAddress(),
                    0,
                    100
                )
            ).to.be.revertedWith("VaultTrader: amountIn must be greater than 0");
        });

        it("should revert if tokenIn or tokenOut is zero address", async () => {
            const { vaultTrader, swapper, tokenIn } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(swapper).swapVolatileExactIn(
                    ethers.ZeroAddress,
                    await tokenIn.getAddress(),
                    100,
                    50
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");

            await expect(
                vaultTrader.connect(swapper).swapVolatileExactIn(
                    await tokenIn.getAddress(),
                    ethers.ZeroAddress,
                    100,
                    50
                )
            ).to.be.revertedWith("VaultTrader: invalid token address");
        });
    });
});
