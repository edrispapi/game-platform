"""
Payment Service API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import crud, schemas, database

router = APIRouter()


def _parse_int(identifier: str, label: str) -> int:
    try:
        return int(identifier)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {label}.") from exc


@router.post("/intents", response_model=schemas.PaymentIntentResponse, status_code=status.HTTP_201_CREATED)
def create_intent(intent: schemas.PaymentIntentCreate, db: Session = Depends(database.get_db)):
    """Create a payment intent."""
    return crud.create_payment_intent(db, intent)


@router.get("/intents/{intent_id}", response_model=schemas.PaymentIntentResponse)
def get_intent(intent_id: str, db: Session = Depends(database.get_db)):
    """Fetch a payment intent."""
    intent = crud.get_payment_intent(db, _parse_int(intent_id, "intent_id"))
    if not intent:
        raise HTTPException(status_code=404, detail="Payment intent not found.")
    return intent


@router.post("/charges", response_model=schemas.PaymentChargeResponse, status_code=status.HTTP_201_CREATED)
def create_charge(charge: schemas.PaymentChargeCreate, db: Session = Depends(database.get_db)):
    """Capture a payment intent and create a charge."""
    try:
        return crud.create_charge(db, charge)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/refunds", response_model=schemas.PaymentRefundResponse, status_code=status.HTTP_201_CREATED)
def create_refund(refund: schemas.PaymentRefundCreate, db: Session = Depends(database.get_db)):
    """Create a payment refund."""
    try:
        return crud.create_refund(db, refund)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
