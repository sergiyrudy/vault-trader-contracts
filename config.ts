import * as dotenv from "dotenv";
dotenv.config();

export const config = {
    owner: process.env.OWNER_ADDRESS || "",
    swapper: process.env.SWAPPER_ADDRESS || "",
    uniswapV2: process.env.UNISWAP_V2_ROUTER_ADDRESS || "",
    uniswapV3: process.env.UNISWAP_V3_ROUTER_ADDRESS || "",
    aerodrome: process.env.AERODROME_ROUTER_ADDRESS || "",
    rpc: {
        sepolia_eth: process.env.SEPOLIA_ETH_RPC || "",
        base_sepolia: process.env.BASE_SEPOLIA_RPC || "",
    },
    token: {
        weth_sepolia: process.env.SEPOLIA_ETH_WETH || "",
        weth_base: process.env.BASE_SEPOLIA_WETH || "",
    },
    // TODO: DONT HOLD PRIVATE KEYS IN ENV VARIABLES !!! it is only for test purposes! use a vault or a secret manager instead!
    private_key: process.env.PRIVATE_KEY || "",
    etherscan_api_key: process.env.ETHERSCAN_API_KEY || "",
    basescan_api_key: process.env.BASESCAN_API_KEY || "",
};
