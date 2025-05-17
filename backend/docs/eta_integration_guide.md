# دليل تكامل بوابة الفاتورة الإلكترونية المصرية (ETA)

هذا الدليل يشرح كيفية التكامل مع بوابة الفاتورة الإلكترونية المصرية (ETA) باستخدام خدمة `ETAService` المتوفرة في هذا المشروع.

## المتطلبات الأساسية

قبل البدء في استخدام خدمة التكامل، يجب توفير المعلومات التالية:

1. **بيانات الاعتماد للبوابة**:
   - معرف العميل (Client ID)
   - كلمة سر العميل (Client Secret)
   - عنوان URL للبوابة (API URL)

2. **بيانات الشركة**:
   - الرقم الضريبي للشركة
   - اسم الشركة
   - عنوان الشركة (المحافظة، المدينة، الشارع، رقم المبنى)
   - رقم هاتف الشركة
   - البريد الإلكتروني للشركة
   - رمز النشاط الضريبي

## إعداد البيئة

يجب إضافة المعلومات السابقة في ملف `.env` أو في إعدادات التطبيق:

```
ETA_API_URL=https://api.invoicing.eta.gov.eg
ETA_CLIENT_ID=your_client_id
ETA_CLIENT_SECRET=your_client_secret
ETA_ENVIRONMENT=Production

COMPANY_TAX_NUMBER=123456789
COMPANY_NAME=اسم الشركة
COMPANY_BRANCH_ID=0
COMPANY_GOVERNATE=القاهرة
COMPANY_CITY=مدينة نصر
COMPANY_STREET=شارع عباس العقاد
COMPANY_BUILDING_NUMBER=123
COMPANY_PHONE=01234567890
COMPANY_EMAIL=info@example.com
DEFAULT_ACTIVITY_CODE=1234
DEFAULT_TAX_RATE=14
DEFAULT_CURRENCY=EGP
```

## الوظائف المتاحة

### 1. إرسال فاتورة

```python
from services.eta_service import ETAService

eta_service = ETAService()

# بيانات الفاتورة
invoice_data = {
    "invoice_number": "INV-001",
    "client_name": "شركة العميل",
    "client_tax_number": "987654321",
    "client_type": "B",  # B للشركات، P للأفراد
    "client_address": "عنوان العميل",
    "client_governate": "القاهرة",
    "client_city": "مدينة نصر",
    "client_street": "شارع التحرير",
    "client_building_number": "456",
    "client_phone": "01098765432",
    "client_email": "client@example.com",
    "issue_date": "2025-05-17T10:00:00Z",
    "activity_code": "1234",
    "items": [
        {
            "description": "منتج 1",
            "item_code": "SKU001",
            "quantity": 2,
            "unit_price": 100,
            "discount": 0,
            "tax_rate": 14
        },
        {
            "description": "منتج 2",
            "item_code": "SKU002",
            "quantity": 1,
            "unit_price": 200,
            "discount": 10,
            "tax_rate": 14
        }
    ]
}

# إرسال الفاتورة
result = eta_service.submit_invoice(invoice_data)
submission_id = result.get("submissionId")
print(f"تم إرسال الفاتورة بنجاح. معرف الإرسال: {submission_id}")
```

### 2. التحقق من حالة الفاتورة

```python
# التحقق من حالة الفاتورة
status = eta_service.get_invoice_status(submission_id)
print(f"حالة الفاتورة: {status.get('status')}")
```

### 3. إلغاء الفاتورة

```python
# إلغاء الفاتورة
cancel_result = eta_service.cancel_invoice(submission_id, "سبب الإلغاء")
print(f"تم إلغاء الفاتورة بنجاح: {cancel_result}")
```

### 4. إرسال مجموعة من الفواتير دفعة واحدة

```python
# قائمة بيانات الفواتير
invoices_data = [invoice_data1, invoice_data2, invoice_data3]

# إرسال الفواتير بشكل جماعي
bulk_result = eta_service.bulk_submit_invoices(invoices_data)
print(f"تم إرسال {len(invoices_data)} فاتورة بنجاح")
```

### 5. التحقق من صحة الرقم الضريبي

```python
# التحقق من صحة الرقم الضريبي
tax_id_result = eta_service.verify_tax_id("123456789")
if tax_id_result.get("valid", False):
    print(f"الرقم الضريبي صحيح: {tax_id_result}")
else:
    print(f"الرقم الضريبي غير صحيح: {tax_id_result.get('message')}")
```

### 6. الحصول على تفاصيل المستند

```python
# الحصول على تفاصيل المستند
document_details = eta_service.get_document_details(document_uuid)
print(f"تفاصيل المستند: {document_details}")
```

### 7. الحصول على نسخة مطبوعة من المستند

```python
# الحصول على نسخة PDF من المستند
pdf_content = eta_service.get_document_printout(document_uuid, "pdf")

# حفظ الملف
with open("invoice.pdf", "wb") as f:
    f.write(pdf_content)
print("تم حفظ الفاتورة كملف PDF")
```

### 8. البحث عن المستندات

```python
# معايير البحث
search_criteria = {
    "dateFrom": "2025-01-01T00:00:00Z",
    "dateTo": "2025-05-17T23:59:59Z",
    "status": "Valid"
}

# البحث عن المستندات
search_results = eta_service.search_documents(search_criteria)
print(f"تم العثور على {search_results.get('totalCount', 0)} مستند")
```

## التعامل مع الأخطاء

خدمة `ETAService` تتعامل مع الأخطاء بشكل آمن وتوفر رسائل خطأ واضحة. يمكن استخدام بلوك `try-except` للتعامل مع الأخطاء:

```python
try:
    result = eta_service.submit_invoice(invoice_data)
    print(f"تم إرسال الفاتورة بنجاح: {result}")
except Exception as e:
    print(f"حدث خطأ أثناء إرسال الفاتورة: {str(e)}")
```

## ملاحظات هامة

1. **التوقيع الرقمي**: يتم توليد التوقيع الرقمي تلقائيًا باستخدام HMAC-SHA256 وكلمة سر العميل.

2. **تجديد التوكن**: يتم تجديد توكن الوصول تلقائيًا عند انتهاء صلاحيته.

3. **إعادة المحاولة**: في حالة فشل الاتصال، تقوم الخدمة بإعادة المحاولة تلقائيًا حتى 3 مرات.

4. **التسجيل**: يتم تسجيل جميع العمليات والأخطاء لتسهيل تتبع المشكلات.

5. **بيئة الاختبار**: يمكن استخدام بيئة الاختبار عن طريق تغيير `ETA_ENVIRONMENT` إلى `Staging` وتحديث `ETA_API_URL` إلى عنوان بيئة الاختبار.

## المراجع

- [وثائق بوابة الفاتورة الإلكترونية المصرية](https://sdk.invoicing.eta.gov.eg/api/)
- [دليل المطور لبوابة الفاتورة الإلكترونية](https://sdk.invoicing.eta.gov.eg/documents/)
