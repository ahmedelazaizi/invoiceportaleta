from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    invoices = relationship("Invoice", back_populates="user")

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    address = Column(String)
    tax_number = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    invoices = relationship("Invoice", back_populates="client")

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    address = Column(String)
    tax_number = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # يمكن ربط المشتريات لاحقاً

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)
    description = Column(String)
    unit_type = Column(String, default="EA")
    price = Column(Float)
    tax_rate = Column(Float, default=0.14)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Tax(Base):
    __tablename__ = "taxes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    rate = Column(Float)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True)
    client_name = Column(String, index=True)
    client_email = Column(String)
    client_phone = Column(String)
    client_address = Column(String)
    client_type = Column(String, default="B")  # B for Business, P for Person
    client_tax_number = Column(String)
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    amount = Column(Float)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float)
    status = Column(String, default="pending")
    payment_method = Column(String)
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    
    # ETA specific fields
    eta_submission_id = Column(String, unique=True, nullable=True)
    eta_status = Column(String, default="pending")
    eta_response = Column(JSON, nullable=True)
    eta_submission_date = Column(DateTime, nullable=True)
    eta_validation_date = Column(DateTime, nullable=True)
    eta_cancellation_date = Column(DateTime, nullable=True)
    eta_cancellation_reason = Column(String, nullable=True)
    activity_code = Column(String)  # كود النشاط الضريبي

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    user = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    description = Column(String)
    item_code = Column(String)  # كود السلعة/الخدمة
    item_type = Column(String, default="EGS")  # EGS for Goods/Services
    unit_type = Column(String, default="EA")  # EA for Each
    quantity = Column(Float)
    unit_price = Column(Float)
    total = Column(Float)
    discount_rate = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.14)  # 14% VAT
    tax_amount = Column(Float)
    
    invoice = relationship("Invoice", back_populates="items")
