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
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
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
        
        response = eta_service.submit_invoice(invoice_data)
        
        # Update invoice with ETA response
        invoice.eta_submission_id = response.get("submissionId")
        invoice.eta_status = response.get("status", "pending")
        invoice.eta_response = response
        invoice.eta_submission_date = datetime.utcnow()
        
        db.commit()
        
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
    query = db.query(models.Invoice).filter(models.Invoice.user_id == current_user.id)
    
    if status:
        query = query.filter(models.Invoice.status == status)
    if client_name:
        query = query.filter(models.Invoice.client_name.ilike(f"%{client_name}%"))
    
    return query.offset(skip).limit(limit).all()

@app.get("/invoices/{invoice_id}", response_model=schemas.Invoice)
def read_invoice(
    invoice_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
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

@app.get("/invoices/{invoice_id}/eta-status", response_model=schemas.InvoiceETAStatus)
async def get_invoice_eta_status(
    invoice_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.user_id == current_user.id
    ).first()
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if not invoice.eta_submission_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice not submitted to ETA"
        )
    
    try:
        eta_service = ETAService()
        status_response = eta_service.get_invoice_status(invoice.eta_submission_id)
        
        # Update invoice status
        invoice.eta_status = status_response.get("status", invoice.eta_status)
        invoice.eta_response = status_response
        if status_response.get("validationDate"):
            invoice.eta_validation_date = datetime.fromisoformat(status_response["validationDate"])
        db.commit()
        
        return schemas.InvoiceETAStatus(
            submission_id=invoice.eta_submission_id,
            status=invoice.eta_status,
            validation_date=invoice.eta_validation_date,
            response_data=status_response
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting ETA status: {str(e)}"
        )

@app.post("/invoices/{invoice_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_invoice(
    invoice_id: int,
    cancel_request: schemas.InvoiceCancelRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.user_id == current_user.id
    ).first()
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if not invoice.eta_submission_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice not submitted to ETA"
        )
    
    try:
        eta_service = ETAService()
        response = eta_service.cancel_invoice(
            invoice.eta_submission_id,
            cancel_request.reason
        )
        
        # Update invoice status
        invoice.eta_status = "cancelled"
        invoice.eta_cancellation_date = datetime.utcnow()
        invoice.eta_cancellation_reason = cancel_request.reason
        invoice.eta_response = response
        db.commit()
        
        return {"message": "Invoice cancelled successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling invoice: {str(e)}"
        )

