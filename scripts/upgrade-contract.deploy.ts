import { ethers, upgrades } from "hardhat";

async function main() {
  const [proxyAddress, contractName] = [
    process.env.PROXY_ADDRESS,
    process.env.CONTRACT_NAME,
  ];

  if (!proxyAddress || !contractName) {
    console.error(
      "Usage: npx hardhat run scripts/upgrade-contract.deploy.ts",
    );
    process.exit(1);
  }

  console.log(`Upgrading proxy at address: ${proxyAddress}`);
  console.log(`New implementation contract: ${contractName}`);

  const ContractFactory = await ethers.getContractFactory(contractName);
  const upgraded = await upgrades.upgradeProxy(proxyAddress, ContractFactory);

  console.log(`${contractName} upgraded!`);
  console.log("Proxy is still at address:", upgraded.target);

  const newImplementation =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("New Implementation Address:", newImplementation);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
