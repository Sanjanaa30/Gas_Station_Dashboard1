from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models import FuelType
from app.schemas import FuelTypeResponse

router = APIRouter(prefix="/fuel-types", tags=["Fuel Types"])


@router.get("", response_model=List[FuelTypeResponse])
def get_fuel_types(db: Session = Depends(get_db)):
    """Get all fuel types"""
    fuel_types = db.query(FuelType).filter(FuelType.is_active == True).all()
    return fuel_types
