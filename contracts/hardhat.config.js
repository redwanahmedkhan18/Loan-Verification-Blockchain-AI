// hardhat.config.js — Hardhat v3 (ESM)
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";
dotenv.config();

const { SEPOLIA_RPC, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

export default {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  defaultNetwork: "hardhat",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat:   { type: "edr-simulated", chainId: 31337 },
    localhost: { type: "http", url: "http://127.0.0.1:8545", chainId: 31337 },
    ...(SEPOLIA_RPC && PRIVATE_KEY
      ? { sepolia: { type: "http", url: SEPOLIA_RPC, accounts: [PRIVATE_KEY] } }
      : {}),
  },
  etherscan: { apiKey: ETHERSCAN_API_KEY || "" },
  mocha: { timeout: 60_000 },
};
