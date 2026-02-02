from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FuelTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    unit: str = "liters"


class FuelTypeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    unit: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
