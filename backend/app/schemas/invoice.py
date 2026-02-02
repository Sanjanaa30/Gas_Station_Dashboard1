from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class InvoiceCreate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: date
    supplier_name: str
    station_id: int
    fuel_type_id: int
    quantity: Decimal
    price_per_unit: Decimal
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    supplier_name: Optional[str] = None
    station_id: Optional[int] = None
    fuel_type_id: Optional[int] = None
    quantity: Optional[Decimal] = None
    price_per_unit: Optional[Decimal] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: Optional[str]
    invoice_date: date
    supplier_name: str
    station_id: int
    station_name: str
    fuel_type_id: int
    fuel_type_name: str
    quantity: Decimal
    price_per_unit: Decimal
    total_amount: Decimal
    notes: Optional[str]
    pdf_file_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
