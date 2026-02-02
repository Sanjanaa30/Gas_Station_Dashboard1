from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from decimal import Decimal
import csv
import io
from app.db.database import get_db
from app.models import Sale, Station, FuelType, Invoice, User
from app.schemas import SaleCreate, SaleUpdate, SaleResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/sales", tags=["Sales"])


def get_average_cost_price(db: Session, station_id: int, fuel_type_id: int, sale_date: date) -> Optional[Decimal]:
    """Get the average cost price per gallon from recent invoices"""
    # Get invoices for this station and fuel type up to the sale date
    avg_price = db.query(func.avg(Invoice.price_per_unit)).filter(
        Invoice.station_id == station_id,
        Invoice.fuel_type_id == fuel_type_id,
        Invoice.invoice_date <= sale_date
    ).scalar()

    return Decimal(str(avg_price)) if avg_price else None


def get_sale_response(sale: Sale, db: Session) -> SaleResponse:
    """Helper to build sale response with related names and profit calculations"""
    station = db.query(Station).filter(Station.id == sale.station_id).first()
    fuel_type = db.query(FuelType).filter(FuelType.id == sale.fuel_type_id).first()

    # Calculate profit margin
    cost_price = get_average_cost_price(db, sale.station_id, sale.fuel_type_id, sale.sale_date)
    profit_margin = None
    total_profit = None

    if cost_price:
        profit_margin = sale.price_per_unit - cost_price
        total_profit = profit_margin * sale.quantity_sold

    return SaleResponse(
        id=sale.id,
        sale_date=sale.sale_date,
        station_id=sale.station_id,
        station_name=station.name if station else "Unknown",
        fuel_type_id=sale.fuel_type_id,
        fuel_type_name=fuel_type.name if fuel_type else "Unknown",
        quantity_sold=sale.quantity_sold,
        price_per_unit=sale.price_per_unit,
        total_sales=sale.total_sales,
        cost_price=cost_price,
        profit_margin=profit_margin,
        total_profit=total_profit,
        notes=sale.notes,
        created_at=sale.created_at
    )


@router.get("", response_model=List[SaleResponse])
def get_sales(
    station_id: Optional[int] = Query(None),
    fuel_type_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all sales for the current user's organization with optional filters"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    query = db.query(Sale).filter(Sale.station_id.in_(org_station_ids))

    if station_id:
        query = query.filter(Sale.station_id == station_id)
    if fuel_type_id:
        query = query.filter(Sale.fuel_type_id == fuel_type_id)
    if start_date:
        query = query.filter(Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(Sale.sale_date <= end_date)

    sales = query.order_by(Sale.sale_date.desc()).all()

    return [get_sale_response(sale, db) for sale in sales]


@router.get("/export/csv")
def export_sales_csv(
    station_id: Optional[int] = Query(None),
    fuel_type_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export sales to CSV"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    query = db.query(Sale).filter(Sale.station_id.in_(org_station_ids))

    if station_id:
        query = query.filter(Sale.station_id == station_id)
    if fuel_type_id:
        query = query.filter(Sale.fuel_type_id == fuel_type_id)
    if start_date:
        query = query.filter(Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(Sale.sale_date <= end_date)

    sales = query.order_by(Sale.sale_date.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Date", "Station", "Fuel Type", "Qty Sold (gal)", "Selling Price ($)",
        "Total Sales ($)", "Cost Price ($)", "Profit Margin ($)", "Total Profit ($)", "Notes"
    ])

    # Data rows
    for sale in sales:
        station = db.query(Station).filter(Station.id == sale.station_id).first()
        fuel_type = db.query(FuelType).filter(FuelType.id == sale.fuel_type_id).first()
        cost_price = get_average_cost_price(db, sale.station_id, sale.fuel_type_id, sale.sale_date)
        profit_margin = float(sale.price_per_unit - cost_price) if cost_price else ""
        total_profit = float(profit_margin * sale.quantity_sold) if cost_price else ""

        writer.writerow([
            sale.sale_date.strftime("%Y-%m-%d"),
            station.name if station else "Unknown",
            fuel_type.name if fuel_type else "Unknown",
            float(sale.quantity_sold),
            float(sale.price_per_unit),
            float(sale.total_sales),
            float(cost_price) if cost_price else "",
            profit_margin,
            total_profit,
            sale.notes or ""
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales.csv"}
    )


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific sale"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.station_id.in_(org_station_ids)
    ).first()

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )

    return get_sale_response(sale, db)


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new sale entry"""
    # Verify station belongs to organization
    station = db.query(Station).filter(
        Station.id == sale_data.station_id,
        Station.organization_id == current_user.organization_id
    ).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid station"
        )

    # Calculate total
    total_sales = sale_data.quantity_sold * sale_data.price_per_unit

    sale = Sale(
        **sale_data.model_dump(),
        total_sales=total_sales
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    return get_sale_response(sale, db)


@router.put("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    sale_data: SaleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a sale entry"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.station_id.in_(org_station_ids)
    ).first()

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )

    update_data = sale_data.model_dump(exclude_unset=True)

    # If updating station, verify it belongs to org
    if "station_id" in update_data:
        station = db.query(Station).filter(
            Station.id == update_data["station_id"],
            Station.organization_id == current_user.organization_id
        ).first()
        if not station:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid station"
            )

    for field, value in update_data.items():
        setattr(sale, field, value)

    # Recalculate total if quantity or price changed
    sale.total_sales = sale.quantity_sold * sale.price_per_unit

    db.commit()
    db.refresh(sale)

    return get_sale_response(sale, db)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a sale entry"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.station_id.in_(org_station_ids)
    ).first()

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )

    db.delete(sale)
    db.commit()
