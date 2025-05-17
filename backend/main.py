from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import models
import schemas
import database
import security
from services.eta_service import ETAService
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from sqlalchemy import func
from database import get_db, init_db
from config import settings

# Initialize FastAPI app
app = FastAPI(
    title="E-Invoice System",
    description="A complete E-Invoice system with ETA integration",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Add CORS middleware with restricted origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://invoiceportaleta.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Authentication endpoints
@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    user = security.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    refresh_token = security.create_refresh_token(data={"sub": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/token/refresh", response_model=schemas.Token)
async def refresh_access_token(
    token: schemas.TokenRefresh,
    db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = security.get_user(db, username=username)
    if user is None:
        raise credentials_exception
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User management endpoints
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = security.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(security.get_current_active_user)):
    return current_user

# Invoice endpoints with authentication and ETA integration
@app.post("/invoices/", response_model=schemas.Invoice, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice: schemas.InvoiceCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    try:
        if db.query(models.Invoice).filter(models.Invoice.invoice_number == invoice.invoice_number).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice number already exists"
            )
        
        db_invoice = models.Invoice(**invoice.dict(exclude={'items'}), user_id=current_user.id)
        db.add(db_invoice)
        db.flush()
        
        for item in invoice.items:
            db_item = models.InvoiceItem(**item.dict(), invoice_id=db_invoice.id)
            db.add(db_item)
        
        db.commit()
        db.refresh(db_invoice)
        
        # Submit to ETA in background
        background_tasks.add_task(submit_to_eta, db_invoice.id, db)
        
        return db_invoice
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating invoice: {str(e)}"
        )

async def submit_to_eta(invoice_id: int, db: Session):
    """Submit invoice to ETA in background"""
    try:
        invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
        if not invoice:
            return
        
        eta_service = ETAService()
        invoice_data = {
            "client_name": invoice.client_name,
            "client_email": invoice.client_email,
            "client_phone": invoice.client_phone,
            "client_address": invoice.client_address,
            "client_type": invoice.client_type,
            "client_tax_number": invoice.client_tax_number,
            "amount": invoice.amount,
            "tax_amount": invoice.tax_amount,
            "total_amount": invoice.total_amount,
            "activity_code": invoice.activity_code,
            "items": [
                {
                    "description": item.description,
                    "item_code": item.item_code,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total": item.total,
                    "tax_amount": item.tax_amount
                }
                for item in invoice.items
            ]
        }
        
        # Implement retry mechanism
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = eta_service.submit_invoice(invoice_data)
                
                # Update invoice with ETA response
                invoice.eta_submission_id = response.get("submissionId")
                invoice.eta_status = response.get("status", "pending")
                invoice.eta_response = response
                invoice.eta_submission_date = datetime.utcnow()
                
                db.commit()
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                import time
                time.sleep(2 ** attempt)  # exponential backoff
        
    except Exception as e:
        # Log error and update invoice status
        invoice.eta_status = "error"
        invoice.eta_response = {"error": str(e)}
        db.commit()

@app.get("/invoices/", response_model=List[schemas.Invoice])
def read_invoices(
    skip: int = 0,
    limit: int = 10,
    status: Optional[str] = None,
    client_name: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    try:
        query = db.query(models.Invoice).filter(models.Invoice.user_id == current_user.id)
        
        if status:
            query = query.filter(models.Invoice.status == status)
        if client_name:
            query = query.filter(models.Invoice.client_name.ilike(f"%{client_name}%"))
        
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving invoices: {str(e)}"
        )

@app.get("/invoices/{invoice_id}", response_model=schemas.Invoice)
def read_invoice(
    invoice_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    try:
        invoice = db.query(models.Invoice).filter(
            models.Invoice.id == invoice_id,
            models.Invoice.user_id == current_user.id
        ).first()
        if invoice is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving invoice: {str(e)}"
        )

# Rest of the code remains the same...
