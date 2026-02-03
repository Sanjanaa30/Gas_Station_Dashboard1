from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine, Base, SessionLocal
from app.api import auth, stations, fuel_types, invoices, sales, dashboard
from app.models import User
from scripts.seed_data import run_seed

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Gas Station Management Dashboard API",
    version="1.0.0"
)

# CORS middleware
cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if settings.FRONTEND_URL:
    cors_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(stations.router, prefix="/api")
app.include_router(fuel_types.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.on_event("startup")
def auto_seed_demo_data():
    if not settings.AUTO_SEED_DEMO:
        return

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.DEMO_EMAIL).first()
    finally:
        db.close()

    if not existing:
        run_seed()


@app.get("/")
def root():
    return {
        "message": "Gas Station Dashboard API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
