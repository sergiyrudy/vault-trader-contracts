import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { MockERC20, MockAerodromeRouter, VaultTraderAerodrome } from "../typechain-types";

describe("VaultTraderAerodrome", function () {
    async function deployFixture() {
        const [owner, swapper, other] = await ethers.getSigners();

        // Deploy Mock Tokens
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const tokenIn = (await MockERC20Factory.deploy("TokenIn", "TIN", 18)) as MockERC20;
        await tokenIn.waitForDeployment();

        const tokenOut = (await MockERC20Factory.deploy("TokenOut", "TOUT", 18)) as MockERC20;
        await tokenOut.waitForDeployment();

        const weth = (await MockERC20Factory.deploy("Wrapped Ether", "WETH", 18)) as MockERC20;
        await weth.waitForDeployment();

        // Deploy Mock Router
        const MockAerodromeRouterFactory = await ethers.getContractFactory("MockAerodromeRouter");
        const aerodromeRouter = (await MockAerodromeRouterFactory.deploy()) as MockAerodromeRouter;
        await aerodromeRouter.waitForDeployment();

        // Deploy VaultTraderAerodrome
        const VaultTraderAerodromeFactory = await ethers.getContractFactory("VaultTraderAerodrome");
        const vaultTrader = (await upgrades.deployProxy(
            VaultTraderAerodromeFactory,
            [owner.address, swapper.address, weth.target, aerodromeRouter.target],
            { initializer: "initialize" }
        )) as VaultTraderAerodrome;
        await vaultTrader.waitForDeployment();

        return { owner, swapper, other, tokenIn, tokenOut, weth, aerodromeRouter, vaultTrader };
    }

    describe("Initialization", function () {
        it("should initialize correctly", async function () {
            const { vaultTrader, owner, swapper, weth, aerodromeRouter } = await loadFixture(deployFixture);

            expect(await vaultTrader.owner()).to.equal(owner.address);
            expect(await vaultTrader.swapper()).to.equal(swapper.address);
            expect(await vaultTrader.weth()).to.equal(weth.target);
            expect(await vaultTrader.aerodromeRouter()).to.equal(aerodromeRouter.target);
        });

        it("should revert if the router address is zero", async function () {
            const { weth, vaultTrader } = await loadFixture(deployFixture);
            const VaultTraderAerodromeFactory = await ethers.getContractFactory("VaultTraderAerodrome");

            await expect(
                upgrades.deployProxy(VaultTraderAerodromeFactory, [
                    await vaultTrader.owner(),
                    await vaultTrader.swapper(),
                    weth.target,
                    ethers.ZeroAddress,
                ])
            ).to.be.revertedWith("VaultTrader: invalid router address");
        });
    });

    describe("swapVolatileExactIn", function () {
        it("should perform a stable swap", async function () {
            const { vaultTrader, tokenIn, tokenOut, swapper, aerodromeRouter } = await loadFixture(deployFixture);

            // Mint tokens to the vault
            const mintAmount = ethers.parseUnits("100", 18);
            await tokenIn.mint(vaultTrader.target, mintAmount);
            await tokenOut.mint(aerodromeRouter.target, ethers.parseUnits("200", 18)); // Provide tokenOut to router

            expect(await tokenIn.balanceOf(vaultTrader.target)).to.equal(mintAmount);
            expect(await tokenOut.balanceOf(aerodromeRouter.target)).to.equal(ethers.parseUnits("200", 18));

            const amountIn = ethers.parseUnits("10", 18);
            const amountOutMin = ethers.parseUnits("5", 18);

            await expect(
                vaultTrader.connect(swapper).swapStableExactIn(tokenIn.target, tokenOut.target, amountIn, amountOutMin)
            )
                .to.emit(vaultTrader, "SwapPerformed")
                .withArgs(
                    swapper.address,
                    tokenIn.target,
                    tokenOut.target,
                    amountIn,
                    ethers.parseUnits("20", 18),
                    true
                );

            expect(await tokenOut.balanceOf(vaultTrader.target)).to.equal(ethers.parseUnits("20", 18));
        });

        it("should revert if amountIn is zero", async function () {
            const { vaultTrader, tokenIn, tokenOut, swapper } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(swapper).swapVolatileExactIn(tokenIn.target, tokenOut.target, 0, ethers.parseUnits("1", 18))
            ).to.be.revertedWith("VaultTrader: amountIn must be greater than 0");
        });

        it("should revert if not called by the swapper", async function () {
            const { vaultTrader, tokenIn, tokenOut, owner } = await loadFixture(deployFixture);

            await expect(
                vaultTrader.connect(owner).swapStableExactIn(tokenIn.target, tokenOut.target, ethers.parseUnits("10", 18), ethers.parseUnits("1", 18))
            ).to.be.revertedWith("VaultTrader: caller is not the swapper");
        });
    });
});
