import requests
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from config import settings
import hashlib
import base64
import hmac
import time
from urllib.parse import urljoin

# إعداد التسجيل
logger = logging.getLogger(__name__)

class ETAService:
    """
    خدمة التكامل مع بوابة الفاتورة الإلكترونية المصرية (ETA)
    
    تتيح هذه الخدمة:
    - إرسال الفواتير الإلكترونية
    - الاستعلام عن حالة الفواتير
    - إلغاء الفواتير
    - رفع الفواتير بكميات كبيرة
    - التحقق من صحة الرقم الضريبي
    """
    
    def __init__(self):
        """تهيئة الخدمة باستخدام إعدادات التكوين"""
        self.api_url = settings.ETA_API_URL
        self.client_id = settings.ETA_CLIENT_ID
        self.client_secret = settings.ETA_CLIENT_SECRET
        self.environment = settings.ETA_ENVIRONMENT
        self.access_token = None
        self.token_expiry = None
        self.max_retries = 3
        self.retry_delay = 2  # ثواني
        
        # التحقق من الإعدادات الإلزامية
        self._validate_settings()
    
    def _validate_settings(self) -> None:
        """التحقق من وجود الإعدادات الإلزامية"""
        required_settings = [
            'ETA_API_URL', 'ETA_CLIENT_ID', 'ETA_CLIENT_SECRET', 
            'COMPANY_TAX_NUMBER', 'COMPANY_NAME', 'COMPANY_ADDRESS'
        ]
        
        missing_settings = []
        for setting in required_settings:
            if not hasattr(settings, setting) or not getattr(settings, setting):
                missing_settings.append(setting)
        
        if missing_settings:
            raise ValueError(f"الإعدادات التالية مفقودة أو فارغة: {', '.join(missing_settings)}")

    def _generate_signature(self, message: str) -> str:
        """
        توليد التوقيع الرقمي للرسالة باستخدام HMAC-SHA256
        
        Args:
            message: الرسالة المراد توقيعها (عادة JSON محول إلى سلسلة نصية)
            
        Returns:
            التوقيع الرقمي مشفر بـ Base64
        """
        try:
            key = self.client_secret.encode('utf-8')
            message = message.encode('utf-8')
            signature = hmac.new(key, message, hashlib.sha256)
            return base64.b64encode(signature.digest()).decode('utf-8')
        except Exception as e:
            logger.error(f"خطأ في توليد التوقيع الرقمي: {str(e)}")
            raise

    def _get_access_token(self) -> str:
        """
        الحصول على توكن الوصول من ETA
        
        يتحقق من صلاحية التوكن الحالي ويجدده إذا انتهت صلاحيته
        
        Returns:
            توكن الوصول الصالح
            
        Raises:
            Exception: في حالة فشل الحصول على التوكن
        """
        # التحقق من وجود توكن صالح
        current_time = time.time()
        if self.access_token and self.token_expiry and current_time < self.token_expiry:
            return self.access_token

        url = urljoin(self.api_url, "/connect/token")
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        for attempt in range(self.max_retries):
            try:
                logger.info("جاري الحصول على توكن الوصول من ETA")
                response = requests.post(url, data=data, timeout=30)
                
                if response.status_code == 200:
                    token_data = response.json()
                    self.access_token = token_data["access_token"]
                    # حساب وقت انتهاء الصلاحية (بالثواني)
                    expires_in = token_data.get("expires_in", 3600)  # افتراضي: ساعة واحدة
                    self.token_expiry = current_time + expires_in - 300  # قبل 5 دقائق من الانتهاء الفعلي
                    
                    logger.info("تم الحصول على توكن الوصول بنجاح")
                    return self.access_token
                else:
                    logger.error(f"فشل الحصول على توكن الوصول (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))  # زيادة فترة الانتظار مع كل محاولة
                    else:
                        raise Exception(f"فشل الحصول على توكن الوصول بعد {self.max_retries} محاولات: {response.text}")
            
            except requests.RequestException as e:
                logger.error(f"خطأ في الاتصال أثناء الحصول على توكن الوصول (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                else:
                    raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")

    def _prepare_invoice_data(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        تحضير بيانات الفاتورة حسب معايير ETA
        
        Args:
            invoice_data: بيانات الفاتورة الأصلية
            
        Returns:
            بيانات الفاتورة بالتنسيق المطلوب لـ ETA
        """
        # التحقق من وجود البيانات الإلزامية
        required_fields = ["client_name", "items"]
        for field in required_fields:
            if field not in invoice_data:
                raise ValueError(f"حقل إلزامي مفقود في بيانات الفاتورة: {field}")
        
        # التحقق من وجود عناصر في الفاتورة
        if not invoice_data["items"] or len(invoice_data["items"]) == 0:
            raise ValueError("يجب أن تحتوي الفاتورة على عنصر واحد على الأقل")
        
        # تحضير بنود الفاتورة
        invoice_lines = []
        for item in invoice_data["items"]:
            # التحقق من وجود البيانات الإلزامية للعنصر
            if not all(key in item for key in ["description", "quantity", "unit_price"]):
                raise ValueError("بيانات العنصر غير مكتملة")
            
            # حساب قيم العنصر
            quantity = float(item["quantity"])
            unit_price = float(item["unit_price"])
            sales_total = quantity * unit_price
            
            # حساب الخصم إن وجد
            discount_rate = float(item.get("discount", 0)) / 100
            discount_amount = sales_total * discount_rate
            
            # حساب الصافي بعد الخصم
            net_total = sales_total - discount_amount
            
            # حساب الضريبة
            tax_rate = float(item.get("tax_rate", settings.DEFAULT_TAX_RATE)) / 100
            tax_amount = net_total * tax_rate
            
            # إجمالي العنصر
            item_total = net_total + tax_amount
            
            # إعداد بيانات العنصر
            invoice_line = {
                "description": item["description"],
                "itemType": "EGS",  # سلعة افتراضية، يمكن تغييرها حسب نوع العنصر
                "itemCode": item.get("item_code", ""),
                "unitType": "EA",  # وحدة افتراضية، يمكن تغييرها حسب وحدة القياس
                "quantity": quantity,
                "unitValue": {
                    "currencySold": invoice_data.get("currency", settings.DEFAULT_CURRENCY),
                    "amountEGP": unit_price
                },
                "salesTotal": sales_total,
                "total": item_total,
                "valueDifference": 0,
                "totalTaxableFees": 0,
                "netTotal": net_total,
                "discount": {
                    "rate": discount_rate * 100,
                    "amount": discount_amount
                },
                "taxableItems": [
                    {
                        "taxType": "T1",
                        "amount": tax_amount,
                        "subType": "V001",
                        "rate": tax_rate * 100
                    }
                ]
            }
            
            invoice_lines.append(invoice_line)
        
        # حساب إجماليات الفاتورة
        total_sales = sum(line["salesTotal"] for line in invoice_lines)
        total_discount = sum(line["discount"]["amount"] for line in invoice_lines)
        net_amount = sum(line["netTotal"] for line in invoice_lines)
        total_tax = sum(sum(tax["amount"] for tax in line["taxableItems"]) for line in invoice_lines)
        total_amount = net_amount + total_tax
        
        # إعداد بيانات الفاتورة الكاملة
        return {
            "issuer": {
                "type": "B",
                "id": settings.COMPANY_TAX_NUMBER,
                "name": settings.COMPANY_NAME,
                "address": {
                    "branchID": settings.COMPANY_BRANCH_ID,
                    "country": "EG",
                    "governate": settings.COMPANY_GOVERNATE,
                    "regionCity": settings.COMPANY_CITY,
                    "street": settings.COMPANY_STREET,
                    "buildingNumber": settings.COMPANY_BUILDING_NUMBER
                },
                "phone": settings.COMPANY_PHONE,
                "email": settings.COMPANY_EMAIL
            },
            "receiver": {
                "type": invoice_data.get("client_type", "B"),
                "id": invoice_data.get("client_tax_number", ""),
                "name": invoice_data["client_name"],
                "address": {
                    "country": "EG",
                    "governate": invoice_data.get("client_governate", ""),
                    "regionCity": invoice_data.get("client_city", ""),
                    "street": invoice_data.get("client_street", ""),
                    "buildingNumber": invoice_data.get("client_building_number", "")
                },
                "phone": invoice_data.get("client_phone", ""),
                "email": invoice_data.get("client_email", "")
            },
            "documentType": "I",
            "documentTypeVersion": "1.0",
            "dateTimeIssued": invoice_data.get("issue_date", datetime.utcnow().isoformat()),
            "taxpayerActivityCode": invoice_data.get("activity_code", settings.DEFAULT_ACTIVITY_CODE),
            "internalID": invoice_data.get("invoice_number", ""),
            "invoiceLines": invoice_lines,
            "totalDiscountAmount": total_discount,
            "netAmount": net_amount,
            "taxTotals": [
                {
                    "taxType": "T1",
                    "amount": total_tax
                }
            ],
            "totalAmount": total_amount,
            "extraDiscountAmount": 0,
            "totalItemsDiscountAmount": total_discount
        }

    def submit_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        إرسال الفاتورة إلى ETA
        
        Args:
            invoice_data: بيانات الفاتورة
            
        Returns:
            استجابة ETA متضمنة معرف الإرسال
            
        Raises:
            Exception: في حالة فشل إرسال الفاتورة
        """
        try:
            logger.info(f"جاري إرسال الفاتورة: {invoice_data.get('invoice_number', 'غير معروف')}")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            # تحضير بيانات الفاتورة
            prepared_data = self._prepare_invoice_data(invoice_data)
            
            # توليد التوقيع الرقمي
            signature = self._generate_signature(json.dumps(prepared_data))
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Signature": signature
            }
            
            url = urljoin(self.api_url, "/api/v1/documentsubmissions")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.post(url, json=prepared_data, headers=headers, timeout=60)
                    
                    if response.status_code in [200, 201, 202]:
                        result = response.json()
                        logger.info(f"تم إرسال الفاتورة بنجاح: {result.get('submissionId', 'غير معروف')}")
                        return result
                    else:
                        logger.error(f"فشل إرسال الفاتورة (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل إرسال الفاتورة بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء إرسال الفاتورة (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في إرسال الفاتورة إلى ETA: {str(e)}")
            raise Exception(f"خطأ في إرسال الفاتورة إلى ETA: {str(e)}")

    def get_invoice_status(self, submission_id: str) -> Dict[str, Any]:
        """
        التحقق من حالة الفاتورة
        
        Args:
            submission_id: معرف إرسال الفاتورة
            
        Returns:
            معلومات حالة الفاتورة
            
        Raises:
            Exception: في حالة فشل الاستعلام عن حالة الفاتورة
        """
        try:
            logger.info(f"جاري الاستعلام عن حالة الفاتورة: {submission_id}")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            url = urljoin(self.api_url, f"/api/v1/documentsubmissions/{submission_id}")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(url, headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"تم الاستعلام عن حالة الفاتورة بنجاح: {submission_id}")
                        return result
                    else:
                        logger.error(f"فشل الاستعلام عن حالة الفاتورة (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل الاستعلام عن حالة الفاتورة بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء الاستعلام عن حالة الفاتورة (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في الاستعلام عن حالة الفاتورة: {str(e)}")
            raise Exception(f"خطأ في الاستعلام عن حالة الفاتورة: {str(e)}")

    def cancel_invoice(self, submission_id: str, reason: str) -> Dict[str, Any]:
        """
        إلغاء الفاتورة
        
        Args:
            submission_id: معرف إرسال الفاتورة
            reason: سبب الإلغاء
            
        Returns:
            نتيجة عملية الإلغاء
            
        Raises:
            Exception: في حالة فشل إلغاء الفاتورة
        """
        try:
            logger.info(f"جاري إلغاء الفاتورة: {submission_id}")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            data = {
                "submissionId": submission_id,
                "reason": reason
            }
            
            url = urljoin(self.api_url, "/api/v1/documentsubmissions/cancel")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"تم إلغاء الفاتورة بنجاح: {submission_id}")
                        return result
                    else:
                        logger.error(f"فشل إلغاء الفاتورة (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل إلغاء الفاتورة بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء إلغاء الفاتورة (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في إلغاء الفاتورة: {str(e)}")
            raise Exception(f"خطأ في إلغاء الفاتورة: {str(e)}")

    def bulk_submit_invoices(self, invoices_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        إرسال مجموعة من الفواتير دفعة واحدة
        
        Args:
            invoices_data: قائمة بيانات الفواتير
            
        Returns:
            نتيجة عملية الإرسال الجماعي
            
        Raises:
            Exception: في حالة فشل إرسال الفواتير
        """
        try:
            logger.info(f"جاري إرسال {len(invoices_data)} فاتورة بشكل جماعي")
            
            if not invoices_data:
                raise ValueError("قائمة الفواتير فارغة")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            # تحضير بيانات الفواتير
            prepared_documents = []
            for invoice in invoices_data:
                prepared_documents.append(self._prepare_invoice_data(invoice))
            
            # إعداد بيانات الإرسال الجماعي
            bulk_data = {
                "documents": prepared_documents
            }
            
            # توليد التوقيع الرقمي
            signature = self._generate_signature(json.dumps(bulk_data))
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Signature": signature
            }
            
            url = urljoin(self.api_url, "/api/v1/documentsubmissions/bulk")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.post(url, json=bulk_data, headers=headers, timeout=120)
                    
                    if response.status_code in [200, 201, 202]:
                        result = response.json()
                        logger.info(f"تم إرسال الفواتير بشكل جماعي بنجاح: {len(invoices_data)} فاتورة")
                        return result
                    else:
                        logger.error(f"فشل إرسال الفواتير بشكل جماعي (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل إرسال الفواتير بشكل جماعي بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء إرسال الفواتير بشكل جماعي (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في إرسال الفواتير بشكل جماعي: {str(e)}")
            raise Exception(f"خطأ في إرسال الفواتير بشكل جماعي: {str(e)}")

    def verify_tax_id(self, tax_id: str) -> Dict[str, Any]:
        """
        التحقق من صحة الرقم الضريبي
        
        Args:
            tax_id: الرقم الضريبي المراد التحقق منه
            
        Returns:
            معلومات الرقم الضريبي إذا كان صحيحًا
            
        Raises:
            Exception: في حالة فشل التحقق من الرقم الضريبي
        """
        try:
            logger.info(f"جاري التحقق من الرقم الضريبي: {tax_id}")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            url = urljoin(self.api_url, f"/api/v1/taxpayers/{tax_id}")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(url, headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"تم التحقق من الرقم الضريبي بنجاح: {tax_id}")
                        return result
                    elif response.status_code == 404:
                        logger.warning(f"الرقم الضريبي غير موجود: {tax_id}")
                        return {"valid": False, "message": "الرقم الضريبي غير موجود"}
                    else:
                        logger.error(f"فشل التحقق من الرقم الضريبي (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل التحقق من الرقم الضريبي بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء التحقق من الرقم الضريبي (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في التحقق من الرقم الضريبي: {str(e)}")
            raise Exception(f"خطأ في التحقق من الرقم الضريبي: {str(e)}")

    def get_document_details(self, document_uuid: str) -> Dict[str, Any]:
        """
        الحصول على تفاصيل المستند
        
        Args:
            document_uuid: معرف المستند
            
        Returns:
            تفاصيل المستند
            
        Raises:
            Exception: في حالة فشل الحصول على تفاصيل المستند
        """
        try:
            logger.info(f"جاري الحصول على تفاصيل المستند: {document_uuid}")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            url = urljoin(self.api_url, f"/api/v1/documents/{document_uuid}")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(url, headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"تم الحصول على تفاصيل المستند بنجاح: {document_uuid}")
                        return result
                    else:
                        logger.error(f"فشل الحصول على تفاصيل المستند (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل الحصول على تفاصيل المستند بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء الحصول على تفاصيل المستند (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على تفاصيل المستند: {str(e)}")
            raise Exception(f"خطأ في الحصول على تفاصيل المستند: {str(e)}")

    def get_document_printout(self, document_uuid: str, format_type: str = "pdf") -> bytes:
        """
        الحصول على نسخة مطبوعة من المستند
        
        Args:
            document_uuid: معرف المستند
            format_type: نوع التنسيق (pdf أو html)
            
        Returns:
            محتوى المستند كبيانات ثنائية
            
        Raises:
            Exception: في حالة فشل الحصول على نسخة مطبوعة من المستند
        """
        try:
            logger.info(f"جاري الحصول على نسخة مطبوعة من المستند: {document_uuid}")
            
            if format_type not in ["pdf", "html"]:
                raise ValueError("نوع التنسيق غير صالح. يجب أن يكون 'pdf' أو 'html'")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": f"application/{format_type}"
            }
            
            url = urljoin(self.api_url, f"/api/v1/documents/{document_uuid}/printout")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(url, headers=headers, timeout=60)
                    
                    if response.status_code == 200:
                        logger.info(f"تم الحصول على نسخة مطبوعة من المستند بنجاح: {document_uuid}")
                        return response.content
                    else:
                        logger.error(f"فشل الحصول على نسخة مطبوعة من المستند (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل الحصول على نسخة مطبوعة من المستند بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء الحصول على نسخة مطبوعة من المستند (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على نسخة مطبوعة من المستند: {str(e)}")
            raise Exception(f"خطأ في الحصول على نسخة مطبوعة من المستند: {str(e)}")

    def get_recent_documents(self, page_size: int = 50, page_number: int = 1) -> Dict[str, Any]:
        """
        الحصول على قائمة المستندات الحديثة
        
        Args:
            page_size: حجم الصفحة
            page_number: رقم الصفحة
            
        Returns:
            قائمة المستندات الحديثة
            
        Raises:
            Exception: في حالة فشل الحصول على قائمة المستندات
        """
        try:
            logger.info(f"جاري الحصول على قائمة المستندات الحديثة (الصفحة {page_number})")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            url = urljoin(self.api_url, f"/api/v1/documents/recent?pageSize={page_size}&pageNumber={page_number}")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(url, headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"تم الحصول على قائمة المستندات الحديثة بنجاح (الصفحة {page_number})")
                        return result
                    else:
                        logger.error(f"فشل الحصول على قائمة المستندات الحديثة (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل الحصول على قائمة المستندات الحديثة بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء الحصول على قائمة المستندات الحديثة (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على قائمة المستندات الحديثة: {str(e)}")
            raise Exception(f"خطأ في الحصول على قائمة المستندات الحديثة: {str(e)}")

    def search_documents(self, search_criteria: Dict[str, Any], page_size: int = 50, page_number: int = 1) -> Dict[str, Any]:
        """
        البحث عن المستندات
        
        Args:
            search_criteria: معايير البحث
            page_size: حجم الصفحة
            page_number: رقم الصفحة
            
        Returns:
            نتائج البحث
            
        Raises:
            Exception: في حالة فشل البحث عن المستندات
        """
        try:
            logger.info(f"جاري البحث عن المستندات (الصفحة {page_number})")
            
            # الحصول على توكن الوصول
            access_token = self._get_access_token()
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # إضافة معلومات الصفحة إلى معايير البحث
            search_criteria.update({
                "pageSize": page_size,
                "pageNumber": page_number
            })
            
            url = urljoin(self.api_url, "/api/v1/documents/search")
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.post(url, json=search_criteria, headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info(f"تم البحث عن المستندات بنجاح (الصفحة {page_number})")
                        return result
                    else:
                        logger.error(f"فشل البحث عن المستندات (المحاولة {attempt+1}/{self.max_retries}): {response.status_code} - {response.text}")
                        
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (attempt + 1))
                        else:
                            raise Exception(f"فشل البحث عن المستندات بعد {self.max_retries} محاولات: {response.text}")
                
                except requests.RequestException as e:
                    logger.error(f"خطأ في الاتصال أثناء البحث عن المستندات (المحاولة {attempt+1}/{self.max_retries}): {str(e)}")
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                    else:
                        raise Exception(f"فشل الاتصال بخدمة ETA بعد {self.max_retries} محاولات: {str(e)}")
                
        except Exception as e:
            logger.error(f"خطأ في البحث عن المستندات: {str(e)}")
            raise Exception(f"خطأ في البحث عن المستندات: {str(e)}")
