import pandas as pd
import logging
import os
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import json

# إعداد التسجيل
logger = logging.getLogger(__name__)

class ExcelImportService:
    """
    خدمة استيراد الفواتير من ملفات Excel
    
    تتيح هذه الخدمة:
    - استيراد فواتير المبيعات من ملفات Excel
    - استيراد فواتير المشتريات من ملفات Excel
    - التحقق من صحة بيانات الفواتير
    """
    
    def __init__(self):
        """تهيئة الخدمة"""
        pass
    
    def validate_excel_file(self, file_path: str) -> bool:
        """
        التحقق من صحة ملف Excel
        
        Args:
            file_path: مسار ملف Excel
            
        Returns:
            True إذا كان الملف صالحًا، False خلاف ذلك
            
        Raises:
            ValueError: إذا كان الملف غير موجود أو غير صالح
        """
        try:
            if not os.path.exists(file_path):
                raise ValueError(f"الملف غير موجود: {file_path}")
            
            # التحقق من امتداد الملف
            _, ext = os.path.splitext(file_path)
            if ext.lower() not in ['.xlsx', '.xls', '.csv']:
                raise ValueError(f"نوع الملف غير مدعوم: {ext}. يجب أن يكون .xlsx أو .xls أو .csv")
            
            # محاولة قراءة الملف
            if ext.lower() == '.csv':
                pd.read_csv(file_path, nrows=1)
            else:
                pd.read_excel(file_path, nrows=1)
            
            return True
        except Exception as e:
            logger.error(f"خطأ في التحقق من صحة ملف Excel: {str(e)}")
            raise ValueError(f"ملف Excel غير صالح: {str(e)}")
    
    def _get_column_mapping(self, file_type: str) -> Dict[str, str]:
        """
        الحصول على تعيين الأعمدة حسب نوع الملف
        
        Args:
            file_type: نوع الملف (sales أو purchases)
            
        Returns:
            قاموس يحتوي على تعيين الأعمدة
        """
        if file_type == 'sales':
            return {
                'invoice_number': ['رقم الفاتورة', 'Invoice Number', 'invoice_number', 'رقم_الفاتورة'],
                'issue_date': ['تاريخ الإصدار', 'Issue Date', 'issue_date', 'تاريخ_الإصدار'],
                'client_name': ['اسم العميل', 'Client Name', 'client_name', 'اسم_العميل'],
                'client_tax_number': ['الرقم الضريبي للعميل', 'Client Tax Number', 'client_tax_number', 'الرقم_الضريبي_للعميل'],
                'client_address': ['عنوان العميل', 'Client Address', 'client_address', 'عنوان_العميل'],
                'item_description': ['وصف المنتج', 'Item Description', 'item_description', 'وصف_المنتج'],
                'item_code': ['كود المنتج', 'Item Code', 'item_code', 'كود_المنتج'],
                'quantity': ['الكمية', 'Quantity', 'quantity', 'الكمية'],
                'unit_price': ['سعر الوحدة', 'Unit Price', 'unit_price', 'سعر_الوحدة'],
                'discount': ['الخصم', 'Discount', 'discount', 'الخصم'],
                'tax_rate': ['نسبة الضريبة', 'Tax Rate', 'tax_rate', 'نسبة_الضريبة'],
                'total': ['الإجمالي', 'Total', 'total', 'الإجمالي']
            }
        elif file_type == 'purchases':
            return {
                'invoice_number': ['رقم الفاتورة', 'Invoice Number', 'invoice_number', 'رقم_الفاتورة'],
                'issue_date': ['تاريخ الإصدار', 'Issue Date', 'issue_date', 'تاريخ_الإصدار'],
                'supplier_name': ['اسم المورد', 'Supplier Name', 'supplier_name', 'اسم_المورد'],
                'supplier_tax_number': ['الرقم الضريبي للمورد', 'Supplier Tax Number', 'supplier_tax_number', 'الرقم_الضريبي_للمورد'],
                'supplier_address': ['عنوان المورد', 'Supplier Address', 'supplier_address', 'عنوان_المورد'],
                'item_description': ['وصف المنتج', 'Item Description', 'item_description', 'وصف_المنتج'],
                'item_code': ['كود المنتج', 'Item Code', 'item_code', 'كود_المنتج'],
                'quantity': ['الكمية', 'Quantity', 'quantity', 'الكمية'],
                'unit_price': ['سعر الوحدة', 'Unit Price', 'unit_price', 'سعر_الوحدة'],
                'discount': ['الخصم', 'Discount', 'discount', 'الخصم'],
                'tax_rate': ['نسبة الضريبة', 'Tax Rate', 'tax_rate', 'نسبة_الضريبة'],
                'total': ['الإجمالي', 'Total', 'total', 'الإجمالي']
            }
        else:
            raise ValueError(f"نوع ملف غير مدعوم: {file_type}")
    
    def _map_columns(self, df: pd.DataFrame, column_mapping: Dict[str, List[str]]) -> Dict[str, str]:
        """
        تعيين أعمدة DataFrame إلى الأسماء المستخدمة في النظام
        
        Args:
            df: DataFrame المراد تعيين أعمدته
            column_mapping: قاموس يحتوي على تعيين الأعمدة
            
        Returns:
            قاموس يحتوي على تعيين الأعمدة الفعلية
        """
        actual_mapping = {}
        
        for target_col, possible_names in column_mapping.items():
            found = False
            for name in possible_names:
                if name in df.columns:
                    actual_mapping[target_col] = name
                    found = True
                    break
            
            if not found:
                logger.warning(f"لم يتم العثور على عمود {target_col} في الملف")
        
        return actual_mapping
    
    def _validate_required_columns(self, actual_mapping: Dict[str, str], file_type: str) -> None:
        """
        التحقق من وجود الأعمدة المطلوبة
        
        Args:
            actual_mapping: قاموس يحتوي على تعيين الأعمدة الفعلية
            file_type: نوع الملف (sales أو purchases)
            
        Raises:
            ValueError: إذا كانت الأعمدة المطلوبة غير موجودة
        """
        if file_type == 'sales':
            required_columns = ['invoice_number', 'client_name', 'item_description', 'quantity', 'unit_price']
        else:  # purchases
            required_columns = ['invoice_number', 'supplier_name', 'item_description', 'quantity', 'unit_price']
        
        missing_columns = [col for col in required_columns if col not in actual_mapping]
        
        if missing_columns:
            raise ValueError(f"الأعمدة المطلوبة التالية غير موجودة في الملف: {', '.join(missing_columns)}")
    
    def _process_date_column(self, df: pd.DataFrame, date_col: str) -> pd.DataFrame:
        """
        معالجة عمود التاريخ
        
        Args:
            df: DataFrame المراد معالجة عمود التاريخ فيه
            date_col: اسم عمود التاريخ
            
        Returns:
            DataFrame بعد معالجة عمود التاريخ
        """
        if date_col in df.columns:
            try:
                # محاولة تحويل عمود التاريخ إلى تنسيق موحد
                df[date_col] = pd.to_datetime(df[date_col]).dt.strftime('%Y-%m-%d')
            except Exception as e:
                logger.warning(f"لم يتم تحويل عمود التاريخ: {str(e)}")
        
        return df
    
    def _group_items_by_invoice(self, df: pd.DataFrame, actual_mapping: Dict[str, str], file_type: str) -> List[Dict[str, Any]]:
        """
        تجميع العناصر حسب الفاتورة
        
        Args:
            df: DataFrame المراد تجميع عناصره
            actual_mapping: قاموس يحتوي على تعيين الأعمدة الفعلية
            file_type: نوع الملف (sales أو purchases)
            
        Returns:
            قائمة بالفواتير، كل فاتورة تحتوي على قائمة بالعناصر
        """
        # تحديد عمود معرف الفاتورة
        invoice_id_col = actual_mapping.get('invoice_number')
        
        if not invoice_id_col:
            raise ValueError("لم يتم العثور على عمود رقم الفاتورة")
        
        # تجميع الصفوف حسب رقم الفاتورة
        invoices = []
        for invoice_number, group in df.groupby(invoice_id_col):
            # إنشاء قاموس للفاتورة
            invoice = {}
            
            # إضافة معلومات الفاتورة
            if file_type == 'sales':
                invoice['invoice_number'] = invoice_number
                
                # إضافة معلومات العميل من أول صف في المجموعة
                first_row = group.iloc[0]
                for field in ['issue_date', 'client_name', 'client_tax_number', 'client_address']:
                    if field in actual_mapping and actual_mapping[field] in first_row:
                        invoice[field] = first_row[actual_mapping[field]]
                
                # إضافة العناصر
                invoice['items'] = []
                for _, row in group.iterrows():
                    item = {}
                    for field in ['item_description', 'item_code', 'quantity', 'unit_price', 'discount', 'tax_rate', 'total']:
                        if field in actual_mapping and actual_mapping[field] in row:
                            item[field] = row[actual_mapping[field]]
                    
                    # التأكد من وجود القيم الرقمية
                    for numeric_field in ['quantity', 'unit_price', 'discount', 'tax_rate']:
                        if numeric_field in item:
                            try:
                                item[numeric_field] = float(item[numeric_field])
                            except (ValueError, TypeError):
                                item[numeric_field] = 0
                    
                    invoice['items'].append(item)
            
            else:  # purchases
                invoice['invoice_number'] = invoice_number
                
                # إضافة معلومات المورد من أول صف في المجموعة
                first_row = group.iloc[0]
                for field in ['issue_date', 'supplier_name', 'supplier_tax_number', 'supplier_address']:
                    if field in actual_mapping and actual_mapping[field] in first_row:
                        invoice[field] = first_row[actual_mapping[field]]
                
                # إضافة العناصر
                invoice['items'] = []
                for _, row in group.iterrows():
                    item = {}
                    for field in ['item_description', 'item_code', 'quantity', 'unit_price', 'discount', 'tax_rate', 'total']:
                        if field in actual_mapping and actual_mapping[field] in row:
                            item[field] = row[actual_mapping[field]]
                    
                    # التأكد من وجود القيم الرقمية
                    for numeric_field in ['quantity', 'unit_price', 'discount', 'tax_rate']:
                        if numeric_field in item:
                            try:
                                item[numeric_field] = float(item[numeric_field])
                            except (ValueError, TypeError):
                                item[numeric_field] = 0
                    
                    invoice['items'].append(item)
            
            invoices.append(invoice)
        
        return invoices
    
    def import_sales_invoices(self, file_path: str) -> List[Dict[str, Any]]:
        """
        استيراد فواتير المبيعات من ملف Excel
        
        Args:
            file_path: مسار ملف Excel
            
        Returns:
            قائمة بفواتير المبيعات
            
        Raises:
            ValueError: إذا كان الملف غير صالح أو البيانات غير مكتملة
        """
        try:
            logger.info(f"جاري استيراد فواتير المبيعات من الملف: {file_path}")
            
            # التحقق من صحة الملف
            self.validate_excel_file(file_path)
            
            # قراءة الملف
            _, ext = os.path.splitext(file_path)
            if ext.lower() == '.csv':
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
            
            # الحصول على تعيين الأعمدة
            column_mapping = self._get_column_mapping('sales')
            actual_mapping = self._map_columns(df, column_mapping)
            
            # التحقق من وجود الأعمدة المطلوبة
            self._validate_required_columns(actual_mapping, 'sales')
            
            # معالجة عمود التاريخ
            if 'issue_date' in actual_mapping:
                df = self._process_date_column(df, actual_mapping['issue_date'])
            
            # تجميع العناصر حسب الفاتورة
            invoices = self._group_items_by_invoice(df, actual_mapping, 'sales')
            
            logger.info(f"تم استيراد {len(invoices)} فاتورة مبيعات بنجاح")
            
            return invoices
        
        except Exception as e:
            logger.error(f"خطأ في استيراد فواتير المبيعات: {str(e)}")
            raise ValueError(f"خطأ في استيراد فواتير المبيعات: {str(e)}")
    
    def import_purchase_invoices(self, file_path: str) -> List[Dict[str, Any]]:
        """
        استيراد فواتير المشتريات من ملف Excel
        
        Args:
            file_path: مسار ملف Excel
            
        Returns:
            قائمة بفواتير المشتريات
            
        Raises:
            ValueError: إذا كان الملف غير صالح أو البيانات غير مكتملة
        """
        try:
            logger.info(f"جاري استيراد فواتير المشتريات من الملف: {file_path}")
            
            # التحقق من صحة الملف
            self.validate_excel_file(file_path)
            
            # قراءة الملف
            _, ext = os.path.splitext(file_path)
            if ext.lower() == '.csv':
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
            
            # الحصول على تعيين الأعمدة
            column_mapping = self._get_column_mapping('purchases')
            actual_mapping = self._map_columns(df, column_mapping)
            
            # التحقق من وجود الأعمدة المطلوبة
            self._validate_required_columns(actual_mapping, 'purchases')
            
            # معالجة عمود التاريخ
            if 'issue_date' in actual_mapping:
                df = self._process_date_column(df, actual_mapping['issue_date'])
            
            # تجميع العناصر حسب الفاتورة
            invoices = self._group_items_by_invoice(df, actual_mapping, 'purchases')
            
            logger.info(f"تم استيراد {len(invoices)} فاتورة مشتريات بنجاح")
            
            return invoices
        
        except Exception as e:
            logger.error(f"خطأ في استيراد فواتير المشتريات: {str(e)}")
            raise ValueError(f"خطأ في استيراد فواتير المشتريات: {str(e)}")
    
    def export_template(self, file_path: str, file_type: str) -> str:
        """
        تصدير قالب Excel لاستيراد الفواتير
        
        Args:
            file_path: مسار ملف Excel
            file_type: نوع الملف (sales أو purchases)
            
        Returns:
            مسار الملف المصدر
            
        Raises:
            ValueError: إذا كان نوع الملف غير مدعوم
        """
        try:
            logger.info(f"جاري تصدير قالب {file_type} إلى الملف: {file_path}")
            
            # التحقق من نوع الملف
            if file_type not in ['sales', 'purchases']:
                raise ValueError(f"نوع ملف غير مدعوم: {file_type}")
            
            # إنشاء DataFrame فارغ بالأعمدة المطلوبة
            column_mapping = self._get_column_mapping(file_type)
            columns = [possible_names[0] for possible_names in column_mapping.values()]
            
            df = pd.DataFrame(columns=columns)
            
            # إضافة صف مثال
            if file_type == 'sales':
                example_data = {
                    'رقم الفاتورة': 'INV-001',
                    'تاريخ الإصدار': '2025-05-17',
                    'اسم العميل': 'شركة العميل',
                    'الرقم الضريبي للعميل': '123456789',
                    'عنوان العميل': 'عنوان العميل',
                    'وصف المنتج': 'منتج 1',
                    'كود المنتج': 'SKU001',
                    'الكمية': 2,
                    'سعر الوحدة': 100,
                    'الخصم': 0,
                    'نسبة الضريبة': 14,
                    'الإجمالي': 228
                }
            else:  # purchases
                example_data = {
                    'رقم الفاتورة': 'PINV-001',
                    'تاريخ الإصدار': '2025-05-17',
                    'اسم المورد': 'شركة المورد',
                    'الرقم الضريبي للمورد': '987654321',
                    'عنوان المورد': 'عنوان المورد',
                    'وصف المنتج': 'منتج 1',
                    'كود المنتج': 'SKU001',
                    'الكمية': 2,
                    'سعر الوحدة': 100,
                    'الخصم': 0,
                    'نسبة الضريبة': 14,
                    'الإجمالي': 228
                }
            
            df = pd.concat([df, pd.DataFrame([example_data])], ignore_index=True)
            
            # حفظ الملف
            _, ext = os.path.splitext(file_path)
            if ext.lower() == '.csv':
                df.to_csv(file_path, index=False)
            else:
                df.to_excel(file_path, index=False)
            
            logger.info(f"تم تصدير القالب بنجاح إلى: {file_path}")
            
            return file_path
        
        except Exception as e:
            logger.error(f"خطأ في تصدير القالب: {str(e)}")
            raise ValueError(f"خطأ في تصدير القالب: {str(e)}")
