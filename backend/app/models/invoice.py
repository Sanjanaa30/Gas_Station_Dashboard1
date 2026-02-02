from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), nullable=True)
    invoice_date = Column(Date, nullable=False)
    supplier_name = Column(String(255), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    fuel_type_id = Column(Integer, ForeignKey("fuel_types.id"), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)  # liters/gallons
    price_per_unit = Column(Numeric(10, 4), nullable=False)  # 4 decimals for precision
    total_amount = Column(Numeric(14, 2), nullable=False)
    notes = Column(String(500), nullable=True)
    pdf_file_path = Column(String(500), nullable=True)  # Path to uploaded PDF
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    station = relationship("Station", back_populates="invoices")
    fuel_type = relationship("FuelType", back_populates="invoices")
