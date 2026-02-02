from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta
from decimal import Decimal
from app.db.database import get_db
from app.models import Invoice, Sale, Station, FuelType, User
from app.schemas import DashboardResponse, KPIData, ChartData, StationSalesData, SalesTrendData, FuelTypeData
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    station_id: Optional[int] = Query(None),
    days: int = Query(30, ge=7, le=365),
    start_date: Optional[date] = Query(None, description="Custom start date (overrides days)"),
    end_date: Optional[date] = Query(None, description="Custom end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard data with KPIs and charts"""
    today = date.today()

    # Use custom date range if provided, otherwise use days parameter
    if start_date and end_date:
        period_start = start_date
        period_end = end_date
    else:
        period_start = today - timedelta(days=days)
        period_end = today

    start_of_month = today.replace(day=1)

    # Get station IDs for this organization
    stations_query = db.query(Station).filter(
        Station.organization_id == current_user.organization_id
    )
    if station_id:
        stations_query = stations_query.filter(Station.id == station_id)

    stations = stations_query.all()
    station_ids = [s.id for s in stations]

    if not station_ids:
        # Return empty dashboard
        return DashboardResponse(
            kpis=KPIData(
                total_sales_today=Decimal("0"),
                total_sales_this_month=Decimal("0"),
                total_fuel_purchased_this_month=Decimal("0"),
                total_fuel_sold_this_month=Decimal("0"),
                total_purchase_cost_this_month=Decimal("0"),
                profit_this_month=Decimal("0"),
                station_count=0
            ),
            charts=ChartData(
                station_comparison=[],
                sales_trend=[],
                fuel_breakdown=[]
            )
        )

    # === KPIs ===

    # Total sales today
    sales_today = db.query(func.coalesce(func.sum(Sale.total_sales), 0)).filter(
        Sale.station_id.in_(station_ids),
        Sale.sale_date == today
    ).scalar()

    # Total sales this month
    sales_this_month = db.query(func.coalesce(func.sum(Sale.total_sales), 0)).filter(
        Sale.station_id.in_(station_ids),
        Sale.sale_date >= start_of_month
    ).scalar()

    # Total fuel purchased this month (liters)
    fuel_purchased_month = db.query(func.coalesce(func.sum(Invoice.quantity), 0)).filter(
        Invoice.station_id.in_(station_ids),
        Invoice.invoice_date >= start_of_month
    ).scalar()

    # Total fuel sold this month (liters)
    fuel_sold_month = db.query(func.coalesce(func.sum(Sale.quantity_sold), 0)).filter(
        Sale.station_id.in_(station_ids),
        Sale.sale_date >= start_of_month
    ).scalar()

    # Total purchase cost this month
    purchase_cost_month = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
        Invoice.station_id.in_(station_ids),
        Invoice.invoice_date >= start_of_month
    ).scalar()

    # Profit this month (sales - purchase cost)
    profit_month = Decimal(str(sales_this_month)) - Decimal(str(purchase_cost_month))

    kpis = KPIData(
        total_sales_today=Decimal(str(sales_today)),
        total_sales_this_month=Decimal(str(sales_this_month)),
        total_fuel_purchased_this_month=Decimal(str(fuel_purchased_month)),
        total_fuel_sold_this_month=Decimal(str(fuel_sold_month)),
        total_purchase_cost_this_month=Decimal(str(purchase_cost_month)),
        profit_this_month=profit_month,
        station_count=len(stations)
    )

    # === Charts ===

    # Station comparison (total sales per station this month)
    station_comparison = []
    for station in stations:
        station_sales = db.query(
            func.coalesce(func.sum(Sale.total_sales), 0),
            func.coalesce(func.sum(Sale.quantity_sold), 0)
        ).filter(
            Sale.station_id == station.id,
            Sale.sale_date >= start_of_month
        ).first()

        station_comparison.append(StationSalesData(
            station_id=station.id,
            station_name=station.name,
            total_sales=Decimal(str(station_sales[0])),
            total_quantity=Decimal(str(station_sales[1]))
        ))

    # Sales trend (daily sales for the period)
    sales_trend = []
    current_date = period_start
    while current_date <= period_end:
        day_sales = db.query(
            func.coalesce(func.sum(Sale.total_sales), 0),
            func.coalesce(func.sum(Sale.quantity_sold), 0)
        ).filter(
            Sale.station_id.in_(station_ids),
            Sale.sale_date == current_date
        ).first()

        sales_trend.append(SalesTrendData(
            date=current_date,
            total_sales=Decimal(str(day_sales[0])),
            total_quantity=Decimal(str(day_sales[1]))
        ))
        current_date += timedelta(days=1)

    # Fuel breakdown (purchased vs sold by fuel type)
    fuel_types = db.query(FuelType).filter(FuelType.is_active == True).all()
    fuel_breakdown = []

    for ft in fuel_types:
        purchased = db.query(func.coalesce(func.sum(Invoice.quantity), 0)).filter(
            Invoice.station_id.in_(station_ids),
            Invoice.fuel_type_id == ft.id,
            Invoice.invoice_date >= start_of_month
        ).scalar()

        sold = db.query(func.coalesce(func.sum(Sale.quantity_sold), 0)).filter(
            Sale.station_id.in_(station_ids),
            Sale.fuel_type_id == ft.id,
            Sale.sale_date >= start_of_month
        ).scalar()

        fuel_breakdown.append(FuelTypeData(
            fuel_type_id=ft.id,
            fuel_type_name=ft.name,
            quantity_purchased=Decimal(str(purchased)),
            quantity_sold=Decimal(str(sold))
        ))

    charts = ChartData(
        station_comparison=station_comparison,
        sales_trend=sales_trend,
        fuel_breakdown=fuel_breakdown
    )

    return DashboardResponse(kpis=kpis, charts=charts)
