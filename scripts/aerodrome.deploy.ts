import { ethers, upgrades } from "hardhat";
import { config } from "../config";

async function main() {
  const Aerodrome = await ethers.getContractFactory("VaultTraderAerodrome");
  const aerodrome = await upgrades.deployProxy(Aerodrome, [
    config.owner,
    config.swapper,
    config.token.weth_base,
    config.aerodrome,
  ]);

  console.log("Aerodrome deployed to:", aerodrome.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
