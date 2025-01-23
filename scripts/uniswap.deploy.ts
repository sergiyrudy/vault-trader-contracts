import { ethers, upgrades } from "hardhat";
import { config } from "../config";

async function main() {
  const VaultTraderUniswap =
    await ethers.getContractFactory("VaultTraderUniswap");

  const vaultTraderUniswap = await upgrades.deployProxy(VaultTraderUniswap, [
    config.owner,
    config.swapper,
    config.token.weth_sepolia,
    config.uniswapV2,
    config.uniswapV3,
  ]);

  console.log("Proxy deployed to:", vaultTraderUniswap.target);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
