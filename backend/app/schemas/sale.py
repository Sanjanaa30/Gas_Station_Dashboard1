from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class SaleCreate(BaseModel):
    sale_date: date
    station_id: int
    fuel_type_id: int
    quantity_sold: Decimal
    price_per_unit: Decimal
    notes: Optional[str] = None


class SaleUpdate(BaseModel):
    sale_date: Optional[date] = None
    station_id: Optional[int] = None
    fuel_type_id: Optional[int] = None
    quantity_sold: Optional[Decimal] = None
    price_per_unit: Optional[Decimal] = None
    notes: Optional[str] = None


class SaleResponse(BaseModel):
    id: int
    sale_date: date
    station_id: int
    station_name: str
    fuel_type_id: int
    fuel_type_name: str
    quantity_sold: Decimal
    price_per_unit: Decimal
    total_sales: Decimal
    cost_price: Optional[Decimal] = None  # Average cost per gallon from invoices
    profit_margin: Optional[Decimal] = None  # Selling price - cost price
    total_profit: Optional[Decimal] = None  # profit_margin * quantity_sold
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