# --- Clients CRUD ---
@app.post("/clients/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(database.get_db)):
    db_client = db.query(models.Client).filter(models.Client.email == client.email).first()
    if db_client:
        raise HTTPException(status_code=400, detail="Client already registered")
    db_client = models.Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.get("/clients/", response_model=List[schemas.Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Client).offset(skip).limit(limit).all()

@app.get("/clients/{client_id}", response_model=schemas.Client)
def read_client(client_id: int, db: Session = Depends(database.get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.put("/clients/{client_id}", response_model=schemas.Client)
def update_client(client_id: int, client: schemas.ClientUpdate, db: Session = Depends(database.get_db)):
    db_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    for key, value in client.dict(exclude_unset=True).items():
        setattr(db_client, key, value)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.delete("/clients/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(database.get_db)):
    db_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(db_client)
    db.commit()
    return None

# --- Suppliers CRUD ---
@app.post("/suppliers/", response_model=schemas.Supplier)
def create_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(database.get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.email == supplier.email).first()
    if db_supplier:
        raise HTTPException(status_code=400, detail="Supplier already registered")
    db_supplier = models.Supplier(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@app.get("/suppliers/", response_model=List[schemas.Supplier])
def read_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Supplier).offset(skip).limit(limit).all()

@app.get("/suppliers/{supplier_id}", response_model=schemas.Supplier)
def read_supplier(supplier_id: int, db: Session = Depends(database.get_db)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@app.put("/suppliers/{supplier_id}", response_model=schemas.Supplier)
def update_supplier(supplier_id: int, supplier: schemas.SupplierUpdate, db: Session = Depends(database.get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for key, value in supplier.dict(exclude_unset=True).items():
        setattr(db_supplier, key, value)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@app.delete("/suppliers/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(database.get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(db_supplier)
    db.commit()
    return None

# --- Items CRUD ---
@app.post("/items/", response_model=schemas.Item)
def create_item(item: schemas.ItemCreate, db: Session = Depends(database.get_db)):
    db_item = db.query(models.Item).filter(models.Item.code == item.code).first()
    if db_item:
        raise HTTPException(status_code=400, detail="Item already registered")
    db_item = models.Item(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/items/", response_model=List[schemas.Item])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Item).offset(skip).limit(limit).all()

@app.get("/items/{item_id}", response_model=schemas.Item)
def read_item(item_id: int, db: Session = Depends(database.get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.put("/items/{item_id}", response_model=schemas.Item)
def update_item(item_id: int, item: schemas.ItemUpdate, db: Session = Depends(database.get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(database.get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return None

# --- Taxes CRUD ---
@app.post("/taxes/", response_model=schemas.Tax)
def create_tax(tax: schemas.TaxCreate, db: Session = Depends(database.get_db)):
    db_tax = db.query(models.Tax).filter(models.Tax.name == tax.name).first()
    if db_tax:
        raise HTTPException(status_code=400, detail="Tax already registered")
    db_tax = models.Tax(**tax.dict())
    db.add(db_tax)
    db.commit()
    db.refresh(db_tax)
    return db_tax

@app.get("/taxes/", response_model=List[schemas.Tax])
def read_taxes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Tax).offset(skip).limit(limit).all()

@app.get("/taxes/{tax_id}", response_model=schemas.Tax)
def read_tax(tax_id: int, db: Session = Depends(database.get_db)):
    tax = db.query(models.Tax).filter(models.Tax.id == tax_id).first()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax not found")
    return tax

@app.put("/taxes/{tax_id}", response_model=schemas.Tax)
def update_tax(tax_id: int, tax: schemas.TaxUpdate, db: Session = Depends(database.get_db)):
    db_tax = db.query(models.Tax).filter(models.Tax.id == tax_id).first()
    if not db_tax:
        raise HTTPException(status_code=404, detail="Tax not found")
    for key, value in tax.dict(exclude_unset=True).items():
        setattr(db_tax, key, value)
    db.commit()
    db.refresh(db_tax)
    return db_tax

@app.delete("/taxes/{tax_id}", status_code=204)
def delete_tax(tax_id: int, db: Session = Depends(database.get_db)):
    db_tax = db.query(models.Tax).filter(models.Tax.id == tax_id).first()
    if not db_tax:
        raise HTTPException(status_code=404, detail="Tax not found")
    db.delete(db_tax)
    db.commit()
    return None

# --- Reports Endpoints ---
@app.get("/reports/invoices/", tags=["Reports"])
def report_invoices(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    query = db.query(models.Invoice)
    if start_date:
        query = query.filter(models.Invoice.issue_date >= start_date)
    if end_date:
        query = query.filter(models.Invoice.issue_date <= end_date)
    if status:
        query = query.filter(models.Invoice.status == status)
    if client_id:
        query = query.filter(models.Invoice.client_id == client_id)
    if supplier_id:
        query = query.filter(models.Invoice.supplier_id == supplier_id)
    return query.all()

@app.get("/reports/clients/", tags=["Reports"])
def report_clients(db: Session = Depends(database.get_db)):
    return db.query(models.Client).all()

@app.get("/reports/suppliers/", tags=["Reports"])
def report_suppliers(db: Session = Depends(database.get_db)):
    return db.query(models.Supplier).all()

@app.get("/reports/taxes/", tags=["Reports"])
def report_taxes(db: Session = Depends(database.get_db)):
    return db.query(models.Tax).all()

@app.get("/reports/sales/", tags=["Reports"])
def report_sales(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    query = db.query(models.Invoice).filter(models.Invoice.status == "approved")
    if start_date:
        query = query.filter(models.Invoice.issue_date >= start_date)
    if end_date:
        query = query.filter(models.Invoice.issue_date <= end_date)
    total_sales = query.with_entities(func.sum(models.Invoice.total_amount)).scalar() or 0
    return {"total_sales": total_sales, "count": query.count()}

@app.get("/reports/purchases/", tags=["Reports"])
def report_purchases(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    query = db.query(models.Invoice).filter(models.Invoice.status == "purchased")
    if start_date:
        query = query.filter(models.Invoice.issue_date >= start_date)
    if end_date:
        query = query.filter(models.Invoice.issue_date <= end_date)
    total_purchases = query.with_entities(func.sum(models.Invoice.total_amount)).scalar() or 0
    return {"total_purchases": total_purchases, "count": query.count()}
