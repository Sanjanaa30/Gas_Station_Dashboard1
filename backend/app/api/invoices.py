from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date
import os
import uuid
import csv
import io
from app.db.database import get_db
from app.models import Invoice, Station, FuelType, User
from app.schemas import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# Upload directory for PDFs
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "invoices")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_invoice_response(invoice: Invoice, db: Session) -> InvoiceResponse:
    """Helper to build invoice response with related names"""
    station = db.query(Station).filter(Station.id == invoice.station_id).first()
    fuel_type = db.query(FuelType).filter(FuelType.id == invoice.fuel_type_id).first()

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        invoice_date=invoice.invoice_date,
        supplier_name=invoice.supplier_name,
        station_id=invoice.station_id,
        station_name=station.name if station else "Unknown",
        fuel_type_id=invoice.fuel_type_id,
        fuel_type_name=fuel_type.name if fuel_type else "Unknown",
        quantity=invoice.quantity,
        price_per_unit=invoice.price_per_unit,
        total_amount=invoice.total_amount,
        notes=invoice.notes,
        pdf_file_path=invoice.pdf_file_path,
        created_at=invoice.created_at
    )


@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    station_id: Optional[int] = Query(None),
    fuel_type_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None, description="Search by invoice number or supplier name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all invoices for the current user's organization with optional filters"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    query = db.query(Invoice).filter(Invoice.station_id.in_(org_station_ids))

    if station_id:
        query = query.filter(Invoice.station_id == station_id)
    if fuel_type_id:
        query = query.filter(Invoice.fuel_type_id == fuel_type_id)
    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(search_term),
                Invoice.supplier_name.ilike(search_term)
            )
        )

    invoices = query.order_by(Invoice.invoice_date.desc()).all()

    return [get_invoice_response(inv, db) for inv in invoices]


@router.get("/export/csv")
def export_invoices_csv(
    station_id: Optional[int] = Query(None),
    fuel_type_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export invoices to CSV"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    query = db.query(Invoice).filter(Invoice.station_id.in_(org_station_ids))

    if station_id:
        query = query.filter(Invoice.station_id == station_id)
    if fuel_type_id:
        query = query.filter(Invoice.fuel_type_id == fuel_type_id)
    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    invoices = query.order_by(Invoice.invoice_date.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow([
        "Date", "Invoice #", "Station", "Supplier", "Fuel Type",
        "Quantity (gal)", "Price/Gallon ($)", "Total ($)", "Notes"
    ])

    # Data rows
    for inv in invoices:
        station = db.query(Station).filter(Station.id == inv.station_id).first()
        fuel_type = db.query(FuelType).filter(FuelType.id == inv.fuel_type_id).first()
        writer.writerow([
            inv.invoice_date.strftime("%Y-%m-%d"),
            inv.invoice_number or "",
            station.name if station else "Unknown",
            inv.supplier_name,
            fuel_type.name if fuel_type else "Unknown",
            float(inv.quantity),
            float(inv.price_per_unit),
            float(inv.total_amount),
            inv.notes or ""
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoices.csv"}
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific invoice"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.station_id.in_(org_station_ids)
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    return get_invoice_response(invoice, db)


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice"""
    # Verify station belongs to organization
    station = db.query(Station).filter(
        Station.id == invoice_data.station_id,
        Station.organization_id == current_user.organization_id
    ).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid station"
        )

    # Calculate total
    total_amount = invoice_data.quantity * invoice_data.price_per_unit

    invoice = Invoice(
        **invoice_data.model_dump(),
        total_amount=total_amount
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return get_invoice_response(invoice, db)


@router.post("/{invoice_id}/upload-pdf", response_model=InvoiceResponse)
async def upload_invoice_pdf(
    invoice_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a PDF for an invoice"""
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.station_id.in_(org_station_ids)
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Delete old file if exists
    if invoice.pdf_file_path and os.path.exists(invoice.pdf_file_path):
        os.remove(invoice.pdf_file_path)

    # Save new file
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{invoice_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update invoice with file path
    invoice.pdf_file_path = file_path
    db.commit()
    db.refresh(invoice)

    return get_invoice_response(invoice, db)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an invoice"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.station_id.in_(org_station_ids)
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    update_data = invoice_data.model_dump(exclude_unset=True)

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
        setattr(invoice, field, value)

    # Recalculate total if quantity or price changed
    invoice.total_amount = invoice.quantity * invoice.price_per_unit

    db.commit()
    db.refresh(invoice)

    return get_invoice_response(invoice, db)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice"""
    # Get station IDs for this organization
    org_stations = db.query(Station.id).filter(
        Station.organization_id == current_user.organization_id
    ).all()
    org_station_ids = [s.id for s in org_stations]

    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.station_id.in_(org_station_ids)
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Delete PDF file if exists
    if invoice.pdf_file_path and os.path.exists(invoice.pdf_file_path):
        os.remove(invoice.pdf_file_path)

    db.delete(invoice)
    db.commit()
