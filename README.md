
# Loan Verification + Blockchain + AI — User Manual & Deployment Guide

**Project GitHub**: [https://github.com/redwanahmedkhan18/Loan-Verification-Blockchain-AI](https://github.com/redwanahmedkhan18/Loan-Verification-Blockchain-AI) ([GitHub][1])

This guide will take you from zero knowledge to running the full system: frontend, backend, AI microservice, blockchain contracts, MetaMask integration, environment variables, and common fixes.

---

## Table of Contents

1. Prerequisites & Environment Setup
2. Cloning the Repository
3. Project Structure Overview
4. Setting Up Blockchain (Hardhat / Local Node)
5. Deploying Smart Contracts
6. Configuring Backend & AI Services
7. Configuring Frontend
8. Connecting MetaMask & Wallet Setup
9. Running the System (in correct order)
10. Testing Flow (apply for loan, approve, view NFT certificate)
11. Troubleshooting Common Errors
12. Tips, Best Practices & Security Notes

---

## 1. Prerequisites & Environment Setup

Before starting, ensure you have:

* **Node.js** (v16 or newer recommended) and **npm / yarn**
* **Python 3.9+**
* **pip / venv** or similar virtual environment tool
* **Git**
* **Hardhat** (as part of Node packages)
* A wallet extension such as **MetaMask** installed in your browser
* Optionally, **Ganache** (though Hardhat node suffices)

---

## 2. Cloning the Repository

```bash
git clone https://github.com/redwanahmedkhan18/Loan-Verification-Blockchain-AI.git
cd Loan-Verification-Blockchain-AI
```

You should see directories like `backend`, `ai-service` (if separate), `contracts`, `trustedge-frontend`, etc. ([GitHub][1])

---

## 3. Project Structure Overview

A simplified view:

```
Loan-Verification-Blockchain-AI/
├─ backend/
│  ├── app/            # FastAPI app code & routers etc.
│  ├── requirements.txt
│  └── (other backend modules)
├─ ai-service/          # If AI is a separate microservice (sometimes under backend)
│  └── main.py
├─ contracts/            # Hardhat contracts, scripts, artifacts
│  ├── contracts/         # .sol files like LoanManagerV2.sol, LoanNFT.sol
│  ├── scripts/           # deployment scripts, e.g. deploy_local.js
│  ├── hardhat.config.js
│  └── artifacts/ etc.
└─ trustedge-frontend/   # Frontend (Vite + React)  
    ├── package.json
    ├── src/
    └── public/
```

Your structure might differ slightly, but this is the general layout.

---

## 4. Setting Up Blockchain (Hardhat / Local Node)

You need a local Ethereum-compatible network to deploy and test smart contracts.

### 4.1 Install dependencies in `contracts/` folder

```bash
cd contracts
npm install
```

This ensures Hardhat and contract dependencies are installed.

### 4.2 Start local blockchain node

Use Hardhat’s built-in node (preferred):

```bash
npx hardhat node
```

This will launch a local blockchain on `http://127.0.0.1:8545` by default, and print accounts with private keys.

Keep this terminal running.

---

## 5. Deploying Smart Contracts

Once the local node is running:

1. Compile contracts:

   ```bash
   npx hardhat compile
   ```

2. Run your deployment script:

   ```bash
   npx hardhat run scripts/deploy_local.js --network localhost
   ```

   * Make sure your `scripts/deploy_local.js` path is correct (inside `contracts/scripts/`).
   * After deployment, note the printed contract addresses (Loan Manager contract, NFT contract, etc.).

3. Copy the addresses into your backend config or `.env` (as explained below).

---

## 6. Configuring Backend & AI Services

### 6.1 Backend Setup

```bash
cd ../backend
python3 -m venv venv
source venv/bin/activate       # (Linux/macOS)
# venv\Scripts\activate       # (Windows)
pip install -r requirements.txt
```

### 6.2 .env / Configuration Variables

In backend (or a config file), create `.env` (or edit `config.py`) with entries such as:

```
# Example .env entries
BLOCKCHAIN_RPC=http://127.0.0.1:8545
LOAN_CONTRACT_ADDRESS=0xYourLoanManagerAddress
NFT_CONTRACT_ADDRESS=0xYourNFTAddress
PRIVATE_KEY=<your deployer private key>      # For sending transactions
ALGORITHM=HS256
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://127.0.0.1:8001/predict    # if AI is separate
```

Ensure these match your deployment output and local environment.

### 6.3 Running Backend

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

* `app.main:app` means the FastAPI instance in `app/main.py`.
* The backend will expose endpoints like `/api/loans/apply`, `/api/nft/mint`, etc.

### 6.4 AI Service (if separate)

If AI is implemented as a separate microservice:

```bash
cd ../ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt   # if you have a requirements file
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

This exposes an endpoint (e.g. `/predict`) that the backend will call to obtain credit scores.

---

## 7. Configuring Frontend

```bash
cd ../trustedge-frontend
npm install
```

Because this project uses **Vite**, not `create-react-app`, the command to run is:

```bash
npm run dev
```

This launches the frontend on a port (often `5173`) and opens the UI.

### 7.1 Setting the API base URLs

In your frontend code or `.env`:

```
VITE_API_URL=http://127.0.0.1:8000/api
VITE_BLOCKCHAIN_RPC=http://127.0.0.1:8545
```

Make sure the frontend HTTP calls (for loan apply, approve, NFT, etc.) target your backend, and wallet/blockchain calls point to your local node.

---

## 8. Connecting MetaMask & Wallet Setup

To interact with the blockchain via the frontend (e.g. approving a loan, minting NFT), the user must connect their wallet (e.g. MetaMask).

### Steps:

1. In MetaMask, add a custom network:

   * Network name: **Localhost 8545**
   * RPC URL: `http://127.0.0.1:8545`
   * Chain ID: `31337` (default Hardhat)
   * Currency symbol: ETH

2. Import one of the accounts that Hardhat prints (private key) into MetaMask.

3. Ensure MetaMask is connected to that network and account when interacting with frontend.

4. Approve wallet connection when prompted by the frontend UI.

---

## 9. Running the System (Order of Steps)

Here is the recommended startup order:

1. Start Hardhat node (blockchain)
2. Deploy smart contracts
3. Start AI service (if separate)
4. Start backend
5. Start frontend
6. In browser, open the frontend URL and connect MetaMask
7. Now you can: register users, apply for loans, have banker approve, mint NFT certificates

---

## 10. Testing Flow & Demo

**Typical user journey**:

1. **Register** as a “Customer” on frontend
2. **Login** → apply for loan with details
3. Backend calls AI service → returns credit score
4. **Banker / staff user** logs in → sees pending loan
5. Approves or rejects → backend calls smart contract (via blockchain RPC)
6. If approved → an NFT is minted, and certificate shown
7. Customer views NFT, blockchain history, and loan record

---

## 11. Troubleshooting Common Errors

| Error                                                    | Possible Cause                               | Fix                                                                                            |
| -------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| “Cannot import module main” when running backend         | Uvicorn route is wrong                       | Use `uvicorn app.main:app` if your `main.py` is under `app/` folder                            |
| “No module named scripts/deploy_local.js” in Hardhat run | Wrong script path                            | Ensure script is in `contracts/scripts/` and run `npx hardhat run scripts/deploy_local.js`     |
| Frontend `npm run start` error: Missing script           | It’s a Vite project                          | Use `npm run dev` for Vite                                                                     |
| MetaMask error “Cannot connect”                          | Blockchain node not running or wrong network | Ensure Hardhat node is running and MetaMask is set to RPC 127.0.0.1:8545 with correct chain ID |
| AI service unreachable                                   | Wrong URL or not started                     | Check `AI_SERVICE_URL` in backend config, start AI service before backend                      |

---

## 12. Tips, Best Practices & Security Notes

* Never commit your **private key** or JWT secret to GitHub — use `.env` or environment variables.
* Use **HTTPS** and CORS policies in real deployment.
* Use **Gas optimization** in smart contracts to reduce cost.
* For production, use **permissioned blockchain** or layer-2 chains.
* Apply **rate limiting, logging, and monitoring** for backend and AI.

---

### Conclusion

This guide walks you step-by-step from 0 to fully deploying the Loan Verification + Blockchain + AI system including MetaMask, environment setup, and troubleshooting. Share this with your client so they can run it without prior knowledge.


[1]: https://github.com/redwanahmedkhan18/Loan-Verification-Blockchain-AI "GitHub - redwanahmedkhan18/Loan-Verification-Blockchain-AI"
