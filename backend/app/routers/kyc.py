# app/routers/kyc.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..security import get_db, require_role, get_current_user
from ..models import Document

router = APIRouter()

@router.post("/documents", dependencies=[Depends(require_role("borrower","officer","admin"))])
def upload_document(doc_type: str, file: UploadFile = File(...), db: Session = Depends(get_db), user = Depends(get_current_user)):
    # Demo: only metadata for now
    _ = file.file.read(128)
    doc = Document(user_id=user.id, doc_type=doc_type, filename=file.filename)
    db.add(doc); db.commit(); db.refresh(doc)
    return {"id": doc.id, "status": doc.status, "filename": doc.filename}

@router.post("/documents/{doc_id}/verify", dependencies=[Depends(require_role("officer","admin"))])
def verify_document(doc_id: int, status: str, db: Session = Depends(get_db)):
    doc = db.query(Document).get(doc_id)
    if not doc: raise HTTPException(404, "Not found")
    doc.status = status; db.commit()
    return {"id": doc.id, "status": doc.status}
