from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class InvoiceItemBase(BaseModel):
    description: str
    item_code: Optional[str] = None
    item_type: str = "EGS"
    unit_type: str = "EA"
    quantity: float
    unit_price: float
    total: float
    discount_rate: float = 0.0
    discount_amount: float = 0.0
    tax_rate: float = 0.14
    tax_amount: float

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItem(InvoiceItemBase):
    id: int
    invoice_id: int

    class Config:
        orm_mode = True

class InvoiceBase(BaseModel):
    invoice_number: str
    client_name: str
    client_email: EmailStr
    client_phone: str
    client_address: str
    client_type: str = "B"
    client_tax_number: Optional[str] = None
    issue_date: datetime
    due_date: datetime
    amount: float
    tax_amount: float
    total_amount: float
    status: str
    payment_method: str
    notes: Optional[str] = None
    activity_code: str

class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]

class Invoice(InvoiceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItem]
    user_id: int
    eta_submission_id: Optional[str] = None
    eta_status: str = "pending"
    eta_response: Optional[dict] = None
    eta_submission_date: Optional[datetime] = None
    eta_validation_date: Optional[datetime] = None
    eta_cancellation_date: Optional[datetime] = None
    eta_cancellation_reason: Optional[str] = None

    class Config:
        orm_mode = True

class InvoiceETAStatus(BaseModel):
    submission_id: str
    status: str
    validation_date: Optional[datetime] = None
    error_message: Optional[str] = None
    response_data: Optional[dict] = None

class InvoiceCancelRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=200)

class ClientBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    tax_number: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class SupplierBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    address: str
    tax_number: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class ItemBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    unit_type: str = "EA"
    price: float
    tax_rate: float = 0.14

class ItemCreate(ItemBase):
    pass

class ItemUpdate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class TaxBase(BaseModel):
    name: str
    rate: float
    description: Optional[str] = None

class TaxCreate(TaxBase):
    pass

class TaxUpdate(TaxBase):
    pass

class Tax(TaxBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True
