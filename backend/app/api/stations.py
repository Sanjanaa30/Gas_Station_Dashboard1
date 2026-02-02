from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models import Station, User
from app.schemas import StationCreate, StationUpdate, StationResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/stations", tags=["Stations"])


@router.get("", response_model=List[StationResponse])
def get_stations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all stations for the current user's organization"""
    stations = db.query(Station).filter(
        Station.organization_id == current_user.organization_id
    ).order_by(Station.name).all()
    return stations


@router.get("/{station_id}", response_model=StationResponse)
def get_station(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific station"""
    station = db.query(Station).filter(
        Station.id == station_id,
        Station.organization_id == current_user.organization_id
    ).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )
    return station


@router.post("", response_model=StationResponse, status_code=status.HTTP_201_CREATED)
def create_station(
    station_data: StationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new station"""
    station = Station(
        **station_data.model_dump(),
        organization_id=current_user.organization_id
    )
    db.add(station)
    db.commit()
    db.refresh(station)
    return station


@router.put("/{station_id}", response_model=StationResponse)
def update_station(
    station_id: int,
    station_data: StationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a station"""
    station = db.query(Station).filter(
        Station.id == station_id,
        Station.organization_id == current_user.organization_id
    ).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )

    update_data = station_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(station, field, value)

    db.commit()
    db.refresh(station)
    return station


@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_station(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a station"""
    station = db.query(Station).filter(
        Station.id == station_id,
        Station.organization_id == current_user.organization_id
    ).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )

    db.delete(station)
    db.commit()
