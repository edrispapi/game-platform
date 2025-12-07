"""
Purchase Service API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from . import crud, schemas, database

router = APIRouter()


def _parse_int(identifier: str, label: str) -> int:
    try:
        return int(identifier)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {label}.") from exc


@router.post("/", response_model=schemas.PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    purchase: schemas.PurchaseCreate,
    db: Session = Depends(database.get_db)
):
    """Create a new purchase"""
    return crud.create_purchase(db=db, purchase=purchase)

@router.get("/{purchase_id}", response_model=schemas.PurchaseResponse)
def get_purchase(
    purchase_id: str,
    db: Session = Depends(database.get_db)
):
    """Get purchase by ID"""
    purchase = crud.get_purchase(db=db, purchase_id=_parse_int(purchase_id, "purchase_id"))
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@router.get("/user/{user_id}", response_model=List[schemas.PurchaseResponse])
def get_user_purchases(
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get purchases for a user"""
    return crud.get_user_purchases(db=db, user_id=user_id, skip=skip, limit=limit)

@router.patch("/{purchase_id}", response_model=schemas.PurchaseResponse)
def update_purchase(
    purchase_id: str,
    purchase_update: schemas.PurchaseUpdate,
    db: Session = Depends(database.get_db)
):
    """Update purchase"""
    purchase = crud.update_purchase(db=db, purchase_id=_parse_int(purchase_id, "purchase_id"), purchase_update=purchase_update)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase

@router.post("/refunds", response_model=schemas.RefundResponse, status_code=status.HTTP_201_CREATED)
def create_refund(
    refund: schemas.RefundCreate,
    user_id: str,
    db: Session = Depends(database.get_db)
):
    """Create a refund request"""
    try:
        return crud.create_refund(db=db, refund=refund, user_id=user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/refunds/{refund_id}", response_model=schemas.RefundResponse)
def get_refund(
    refund_id: str,
    db: Session = Depends(database.get_db)
):
    """Get refund by ID"""
    refund = crud.get_refund(db=db, refund_id=_parse_int(refund_id, "refund_id"))
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")
    return refund

@router.get("/refunds/user/{user_id}", response_model=List[schemas.RefundResponse])
def get_user_refunds(
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """Get refunds for a user"""
    return crud.get_user_refunds(db=db, user_id=user_id, skip=skip, limit=limit)
