# Gas Station Dashboard - MVP1

A multi-tenant SaaS dashboard for gas station owners to track invoices, sales, and performance.

## Features

- **Multi-tenant Architecture**: Each gas station owner has isolated data
- **Dashboard**: Real-time KPIs, charts, and station comparisons
- **Station Management**: Add and manage multiple gas stations
- **Invoice Tracking**: Record fuel purchase invoices
- **Sales Tracking**: Daily sales entry per station
- **Demo Mode**: Pre-loaded dummy data for demos

## Tech Stack

- **Backend**: Python + FastAPI
- **Frontend**: Next.js + React + TailwindCSS
- **Database**: PostgreSQL
- **Charts**: Recharts

## Project Structure

```
mvp1/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security
│   │   ├── db/           # Database setup
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── main.py       # FastAPI app
│   ├── scripts/
│   │   └── seed_data.py  # Dummy data seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   ├── contexts/     # Auth context
│   │   └── lib/          # API client, utils
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE gasstation_db;
\q
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run seed script (creates tables + demo data)
python scripts/seed_data.py

# Start backend server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Demo Account

After running the seed script:

- **Email**: demo@gasstation.com
- **Password**: demo123

The demo account comes with:
- 3 pre-loaded gas stations
- 30 days of invoice data
- 30 days of sales data

## Demo Script

1. Open http://localhost:3000
2. Click "View Demo" or use demo credentials
3. Show the dashboard with charts and KPIs
4. Navigate to Stations, Invoices, Sales pages
5. Live demo: Add a new invoice/sale entry
6. Show how dashboard updates in real-time

## Live Demo
- Frontend: https://gas-station-dashboard1-2.onrender.com
- Backend API: https://gas-station-dashboard.onrender.com


## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/stations | List stations |
| POST | /api/stations | Create station |
| GET | /api/invoices | List invoices |
| POST | /api/invoices | Create invoice |
| GET | /api/sales | List sales |
| POST | /api/sales | Create sale |
| GET | /api/dashboard | Get dashboard data |
| GET | /api/fuel-types | List fuel types |

## Reset Demo Data

```bash
cd backend
python scripts/seed_data.py --reset
```

## Next Steps (Post-MVP)

- [ ] PDF invoice upload
- [ ] OCR extraction
- [ ] Stripe payment integration
- [ ] Mobile responsive improvements
- [ ] Export to Excel/PDF
- [ ] Email notifications
- [ ] Admin panel
