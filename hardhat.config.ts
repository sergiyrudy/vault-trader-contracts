import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenvConfig from "./config";
import "hardhat-tracer";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  sourcify: {
    enabled: true,
  },
  mocha: {
    timeout: 20000,
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepoliaEth: {
      url: dotenvConfig.config.rpc.sepolia_eth || "",
      accounts: [dotenvConfig.config.private_key || ""],
      chainId: 11155111,
    },
    baseSepolia: {
      url: dotenvConfig.config.rpc.base_sepolia || "",
      accounts: [dotenvConfig.config.private_key || ""],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: dotenvConfig.config.etherscan_api_key || "",
      baseSepolia: dotenvConfig.config.basescan_api_key || "",
    },
  },
};

export default config;
