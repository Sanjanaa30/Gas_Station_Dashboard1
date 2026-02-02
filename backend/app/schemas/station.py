from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StationCreate(BaseModel):
    name: str
    location: str
    city: Optional[str] = None
    state: Optional[str] = None


class StationUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: Optional[bool] = None


class StationResponse(BaseModel):
    id: int
    name: str
    location: str
    city: Optional[str]
    state: Optional[str]
    is_active: bool
    organization_id: int
    created_at: datetime

    class Config:
        from_attributes = True
