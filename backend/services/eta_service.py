import requests
import json
from datetime import datetime
from typing import Dict, Any, Optional
from config import settings
import hashlib
import base64
import hmac

class ETAService:
    def __init__(self):
        self.api_url = settings.ETA_API_URL
        self.client_id = settings.ETA_CLIENT_ID
        self.client_secret = settings.ETA_CLIENT_SECRET
        self.environment = settings.ETA_ENVIRONMENT
        self.access_token = None

    def _generate_signature(self, message: str) -> str:
        """توليد التوقيع الرقمي للرسالة"""
        key = self.client_secret.encode('utf-8')
        message = message.encode('utf-8')
        signature = hmac.new(key, message, hashlib.sha256)
        return base64.b64encode(signature.digest()).decode('utf-8')

    def _get_access_token(self) -> str:
        """الحصول على توكن الوصول"""
        if self.access_token:
            return self.access_token

        url = f"{self.api_url}/connect/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        response = requests.post(url, data=data)
        if response.status_code == 200:
            self.access_token = response.json()["access_token"]
            return self.access_token
        else:
            raise Exception(f"Failed to get access token: {response.text}")

    def _prepare_invoice_data(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """تحضير بيانات الفاتورة حسب معايير ETA"""
        return {
            "issuer": {
                "type": "B",
                "id": settings.COMPANY_TAX_NUMBER,
                "name": settings.COMPANY_NAME,
                "address": settings.COMPANY_ADDRESS,
                "phone": settings.COMPANY_PHONE,
                "email": settings.COMPANY_EMAIL
            },
            "receiver": {
                "type": invoice_data.get("client_type", "B"),
                "id": invoice_data.get("client_tax_number", ""),
                "name": invoice_data["client_name"],
                "address": invoice_data.get("client_address", ""),
                "phone": invoice_data.get("client_phone", ""),
                "email": invoice_data.get("client_email", "")
            },
            "documentType": "I",
            "documentTypeVersion": "1.0",
            "dateTimeIssued": datetime.utcnow().isoformat(),
            "taxpayerActivityCode": invoice_data.get("activity_code", ""),
            "invoiceLines": [
                {
                    "description": item["description"],
                    "itemType": "EGS",
                    "itemCode": item.get("item_code", ""),
                    "unitType": "EA",
                    "quantity": item["quantity"],
                    "unitValue": {
                        "currencySold": settings.DEFAULT_CURRENCY,
                        "amountEGP": item["unit_price"]
                    },
                    "salesTotal": item["quantity"] * item["unit_price"],
                    "total": item["total"],
                    "valueDifference": 0,
                    "totalTaxableFees": 0,
                    "netTotal": item["total"],
                    "itemsDiscount": 0,
                    "discount": {
                        "rate": 0,
                        "amount": 0
                    },
                    "taxableItems": [
                        {
                            "taxType": "T1",
                            "amount": item["total"] * settings.TAX_RATE,
                            "subType": "V001",
                            "rate": settings.TAX_RATE * 100
                        }
                    ]
                }
                for item in invoice_data["items"]
            ],
            "totalDiscountAmount": 0,
            "totalItemsDiscountAmount": 0,
            "netAmount": invoice_data["amount"],
            "taxTotals": [
                {
                    "taxType": "T1",
                    "amount": invoice_data["tax_amount"]
                }
            ],
            "totalAmount": invoice_data["total_amount"],
            "extraDiscountAmount": 0,
            "totalItemsDiscountAmount": 0
        }

    def submit_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال الفاتورة إلى ETA"""
        try:
            access_token = self._get_access_token()
            prepared_data = self._prepare_invoice_data(invoice_data)
            
            # توليد التوقيع الرقمي
            signature = self._generate_signature(json.dumps(prepared_data))
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Signature": signature
            }
            
            url = f"{self.api_url}/api/v1/documentsubmissions"
            response = requests.post(url, json=prepared_data, headers=headers)
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                raise Exception(f"Failed to submit invoice: {response.text}")
                
        except Exception as e:
            raise Exception(f"Error submitting invoice to ETA: {str(e)}")

    def get_invoice_status(self, submission_id: str) -> Dict[str, Any]:
        """التحقق من حالة الفاتورة"""
        try:
            access_token = self._get_access_token()
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.api_url}/api/v1/documentsubmissions/{submission_id}"
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to get invoice status: {response.text}")
                
        except Exception as e:
            raise Exception(f"Error getting invoice status: {str(e)}")

    def cancel_invoice(self, submission_id: str, reason: str) -> Dict[str, Any]:
        """إلغاء الفاتورة"""
        try:
            access_token = self._get_access_token()
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            data = {
                "submissionId": submission_id,
                "reason": reason
            }
            
            url = f"{self.api_url}/api/v1/documentsubmissions/cancel"
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to cancel invoice: {response.text}")
                
        except Exception as e:
            raise Exception(f"Error canceling invoice: {str(e)}") 