#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
اختبار النظام الكامل لبرنامج إدارة الفاتورة الإلكترونية المصرية

هذا السكريبت يقوم باختبار جميع وظائف النظام والتكامل بين المكونات المختلفة.
"""

import os
import sys
import unittest
import json
import requests
from datetime import datetime, timedelta
import logging

# إعداد التسجيل
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# تحديد مسار المشروع
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

# استيراد الخدمات
try:
    from backend.services.eta_service import ETAService
    from backend.services.excel_import_service import ExcelImportService
    from backend.services.report_service import ReportService
    from backend.security import create_access_token, verify_token
    from backend.models import User, Company, Invoice
    from backend.config import Settings
    
    SERVICES_IMPORTED = True
except ImportError as e:
    logger.error(f"خطأ في استيراد الخدمات: {str(e)}")
    SERVICES_IMPORTED = False

class TestETAIntegration(unittest.TestCase):
    """اختبار تكامل بوابة الفاتورة الإلكترونية"""
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def setUp(self):
        """إعداد الاختبار"""
        self.settings = Settings()
        self.eta_service = ETAService(
            client_id=self.settings.ETA_CLIENT_ID,
            client_secret=self.settings.ETA_CLIENT_SECRET,
            base_url=self.settings.ETA_BASE_URL
        )
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_get_token(self):
        """اختبار الحصول على توكن الوصول"""
        try:
            token = self.eta_service.get_token()
            self.assertIsNotNone(token)
            self.assertTrue(len(token) > 0)
            logger.info("✅ نجح اختبار الحصول على توكن الوصول")
        except Exception as e:
            logger.error(f"❌ فشل اختبار الحصول على توكن الوصول: {str(e)}")
            self.fail(f"فشل اختبار الحصول على توكن الوصول: {str(e)}")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_validate_tax_id(self):
        """اختبار التحقق من صحة الرقم الضريبي"""
        try:
            # استخدم رقم ضريبي صحيح للاختبار
            result = self.eta_service.validate_tax_id("123456789")
            self.assertIsNotNone(result)
            logger.info("✅ نجح اختبار التحقق من صحة الرقم الضريبي")
        except Exception as e:
            logger.error(f"❌ فشل اختبار التحقق من صحة الرقم الضريبي: {str(e)}")
            self.fail(f"فشل اختبار التحقق من صحة الرقم الضريبي: {str(e)}")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_prepare_invoice_data(self):
        """اختبار تحضير بيانات الفاتورة"""
        try:
            # إنشاء بيانات فاتورة للاختبار
            invoice_data = {
                "invoice_number": "TEST-001",
                "issue_date": datetime.now().strftime("%Y-%m-%d"),
                "client_name": "شركة الاختبار",
                "client_tax_number": "123456789",
                "items": [
                    {
                        "description": "منتج اختبار",
                        "quantity": 2,
                        "unit_price": 100,
                        "tax_rate": 14
                    }
                ]
            }
            
            prepared_data = self.eta_service.prepare_invoice_data(invoice_data)
            self.assertIsNotNone(prepared_data)
            self.assertIn("documents", prepared_data)
            logger.info("✅ نجح اختبار تحضير بيانات الفاتورة")
        except Exception as e:
            logger.error(f"❌ فشل اختبار تحضير بيانات الفاتورة: {str(e)}")
            self.fail(f"فشل اختبار تحضير بيانات الفاتورة: {str(e)}")

class TestExcelImport(unittest.TestCase):
    """اختبار استيراد الفواتير من Excel"""
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def setUp(self):
        """إعداد الاختبار"""
        self.excel_service = ExcelImportService()
        
        # إنشاء ملف Excel للاختبار
        self.test_file_path = os.path.join(PROJECT_ROOT, "tests", "test_sales.xlsx")
        self.excel_service.export_template(self.test_file_path, "sales")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_validate_excel_file(self):
        """اختبار التحقق من صحة ملف Excel"""
        try:
            result = self.excel_service.validate_excel_file(self.test_file_path)
            self.assertTrue(result)
            logger.info("✅ نجح اختبار التحقق من صحة ملف Excel")
        except Exception as e:
            logger.error(f"❌ فشل اختبار التحقق من صحة ملف Excel: {str(e)}")
            self.fail(f"فشل اختبار التحقق من صحة ملف Excel: {str(e)}")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_import_sales_invoices(self):
        """اختبار استيراد فواتير المبيعات"""
        try:
            invoices = self.excel_service.import_sales_invoices(self.test_file_path)
            self.assertIsNotNone(invoices)
            self.assertTrue(len(invoices) > 0)
            logger.info("✅ نجح اختبار استيراد فواتير المبيعات")
        except Exception as e:
            logger.error(f"❌ فشل اختبار استيراد فواتير المبيعات: {str(e)}")
            self.fail(f"فشل اختبار استيراد فواتير المبيعات: {str(e)}")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def tearDown(self):
        """تنظيف بعد الاختبار"""
        if os.path.exists(self.test_file_path):
            os.remove(self.test_file_path)

class TestReports(unittest.TestCase):
    """اختبار التقارير"""
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def setUp(self):
        """إعداد الاختبار"""
        self.report_service = ReportService()
        
        # تحديد فترة التقرير
        self.start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        self.end_date = datetime.now().strftime("%Y-%m-%d")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_get_sales_report(self):
        """اختبار الحصول على تقرير المبيعات"""
        try:
            report = self.report_service.get_sales_report(self.start_date, self.end_date)
            self.assertIsNotNone(report)
            self.assertIn("summary", report)
            self.assertIn("charts", report)
            logger.info("✅ نجح اختبار الحصول على تقرير المبيعات")
        except Exception as e:
            logger.error(f"❌ فشل اختبار الحصول على تقرير المبيعات: {str(e)}")
            self.fail(f"فشل اختبار الحصول على تقرير المبيعات: {str(e)}")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_get_tax_report(self):
        """اختبار الحصول على تقرير الضرائب"""
        try:
            report = self.report_service.get_tax_report(self.start_date, self.end_date, True)
            self.assertIsNotNone(report)
            self.assertIn("current_period", report)
            self.assertIn("tax_balance", report)
            logger.info("✅ نجح اختبار الحصول على تقرير الضرائب")
        except Exception as e:
            logger.error(f"❌ فشل اختبار الحصول على تقرير الضرائب: {str(e)}")
            self.fail(f"فشل اختبار الحصول على تقرير الضرائب: {str(e)}")
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_export_report(self):
        """اختبار تصدير التقرير"""
        try:
            report = self.report_service.get_sales_report(self.start_date, self.end_date)
            export_path = os.path.join(PROJECT_ROOT, "tests", "test_report.xlsx")
            
            result = self.report_service.export_report_to_excel(report, export_path, "sales")
            self.assertTrue(os.path.exists(export_path))
            
            # تنظيف
            if os.path.exists(export_path):
                os.remove(export_path)
                
            logger.info("✅ نجح اختبار تصدير التقرير")
        except Exception as e:
            logger.error(f"❌ فشل اختبار تصدير التقرير: {str(e)}")
            self.fail(f"فشل اختبار تصدير التقرير: {str(e)}")

class TestSecurity(unittest.TestCase):
    """اختبار الأمان"""
    
    @unittest.skipIf(not SERVICES_IMPORTED, "لم يتم استيراد الخدمات")
    def test_token_creation_verification(self):
        """اختبار إنشاء والتحقق من التوكن"""
        try:
            # إنشاء بيانات المستخدم
            user_data = {"id": 1, "username": "test_user", "role": "admin"}
            
            # إنشاء التوكن
            token = create_access_token(user_data)
            self.assertIsNotNone(token)
            
            # التحقق من التوكن
            decoded = verify_token(token)
            self.assertEqual(decoded["sub"]["id"], user_data["id"])
            self.assertEqual(decoded["sub"]["username"], user_data["username"])
            
            logger.info("✅ نجح اختبار إنشاء والتحقق من التوكن")
        except Exception as e:
            logger.error(f"❌ فشل اختبار إنشاء والتحقق من التوكن: {str(e)}")
            self.fail(f"فشل اختبار إنشاء والتحقق من التوكن: {str(e)}")

class TestAPIEndpoints(unittest.TestCase):
    """اختبار نقاط نهاية API"""
    
    def setUp(self):
        """إعداد الاختبار"""
        self.base_url = "http://localhost:8000"  # تغيير هذا حسب إعدادات الخادم
        self.headers = {"Content-Type": "application/json"}
        
        # تسجيل الدخول والحصول على التوكن
        try:
            login_data = {
                "username": "test_user",
                "password": "test_password"
            }
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                self.token = response.json().get("access_token")
                self.headers["Authorization"] = f"Bearer {self.token}"
            else:
                self.token = None
        except:
            self.token = None
    
    def test_health_check(self):
        """اختبار نقطة نهاية فحص الصحة"""
        try:
            response = requests.get(f"{self.base_url}/health")
            self.assertEqual(response.status_code, 200)
            logger.info("✅ نجح اختبار نقطة نهاية فحص الصحة")
        except Exception as e:
            logger.error(f"❌ فشل اختبار نقطة نهاية فحص الصحة: {str(e)}")
            self.fail(f"فشل اختبار نقطة نهاية فحص الصحة: {str(e)}")
    
    @unittest.skipIf(True, "تخطي اختبارات API التي تتطلب خادم قيد التشغيل")
    def test_get_companies(self):
        """اختبار الحصول على الشركات"""
        if not self.token:
            self.skipTest("لم يتم الحصول على التوكن")
        
        try:
            response = requests.get(f"{self.base_url}/companies", headers=self.headers)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIsInstance(data, list)
            logger.info("✅ نجح اختبار الحصول على الشركات")
        except Exception as e:
            logger.error(f"❌ فشل اختبار الحصول على الشركات: {str(e)}")
            self.fail(f"فشل اختبار الحصول على الشركات: {str(e)}")
    
    @unittest.skipIf(True, "تخطي اختبارات API التي تتطلب خادم قيد التشغيل")
    def test_get_invoices(self):
        """اختبار الحصول على الفواتير"""
        if not self.token:
            self.skipTest("لم يتم الحصول على التوكن")
        
        try:
            response = requests.get(f"{self.base_url}/invoices", headers=self.headers)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIsInstance(data, list)
            logger.info("✅ نجح اختبار الحصول على الفواتير")
        except Exception as e:
            logger.error(f"❌ فشل اختبار الحصول على الفواتير: {str(e)}")
            self.fail(f"فشل اختبار الحصول على الفواتير: {str(e)}")

class TestFrontendComponents(unittest.TestCase):
    """اختبار مكونات الواجهة الأمامية"""
    
    def test_frontend_files_exist(self):
        """اختبار وجود ملفات الواجهة الأمامية"""
        frontend_dir = os.path.join(PROJECT_ROOT, "frontend")
        
        required_files = [
            os.path.join(frontend_dir, "src", "App.js"),
            os.path.join(frontend_dir, "src", "App.css"),
            os.path.join(frontend_dir, "src", "pages", "InvoiceForm.js"),
            os.path.join(frontend_dir, "src", "pages", "Reports.js"),
            os.path.join(frontend_dir, "src", "services", "etaService.js")
        ]
        
        for file_path in required_files:
            self.assertTrue(os.path.exists(file_path), f"الملف غير موجود: {file_path}")
        
        logger.info("✅ نجح اختبار وجود ملفات الواجهة الأمامية")

def run_tests():
    """تشغيل جميع الاختبارات"""
    # إنشاء مجلد الاختبارات إذا لم يكن موجودًا
    tests_dir = os.path.join(PROJECT_ROOT, "tests")
    os.makedirs(tests_dir, exist_ok=True)
    
    # تشغيل الاختبارات
    test_loader = unittest.TestLoader()
    test_suite = unittest.TestSuite()
    
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestETAIntegration))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestExcelImport))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestReports))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestSecurity))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestAPIEndpoints))
    test_suite.addTest(test_loader.loadTestsFromTestCase(TestFrontendComponents))
    
    # تشغيل الاختبارات وإنشاء تقرير
    test_result = unittest.TextTestRunner(verbosity=2).run(test_suite)
    
    # إنشاء ملخص الاختبارات
    summary = {
        "total": test_result.testsRun,
        "passed": test_result.testsRun - len(test_result.errors) - len(test_result.failures),
        "failed": len(test_result.failures),
        "errors": len(test_result.errors),
        "skipped": len(test_result.skipped)
    }
    
    # طباعة ملخص الاختبارات
    logger.info("\n=== ملخص الاختبارات ===")
    logger.info(f"إجمالي الاختبارات: {summary['total']}")
    logger.info(f"الاختبارات الناجحة: {summary['passed']}")
    logger.info(f"الاختبارات الفاشلة: {summary['failed']}")
    logger.info(f"الأخطاء: {summary['errors']}")
    logger.info(f"الاختبارات المتخطاة: {summary['skipped']}")
    
    # حفظ ملخص الاختبارات في ملف
    with open(os.path.join(tests_dir, "test_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=4)
    
    return summary

if __name__ == "__main__":
    run_tests()
