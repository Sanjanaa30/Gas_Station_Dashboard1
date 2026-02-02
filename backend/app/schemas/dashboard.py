from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date


class KPIData(BaseModel):
    total_sales_today: Decimal
    total_sales_this_month: Decimal
    total_fuel_purchased_this_month: Decimal
    total_fuel_sold_this_month: Decimal
    total_purchase_cost_this_month: Decimal
    profit_this_month: Decimal
    station_count: int


class StationSalesData(BaseModel):
    station_id: int
    station_name: str
    total_sales: Decimal
    total_quantity: Decimal


class SalesTrendData(BaseModel):
    date: date
    total_sales: Decimal
    total_quantity: Decimal


class FuelTypeData(BaseModel):
    fuel_type_id: int
    fuel_type_name: str
    quantity_purchased: Decimal
    quantity_sold: Decimal


class ChartData(BaseModel):
    station_comparison: List[StationSalesData]
    sales_trend: List[SalesTrendData]
    fuel_breakdown: List[FuelTypeData]


class DashboardResponse(BaseModel):
    kpis: KPIData
    charts: ChartData
