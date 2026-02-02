"""
Seed script to populate database with dummy data for demo purposes.
Based on real P & J Fuel Inc invoice format from New Jersey, USA.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, timedelta
from decimal import Decimal
import random
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.models import Organization, User, Station, FuelType, Invoice, Sale
from app.core.security import get_password_hash
from app.core.config import settings


def drop_tables():
    """Drop all database tables"""
    Base.metadata.drop_all(bind=engine)
    print("[OK] All tables dropped")


def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables created")


def seed_fuel_types(db: Session):
    """Seed default fuel types based on P&J Fuel invoice"""
    fuel_types = [
        {"name": "87 OCT. REGULAR UNLEADED", "description": "Regular Unleaded Gasoline 87 Octane", "unit": "gallons"},
        {"name": "93 OCT. PREMIUM UNLEADED", "description": "Premium Unleaded Gasoline 93 Octane", "unit": "gallons"},
        {"name": "ULTRA LOW SULFUR DIESEL", "description": "Ultra Low Sulfur Diesel Fuel", "unit": "gallons"},
    ]

    for ft in fuel_types:
        existing = db.query(FuelType).filter(FuelType.name == ft["name"]).first()
        if not existing:
            db.add(FuelType(**ft))

    db.commit()
    print("[OK] Fuel types seeded (87 Regular, 93 Premium, Diesel)")
    return db.query(FuelType).all()


def seed_demo_organization(db: Session):
    """Create demo organization and user - New Jersey based"""
    # Check if demo org exists
    demo_org = db.query(Organization).filter(Organization.is_demo == True).first()
    if demo_org:
        print("[WARN] Demo organization already exists")
        return demo_org, db.query(User).filter(User.organization_id == demo_org.id).first()

    # Create demo organization - US based
    demo_org = Organization(
        name="Power Gas Stations LLC",
        email=settings.DEMO_EMAIL,
        phone="(732) 555-0100",
        address="210 Main Street, Newark, NJ 07102",
        is_demo=True,
        is_active=True
    )
    db.add(demo_org)
    db.commit()
    db.refresh(demo_org)

    # Create demo user
    demo_user = User(
        email=settings.DEMO_EMAIL,
        hashed_password=get_password_hash(settings.DEMO_PASSWORD),
        full_name="John Mitchell",
        is_active=True,
        organization_id=demo_org.id
    )
    db.add(demo_user)
    db.commit()

    print(f"[OK] Demo organization created (New Jersey, USA)")
    print(f"     Email: {settings.DEMO_EMAIL}")
    print(f"     Password: {settings.DEMO_PASSWORD}")

    return demo_org, demo_user


def seed_stations(db: Session, organization_id: int):
    """Seed demo gas stations - New Jersey locations based on P&J Fuel invoices"""
    stations_data = [
        {
            "name": "Power Gas - Union",
            "location": "2445 Morris Ave",
            "city": "Union",
            "state": "NJ 07083"
        },
        {
            "name": "Manraj Corp",
            "location": "195 21st Ave",
            "city": "Paterson",
            "state": "NJ 07501"
        },
        {
            "name": "Vauxhall Fuel Inc",
            "location": "1865 Vauxhall Rd",
            "city": "Union",
            "state": "NJ 07083"
        },
        {
            "name": "Jot Gas Inc",
            "location": "500 Baldwin Ave",
            "city": "Lodi",
            "state": "NJ 07644"
        },
        {
            "name": "Highway Express",
            "location": "789 Route 22 East",
            "city": "Newark",
            "state": "NJ 07102"
        },
    ]

    existing = db.query(Station).filter(Station.organization_id == organization_id).count()
    if existing > 0:
        print("[WARN] Stations already exist for demo org")
        return db.query(Station).filter(Station.organization_id == organization_id).all()

    stations = []
    for s in stations_data:
        station = Station(organization_id=organization_id, **s)
        db.add(station)
        stations.append(station)

    db.commit()
    for s in stations:
        db.refresh(s)

    print(f"[OK] {len(stations)} demo stations created (New Jersey)")
    return stations


def seed_invoices(db: Session, stations: list, fuel_types: list, days: int = 60):
    """Seed demo invoices based on P&J Fuel invoice format"""
    if len(stations) == 0:
        return

    # Check if invoices exist
    station_ids = [s.id for s in stations]
    existing = db.query(Invoice).filter(Invoice.station_id.in_(station_ids)).count()
    if existing > 0:
        print("[WARN] Invoices already exist for demo stations")
        return

    # Suppliers based on real fuel distributors
    suppliers = [
        "P & J Fuel Inc",
        "Gulf Oil LP",
        "Exxon Mobil",
        "Shell Oil Products",
        "Sunoco LP",
        "CITGO Petroleum"
    ]

    # Terminals based on P&J invoices
    terminals = ["BAYWAY", "LINDEN", "PERTH AMBOY", "NEWARK"]
    carriers = ["HIMAT ENT.", "JERSEY FUEL", "GARDEN STATE TRANSPORT"]

    # Pricing per fuel type (USD per gallon) - based on real invoice prices
    fuel_prices = {
        "87 OCT. REGULAR UNLEADED": {"purchase": Decimal("3.3310"), "variation": Decimal("0.15")},
        "93 OCT. PREMIUM UNLEADED": {"purchase": Decimal("3.9120"), "variation": Decimal("0.20")},
        "ULTRA LOW SULFUR DIESEL": {"purchase": Decimal("4.5965"), "variation": Decimal("0.25")},
    }

    invoices_created = 0
    today = date.today()
    invoice_base = 2071500  # Starting invoice number like P&J format

    for station in stations:
        # Create invoices every 2-3 days per station
        current_date = today - timedelta(days=days)

        while current_date <= today:
            # Each delivery typically has 2-3 fuel types
            num_fuel_types = random.choice([2, 2, 3])  # More likely to have 2 types
            selected_fuels = random.sample(fuel_types, min(num_fuel_types, len(fuel_types)))

            for fuel_type in selected_fuels:
                price_info = fuel_prices.get(
                    fuel_type.name,
                    {"purchase": Decimal("3.50"), "variation": Decimal("0.15")}
                )

                # Price varies slightly day to day
                price = price_info["purchase"] + Decimal(str(
                    random.uniform(-float(price_info["variation"]), float(price_info["variation"]))
                ))
                price = round(price, 4)

                # Quantities based on real invoices (5000-8000 gallons for regular, 1000-2000 for premium/diesel)
                if "REGULAR" in fuel_type.name:
                    quantity = Decimal(str(random.randint(5000, 8000)))
                elif "PREMIUM" in fuel_type.name:
                    quantity = Decimal(str(random.randint(1000, 2000)))
                else:  # Diesel
                    quantity = Decimal(str(random.randint(1000, 2500)))

                total = round(quantity * price, 2)

                invoice = Invoice(
                    invoice_number=str(invoice_base),
                    invoice_date=current_date,
                    supplier_name=random.choice(suppliers),
                    station_id=station.id,
                    fuel_type_id=fuel_type.id,
                    quantity=quantity,
                    price_per_unit=price,
                    total_amount=total,
                    notes=f"Terminal: {random.choice(terminals)}, Carrier: {random.choice(carriers)}"
                )
                db.add(invoice)
                invoices_created += 1
                invoice_base += 1

            # Next delivery in 2-3 days
            current_date += timedelta(days=random.randint(2, 3))

    db.commit()
    print(f"[OK] {invoices_created} demo invoices created (P&J Fuel format)")


def seed_sales(db: Session, stations: list, fuel_types: list, days: int = 60):
    """Seed daily sales for the past N days"""
    if len(stations) == 0:
        return

    # Check if sales exist
    station_ids = [s.id for s in stations]
    existing = db.query(Sale).filter(Sale.station_id.in_(station_ids)).count()
    if existing > 0:
        print("[WARN] Sales already exist for demo stations")
        return

    # Selling prices (retail markup over wholesale)
    fuel_prices = {
        "87 OCT. REGULAR UNLEADED": {"sale": Decimal("3.599"), "variation": Decimal("0.10")},
        "93 OCT. PREMIUM UNLEADED": {"sale": Decimal("4.199"), "variation": Decimal("0.10")},
        "ULTRA LOW SULFUR DIESEL": {"sale": Decimal("4.899"), "variation": Decimal("0.15")},
    }

    sales_created = 0
    today = date.today()

    for station in stations:
        current_date = today - timedelta(days=days)

        while current_date <= today:
            for fuel_type in fuel_types:
                price_info = fuel_prices.get(
                    fuel_type.name,
                    {"sale": Decimal("3.80"), "variation": Decimal("0.10")}
                )
                price = price_info["sale"] + Decimal(str(
                    random.uniform(-float(price_info["variation"]), float(price_info["variation"]))
                ))
                price = round(price, 3)

                # Daily sales volume varies by day of week and fuel type
                is_weekend = current_date.weekday() >= 5

                if "REGULAR" in fuel_type.name:
                    # Regular sells the most
                    base_quantity = random.randint(1500, 2500) if is_weekend else random.randint(1000, 2000)
                elif "PREMIUM" in fuel_type.name:
                    # Premium sells less
                    base_quantity = random.randint(300, 600) if is_weekend else random.randint(200, 500)
                else:  # Diesel
                    # Diesel moderate sales
                    base_quantity = random.randint(400, 800) if is_weekend else random.randint(300, 700)

                quantity = Decimal(str(base_quantity))
                total = round(quantity * price, 2)

                sale = Sale(
                    sale_date=current_date,
                    station_id=station.id,
                    fuel_type_id=fuel_type.id,
                    quantity_sold=quantity,
                    price_per_unit=price,
                    total_sales=total
                )
                db.add(sale)
                sales_created += 1

            current_date += timedelta(days=1)

    db.commit()
    print(f"[OK] {sales_created} demo sales records created")


def reset_demo_data(db: Session):
    """Reset all demo data (for re-running demos)"""
    demo_org = db.query(Organization).filter(Organization.is_demo == True).first()
    if not demo_org:
        print("[WARN] No demo organization found")
        return

    # Get station IDs
    stations = db.query(Station).filter(Station.organization_id == demo_org.id).all()
    station_ids = [s.id for s in stations]

    if station_ids:
        # Delete sales and invoices
        db.query(Sale).filter(Sale.station_id.in_(station_ids)).delete(synchronize_session=False)
        db.query(Invoice).filter(Invoice.station_id.in_(station_ids)).delete(synchronize_session=False)

    db.query(Station).filter(Station.organization_id == demo_org.id).delete(synchronize_session=False)
    db.query(User).filter(User.organization_id == demo_org.id).delete(synchronize_session=False)
    db.query(Organization).filter(Organization.id == demo_org.id).delete(synchronize_session=False)

    # Also delete fuel types to refresh them
    db.query(FuelType).delete(synchronize_session=False)

    db.commit()
    print("[OK] Demo data reset complete")


def run_seed():
    """Main seed function"""
    print("\n=== Starting database seed (US/New Jersey) ===\n")

    db = SessionLocal()
    try:
        # Create tables
        create_tables()

        # Seed fuel types (US style)
        fuel_types = seed_fuel_types(db)

        # Create demo org and user (NJ based)
        demo_org, demo_user = seed_demo_organization(db)

        # Create stations (5 NJ stations)
        stations = seed_stations(db, demo_org.id)

        # Create invoices (60 days of data)
        seed_invoices(db, stations, fuel_types, days=60)

        # Create sales (60 days of data)
        seed_sales(db, stations, fuel_types, days=60)

        print("\n=== Database seeding complete! ===")
        print("\nDemo Account Details:")
        print(f"   Email: {settings.DEMO_EMAIL}")
        print(f"   Password: {settings.DEMO_PASSWORD}")
        print(f"   Business: Power Gas Stations LLC")
        print(f"   Location: New Jersey, USA")
        print(f"   Stations: {len(stations)}")
        print(f"   Currency: USD ($)")
        print(f"   Data: 60 days of invoices and sales\n")

    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Seed database with demo data")
    parser.add_argument("--reset", action="store_true", help="Reset demo data before seeding")
    parser.add_argument("--drop", action="store_true", help="Drop all tables and recreate (use when schema changes)")
    args = parser.parse_args()

    if args.drop:
        drop_tables()

    if args.reset:
        db = SessionLocal()
        reset_demo_data(db)
        db.close()

    run_seed()
