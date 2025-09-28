// scripts/deploy_local.js  (ESM, ethers v6)
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ethers, NonceManager, parseEther } from "ethers";

const RPC = process.env.RPC || "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(RPC);

// Hardhat local default keys (override with env if you want)
const ADMIN_PK   = process.env.ADMIN_PK   || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OFFICER_PK = process.env.OFFICER_PK || "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const BORROWER_PK= process.env.BORROWER_PK|| "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

// Wrap wallets with NonceManager so nonces never collide
const adminSigner    = new NonceManager(new ethers.Wallet(ADMIN_PK, provider));
const officerSigner  = new NonceManager(new ethers.Wallet(OFFICER_PK, provider));
const borrowerSigner = new NonceManager(new ethers.Wallet(BORROWER_PK, provider));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadArtifact(name) {
  const candidates = [
    path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`),
    path.join(__dirname, "..", "artifacts", `${name}.sol`, `${name}.json`),
    path.join(__dirname, "..", "artifacts", `${name}.json`),
  ];
  for (const p of candidates) {
    try {
      const j = JSON.parse(await readFile(p, "utf8"));
      return { abi: j.abi, bytecode: j.bytecode };
    } catch {}
  }
  throw new Error(`Artifact not found for ${name}. Did you run: npx hardhat compile ?`);
}

async function main() {
  const net = await provider.getNetwork();
  console.log("=== Local deployment (pure ethers) ===");
  console.log(" RPC     :", RPC);
  console.log(" ChainId :", Number(net.chainId));
  console.log(" Admin   :", await adminSigner.getAddress());
  console.log(" Officer :", await officerSigner.getAddress());
  console.log(" Borrower:", await borrowerSigner.getAddress());

  // Load compiled artifacts (must exist under ./artifacts)
  const Stable      = await loadArtifact("StableMock");
  const LoanNFT     = await loadArtifact("LoanNFT");
  const LoanManager = await loadArtifact("LoanManagerV2");

  // ---- Deploy StableMock
  const stableFactory = new ethers.ContractFactory(Stable.abi, Stable.bytecode, adminSigner);
  const stable = await stableFactory.deploy();
  await stable.waitForDeployment();
  console.log(" StableMock   :", await stable.getAddress());

  // ---- Deploy LoanNFT
  const nftFactory = new ethers.ContractFactory(LoanNFT.abi, LoanNFT.bytecode, adminSigner);
  const loanNFT = await nftFactory.deploy();
  await loanNFT.waitForDeployment();
  console.log(" LoanNFT      :", await loanNFT.getAddress());

  // ---- Deploy LoanManagerV2
  const managerFactory = new ethers.ContractFactory(LoanManager.abi, LoanManager.bytecode, adminSigner);
  const manager = await managerFactory.deploy(
    await stable.getAddress(),
    await loanNFT.getAddress(),
    await adminSigner.getAddress() // DEFAULT_ADMIN_ROLE
  );
  await manager.waitForDeployment();
  console.log(" LoanManagerV2:", await manager.getAddress());

  // ---- Wire up roles and ownership (all awaited, sequential)
  let tx;

  // Give manager ownership of NFT so it can mint
  tx = await loanNFT.transferOwnership(await manager.getAddress());
  await tx.wait();

  // Grant OFFICER & PAUSER to officer
  const OFFICER_ROLE = await manager.OFFICER_ROLE();
  const PAUSER_ROLE  = await manager.PAUSER_ROLE();
  tx = await manager.grantRole(OFFICER_ROLE, await officerSigner.getAddress());
  await tx.wait();
  tx = await manager.grantRole(PAUSER_ROLE, await officerSigner.getAddress());
  await tx.wait();

  // Fund borrower with mock stable (dev only)
  tx = await stable.transfer(await borrowerSigner.getAddress(), parseEther(process.env.FUND_BORROWER_ETH || "20000"));
  await tx.wait();

  // Mint a demo loan as officer
  const principal = parseEther(process.env.PRINCIPAL_ETH || "5000");
  const aprBps    = Number(process.env.APR_BPS || 1200);           // 12% APR
  const months    = Number(process.env.DURATION_MONTHS || 12);
  const metaURI   = process.env.META_URI || "ipfs://loan-meta-v2";

  const mOfficer = manager.connect(officerSigner);
  tx = await mOfficer.mintLoan(await borrowerSigner.getAddress(), principal, aprBps, months, metaURI);
  const receipt = await tx.wait();
  console.log(" Mint tx hash:", receipt?.hash);

  console.log("\n✅ Done.\nENV hints:");
  console.log("  WEB3_PROVIDER=http://127.0.0.1:8545");
  console.log(`  CONTRACT_ADDRESS=${await manager.getAddress()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
