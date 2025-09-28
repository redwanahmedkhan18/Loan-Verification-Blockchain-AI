from fastapi import APIRouter, HTTPException, Depends
from web3 import Web3
from ..config import settings
import json, os

router = APIRouter()   # <<< ADD THIS LINE

def get_w3():
    return Web3(Web3.HTTPProvider(settings.WEB3_PROVIDER))

def load_abi():
    abi_path = os.path.join(os.path.dirname(__file__), "..", "artifacts", "LoanManager.json")
    if not os.path.exists(abi_path):
        raise HTTPException(status_code=500, detail="ABI not found. Deploy contracts first.")
    with open(abi_path) as f:
        return json.load(f)

@router.get("/status")
def chain_status():
    w3 = get_w3()
    return {"connected": w3.is_connected(), "blockNumber": int(w3.eth.block_number)}

@router.get("/contract")
def contract_info():
    return {"address": settings.CONTRACT_ADDRESS}

# (Optional on-chain mint endpoint, if you added it)
# @router.post("/mint/{application_id}", dependencies=[Depends(require_role("officer","admin"))])
# def mint_onchain(...):
#     ...
