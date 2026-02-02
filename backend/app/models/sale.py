from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(Date, nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    fuel_type_id = Column(Integer, ForeignKey("fuel_types.id"), nullable=False)
    quantity_sold = Column(Numeric(12, 2), nullable=False)  # liters/gallons
    price_per_unit = Column(Numeric(10, 2), nullable=False)
    total_sales = Column(Numeric(14, 2), nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    station = relationship("Station", back_populates="sales")
    fuel_type = relationship("FuelType", back_populates="sales")
