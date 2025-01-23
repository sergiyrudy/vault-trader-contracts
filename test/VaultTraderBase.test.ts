import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { MockERC20, MockWETH, VaultTraderBaseTest } from '../typechain-types';

describe("VaultTraderBase", () => {
    async function deployFixture() {
        const [owner, swapper, other] = await ethers.getSigners();

        // 1. Deploy a Mock WETH
        const MockWETHFactory = await ethers.getContractFactory("MockWETH");
        const weth = (await MockWETHFactory.deploy()) as MockWETH;
        await weth.waitForDeployment();

        // 2. Deploy the Test Implementation
        const VaultTraderBaseTestFactory = await ethers.getContractFactory("VaultTraderBaseTest");
        const vault = (await VaultTraderBaseTestFactory.deploy()) as VaultTraderBaseTest;
        await vault.waitForDeployment();

        // 3. Initialize the contract (valid initialization)
        await vault.testInitializeBase(
            owner.address,
            swapper.address,
            await weth.getAddress()
        );

        return { owner, swapper, other, vault, weth };
    }

    describe("Initialization", () => {
        it("should initialize with valid addresses", async () => {
            const { vault, owner, swapper, weth } = await loadFixture(deployFixture);

            expect(await vault.owner()).to.equal(owner.address);
            expect(await vault.swapper()).to.equal(swapper.address);
            expect(await vault.weth()).to.equal(await weth.getAddress());
        });

        it("should revert if initialized with zero owner", async () => {
            const [owner, swapper] = await ethers.getSigners();
            const MockERC20Factory = await ethers.getContractFactory("MockERC20");
            const weth = await MockERC20Factory.deploy("WETH", "WETH", 18);

            const VaultTraderBaseTestFactory = await ethers.getContractFactory("VaultTraderBaseTest");
            const vault = (await VaultTraderBaseTestFactory.deploy()) as VaultTraderBaseTest;

            await expect(
                vault.testInitializeBase(
                    ethers.ZeroAddress,
                    swapper.address,
                    await weth.getAddress()
                )
            ).to.be.revertedWith("VaultTrader: invalid owner address");
        });

        it("should revert if initialized with zero swapper", async () => {
            const [owner] = await ethers.getSigners();
            const MockERC20Factory = await ethers.getContractFactory("MockERC20");
            const weth = await MockERC20Factory.deploy("WETH", "WETH", 18);

            const VaultTraderBaseTestFactory = await ethers.getContractFactory("VaultTraderBaseTest");
            const vault = (await VaultTraderBaseTestFactory.deploy()) as VaultTraderBaseTest;

            await expect(
                vault.testInitializeBase(
                    owner.address,
                    ethers.ZeroAddress,
                    await weth.getAddress()
                )
            ).to.be.revertedWith("VaultTrader: invalid swapper address");
        });

        it("should revert if initialized with zero WETH", async () => {
            const [owner, swapper] = await ethers.getSigners();
            const VaultTraderBaseTestFactory = await ethers.getContractFactory("VaultTraderBaseTest");
            const vault = (await VaultTraderBaseTestFactory.deploy()) as VaultTraderBaseTest;

            await expect(
                vault.testInitializeBase(
                    owner.address,
                    swapper.address,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("VaultTrader: invalid WETH address");
        });

        it("should revert if re-initialized a second time", async () => {
            const { vault, owner, swapper, weth } = await loadFixture(deployFixture);

            await expect(
                vault.testInitializeBase(owner.address, swapper.address, await weth.getAddress())
            ).to.be.reverted;
        });
    });

    describe("Access Control", () => {
        it("should allow only the owner to call onlyOwner functions", async () => {
            const { vault, other } = await loadFixture(deployFixture);

            await expect(vault.connect(other).testOnlyOwnerFunction()).to.be.revertedWith(
                "VaultTrader: caller is not the owner"
            );
        });

        it("should allow only the swapper to call onlySwapper functions", async () => {
            const { vault, owner, other } = await loadFixture(deployFixture);

            await expect(vault.connect(owner).testOnlySwapperFunction()).to.be.revertedWith(
                "VaultTrader: caller is not the swapper"
            );

            await expect(vault.connect(other).testOnlySwapperFunction()).to.be.revertedWith(
                "VaultTrader: caller is not the swapper"
            );
        });
    });

    describe("Receiving Ether (auto-wrap)", () => {
        it("should automatically wrap Ether into WETH on receiving Ether", async () => {
            const { vault, weth, other } = await loadFixture(deployFixture);

            const depositAmount = ethers.parseEther("1");
            await other.sendTransaction({ to: vault.target, value: depositAmount });

            const vaultWethBal = await weth.balanceOf(vault.target);
            expect(vaultWethBal).to.equal(depositAmount);
        });
    });

    describe("withdrawTokensWithUnwrapIfNecessary", () => {
        it("should revert if not called by owner", async () => {
            const { vault, other, weth } = await loadFixture(deployFixture);
            await expect(
                vault.connect(other).withdrawTokensWithUnwrapIfNecessary(await weth.getAddress())
            ).to.be.revertedWith("VaultTrader: caller is not the owner");
        });

        it("should revert if no tokens to withdraw", async () => {
            const { vault, owner, weth } = await loadFixture(deployFixture);
            await expect(
                vault.connect(owner).withdrawTokensWithUnwrapIfNecessary(await weth.getAddress())
            ).to.be.revertedWith("VaultTrader: no tokens to withdraw");
        });

        it("MockWETH withdraw should transfer Ether correctly", async () => {
            const { weth, other } = await loadFixture(deployFixture);

            const depositAmount = ethers.parseEther("2");

            await weth.connect(other).deposit({ value: depositAmount });

            expect(await weth.balanceOf(other.address)).to.equal(depositAmount);

            await expect(() =>
                weth.connect(other).withdraw(depositAmount)
            ).to.changeEtherBalances([other], [depositAmount]); // Directly validate Ether balance change
        });


        it("should unwrap WETH into Ether and emit EtherWithdrawn event", async () => {
            const { vault, owner, weth } = await loadFixture(deployFixture);
            const depositAmount = ethers.parseEther("2");

            await weth.deposit({ value: depositAmount });
            await weth.transfer(vault.target, depositAmount);

            await ethers.provider.send("hardhat_setBalance", [
                vault.target,
                `0x${depositAmount.toString(16)}`,
            ]);

            await expect(
                vault.connect(owner).withdrawTokensWithUnwrapIfNecessary(await weth.getAddress())
            )
                .to.emit(vault, "EtherWithdrawn")
                .withArgs(depositAmount, owner.address);

            expect(await ethers.provider.getBalance(vault.target)).to.equal(0);
            expect(await ethers.provider.getBalance(owner.address)).to.be.above(0);
        });

        it("should withdraw normal ERC20 tokens and emit TokensWithdrawn", async () => {
            const { vault, owner } = await loadFixture(deployFixture);

            const MockERC20Factory = await ethers.getContractFactory("MockERC20");
            const customToken = (await MockERC20Factory.deploy("CustomToken", "CTK", 18)) as MockERC20;
            await customToken.waitForDeployment();

            await customToken.mint(vault.target, ethers.parseUnits("100", 18));

            const [,, other] = await ethers.getSigners();
            await expect(
                vault.connect(other).withdrawTokensWithUnwrapIfNecessary(await customToken.getAddress())
            ).to.be.revertedWith("VaultTrader: caller is not the owner");

            await expect(
                vault.connect(owner).withdrawTokensWithUnwrapIfNecessary(await customToken.getAddress())
            )
                .to.emit(vault, "TokensWithdrawn")
                .withArgs(
                    await customToken.getAddress(),
                    ethers.parseUnits("100", 18),
                    owner.address
                );

            expect(await customToken.balanceOf(vault.target)).to.equal(0);
            expect(await customToken.balanceOf(owner.address)).to.equal(ethers.parseUnits("100", 18));
        });

        it("should allow only the owner to call onlyOwner functions", async () => {
            const { vault, owner, other } = await loadFixture(deployFixture);
            await expect(vault.connect(owner).testOnlyOwnerFunction()).to.not.be.reverted;

            // Non-owner cannot call the function
            await expect(vault.connect(other).testOnlyOwnerFunction()).to.be.revertedWith("VaultTrader: caller is not the owner");
        });
    });
});
