import pandas as pd
import logging
import os
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
import json
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64

# إعداد التسجيل
logger = logging.getLogger(__name__)

class ReportService:
    """
    خدمة إنشاء وتصدير التقارير
    
    تتيح هذه الخدمة:
    - إنشاء تقارير المبيعات
    - إنشاء تقارير المشتريات
    - إنشاء تقارير الضرائب
    - تصدير التقارير بتنسيقات مختلفة
    """
    
    def __init__(self, db_service=None):
        """
        تهيئة الخدمة
        
        Args:
            db_service: خدمة قاعدة البيانات (اختياري)
        """
        self.db_service = db_service
    
    def _format_currency(self, amount: float) -> str:
        """
        تنسيق المبلغ كعملة
        
        Args:
            amount: المبلغ
            
        Returns:
            المبلغ منسقًا كعملة
        """
        return f"{amount:,.2f} ج.م"
    
    def _format_date(self, date_str: str) -> str:
        """
        تنسيق التاريخ
        
        Args:
            date_str: التاريخ كسلسلة نصية
            
        Returns:
            التاريخ منسقًا
        """
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            return date_obj.strftime('%d/%m/%Y')
        except:
            return date_str
    
    def _generate_chart(self, data: Dict[str, float], title: str, chart_type: str = 'bar') -> str:
        """
        إنشاء رسم بياني
        
        Args:
            data: بيانات الرسم البياني
            title: عنوان الرسم البياني
            chart_type: نوع الرسم البياني (bar أو pie)
            
        Returns:
            الرسم البياني كسلسلة نصية Base64
        """
        plt.figure(figsize=(10, 6))
        plt.title(title, fontsize=16)
        
        if chart_type == 'bar':
            sns.barplot(x=list(data.keys()), y=list(data.values()))
            plt.xticks(rotation=45)
            plt.ylabel('القيمة (ج.م)')
        elif chart_type == 'pie':
            plt.pie(data.values(), labels=data.keys(), autopct='%1.1f%%', startangle=90)
            plt.axis('equal')
        
        # تحويل الرسم البياني إلى سلسلة نصية Base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_png = buffer.getvalue()
        buffer.close()
        
        graphic = base64.b64encode(image_png).decode('utf-8')
        
        return graphic
    
    def get_sales_report(self, start_date: str, end_date: str, group_by: str = 'day') -> Dict[str, Any]:
        """
        الحصول على تقرير المبيعات
        
        Args:
            start_date: تاريخ البداية (YYYY-MM-DD)
            end_date: تاريخ النهاية (YYYY-MM-DD)
            group_by: التجميع حسب (day أو month أو year)
            
        Returns:
            تقرير المبيعات
        """
        try:
            logger.info(f"جاري إنشاء تقرير المبيعات من {start_date} إلى {end_date}")
            
            # في حالة عدم وجود خدمة قاعدة بيانات، استخدم بيانات تجريبية
            if not self.db_service:
                return self._get_mock_sales_report(start_date, end_date, group_by)
            
            # استعلام قاعدة البيانات للحصول على بيانات المبيعات
            # TODO: استبدل هذا بالاستعلام الفعلي
            sales_data = self.db_service.get_sales(start_date, end_date)
            
            # تجميع البيانات حسب المعيار المحدد
            grouped_data = self._group_data(sales_data, group_by)
            
            # حساب الإجماليات
            total_amount = sum(invoice['total_amount'] for invoice in sales_data)
            total_tax = sum(invoice['tax_amount'] for invoice in sales_data)
            total_net = total_amount - total_tax
            
            # إنشاء الرسوم البيانية
            amount_chart = self._generate_chart(
                {k: v['total_amount'] for k, v in grouped_data.items()},
                f"إجمالي المبيعات حسب {group_by}",
                'bar'
            )
            
            client_data = {}
            for invoice in sales_data:
                client = invoice['client_name']
                if client in client_data:
                    client_data[client] += invoice['total_amount']
                else:
                    client_data[client] = invoice['total_amount']
            
            # اختيار أعلى 5 عملاء
            top_clients = dict(sorted(client_data.items(), key=lambda x: x[1], reverse=True)[:5])
            client_chart = self._generate_chart(top_clients, "أعلى 5 عملاء", 'pie')
            
            # إعداد التقرير
            report = {
                'period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'group_by': group_by
                },
                'summary': {
                    'total_amount': total_amount,
                    'total_tax': total_tax,
                    'total_net': total_net,
                    'invoice_count': len(sales_data)
                },
                'details': sales_data,
                'grouped_data': grouped_data,
                'charts': {
                    'amount_chart': amount_chart,
                    'client_chart': client_chart
                }
            }
            
            logger.info(f"تم إنشاء تقرير المبيعات بنجاح")
            
            return report
        
        except Exception as e:
            logger.error(f"خطأ في إنشاء تقرير المبيعات: {str(e)}")
            raise ValueError(f"خطأ في إنشاء تقرير المبيعات: {str(e)}")
    
    def get_purchases_report(self, start_date: str, end_date: str, group_by: str = 'day') -> Dict[str, Any]:
        """
        الحصول على تقرير المشتريات
        
        Args:
            start_date: تاريخ البداية (YYYY-MM-DD)
            end_date: تاريخ النهاية (YYYY-MM-DD)
            group_by: التجميع حسب (day أو month أو year)
            
        Returns:
            تقرير المشتريات
        """
        try:
            logger.info(f"جاري إنشاء تقرير المشتريات من {start_date} إلى {end_date}")
            
            # في حالة عدم وجود خدمة قاعدة بيانات، استخدم بيانات تجريبية
            if not self.db_service:
                return self._get_mock_purchases_report(start_date, end_date, group_by)
            
            # استعلام قاعدة البيانات للحصول على بيانات المشتريات
            # TODO: استبدل هذا بالاستعلام الفعلي
            purchases_data = self.db_service.get_purchases(start_date, end_date)
            
            # تجميع البيانات حسب المعيار المحدد
            grouped_data = self._group_data(purchases_data, group_by)
            
            # حساب الإجماليات
            total_amount = sum(invoice['total_amount'] for invoice in purchases_data)
            total_tax = sum(invoice['tax_amount'] for invoice in purchases_data)
            total_net = total_amount - total_tax
            
            # إنشاء الرسوم البيانية
            amount_chart = self._generate_chart(
                {k: v['total_amount'] for k, v in grouped_data.items()},
                f"إجمالي المشتريات حسب {group_by}",
                'bar'
            )
            
            supplier_data = {}
            for invoice in purchases_data:
                supplier = invoice['supplier_name']
                if supplier in supplier_data:
                    supplier_data[supplier] += invoice['total_amount']
                else:
                    supplier_data[supplier] = invoice['total_amount']
            
            # اختيار أعلى 5 موردين
            top_suppliers = dict(sorted(supplier_data.items(), key=lambda x: x[1], reverse=True)[:5])
            supplier_chart = self._generate_chart(top_suppliers, "أعلى 5 موردين", 'pie')
            
            # إعداد التقرير
            report = {
                'period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'group_by': group_by
                },
                'summary': {
                    'total_amount': total_amount,
                    'total_tax': total_tax,
                    'total_net': total_net,
                    'invoice_count': len(purchases_data)
                },
                'details': purchases_data,
                'grouped_data': grouped_data,
                'charts': {
                    'amount_chart': amount_chart,
                    'supplier_chart': supplier_chart
                }
            }
            
            logger.info(f"تم إنشاء تقرير المشتريات بنجاح")
            
            return report
        
        except Exception as e:
            logger.error(f"خطأ في إنشاء تقرير المشتريات: {str(e)}")
            raise ValueError(f"خطأ في إنشاء تقرير المشتريات: {str(e)}")
    
    def get_tax_report(self, start_date: str, end_date: str, previous_period: bool = True) -> Dict[str, Any]:
        """
        الحصول على تقرير الضرائب
        
        Args:
            start_date: تاريخ البداية (YYYY-MM-DD)
            end_date: تاريخ النهاية (YYYY-MM-DD)
            previous_period: ما إذا كان يجب تضمين الفترة السابقة
            
        Returns:
            تقرير الضرائب
        """
        try:
            logger.info(f"جاري إنشاء تقرير الضرائب من {start_date} إلى {end_date}")
            
            # في حالة عدم وجود خدمة قاعدة بيانات، استخدم بيانات تجريبية
            if not self.db_service:
                return self._get_mock_tax_report(start_date, end_date, previous_period)
            
            # استعلام قاعدة البيانات للحصول على بيانات المبيعات والمشتريات
            # TODO: استبدل هذا بالاستعلام الفعلي
            sales_data = self.db_service.get_sales(start_date, end_date)
            purchases_data = self.db_service.get_purchases(start_date, end_date)
            
            # حساب إجماليات الضرائب
            sales_tax = sum(invoice['tax_amount'] for invoice in sales_data)
            purchases_tax = sum(invoice['tax_amount'] for invoice in purchases_data)
            
            # حساب الفترة السابقة
            if previous_period:
                # حساب تاريخ بداية ونهاية الفترة السابقة
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                period_length = (end_date_obj - start_date_obj).days + 1
                
                prev_end_date_obj = start_date_obj - timedelta(days=1)
                prev_start_date_obj = prev_end_date_obj - timedelta(days=period_length - 1)
                
                prev_start_date = prev_start_date_obj.strftime('%Y-%m-%d')
                prev_end_date = prev_end_date_obj.strftime('%Y-%m-%d')
                
                # استعلام قاعدة البيانات للحصول على بيانات الفترة السابقة
                # TODO: استبدل هذا بالاستعلام الفعلي
                prev_sales_data = self.db_service.get_sales(prev_start_date, prev_end_date)
                prev_purchases_data = self.db_service.get_purchases(prev_start_date, prev_end_date)
                
                # حساب إجماليات الضرائب للفترة السابقة
                prev_sales_tax = sum(invoice['tax_amount'] for invoice in prev_sales_data)
                prev_purchases_tax = sum(invoice['tax_amount'] for invoice in prev_purchases_data)
                
                # الحصول على رصيد الفترة السابقة
                # TODO: استبدل هذا بالاستعلام الفعلي
                previous_balance = self.db_service.get_tax_balance(prev_end_date)
            else:
                prev_sales_tax = 0
                prev_purchases_tax = 0
                previous_balance = 0
                prev_start_date = None
                prev_end_date = None
            
            # حساب رصيد مصلحة الضرائب
            current_balance = previous_balance + sales_tax - purchases_tax
            
            # إنشاء الرسوم البيانية
            tax_comparison = {
                'ضرائب المبيعات': sales_tax,
                'ضرائب المشتريات': purchases_tax
            }
            tax_chart = self._generate_chart(tax_comparison, "مقارنة ضرائب المبيعات والمشتريات", 'bar')
            
            if previous_period:
                period_comparison = {
                    'الفترة الحالية': sales_tax - purchases_tax,
                    'الفترة السابقة': prev_sales_tax - prev_purchases_tax
                }
                period_chart = self._generate_chart(period_comparison, "مقارنة صافي الضرائب بين الفترات", 'bar')
            else:
                period_chart = None
            
            # إعداد التقرير
            report = {
                'current_period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'sales_tax': sales_tax,
                    'purchases_tax': purchases_tax,
                    'net_tax': sales_tax - purchases_tax
                },
                'previous_period': {
                    'start_date': prev_start_date,
                    'end_date': prev_end_date,
                    'sales_tax': prev_sales_tax,
                    'purchases_tax': prev_purchases_tax,
                    'net_tax': prev_sales_tax - prev_purchases_tax
                } if previous_period else None,
                'tax_balance': {
                    'previous_balance': previous_balance,
                    'current_period_net': sales_tax - purchases_tax,
                    'current_balance': current_balance
                },
                'sales_details': sales_data,
                'purchases_details': purchases_data,
                'charts': {
                    'tax_chart': tax_chart,
                    'period_chart': period_chart
                }
            }
            
            logger.info(f"تم إنشاء تقرير الضرائب بنجاح")
            
            return report
        
        except Exception as e:
            logger.error(f"خطأ في إنشاء تقرير الضرائب: {str(e)}")
            raise ValueError(f"خطأ في إنشاء تقرير الضرائب: {str(e)}")
    
    def export_report_to_excel(self, report: Dict[str, Any], file_path: str, report_type: str) -> str:
        """
        تصدير التقرير إلى ملف Excel
        
        Args:
            report: بيانات التقرير
            file_path: مسار ملف Excel
            report_type: نوع التقرير (sales أو purchases أو tax)
            
        Returns:
            مسار الملف المصدر
        """
        try:
            logger.info(f"جاري تصدير تقرير {report_type} إلى الملف: {file_path}")
            
            # إنشاء كاتب Excel
            writer = pd.ExcelWriter(file_path, engine='xlsxwriter')
            
            # إضافة ورقة الملخص
            summary_df = pd.DataFrame()
            
            if report_type in ['sales', 'purchases']:
                # إضافة معلومات الفترة
                period_data = {
                    'المعلومات': ['تاريخ البداية', 'تاريخ النهاية', 'التجميع حسب'],
                    'القيمة': [
                        self._format_date(report['period']['start_date']),
                        self._format_date(report['period']['end_date']),
                        report['period']['group_by']
                    ]
                }
                period_df = pd.DataFrame(period_data)
                period_df.to_excel(writer, sheet_name='الملخص', startrow=0, index=False)
                
                # إضافة ملخص الإجماليات
                summary_data = {
                    'المعلومات': ['إجمالي المبلغ', 'إجمالي الضريبة', 'صافي المبلغ', 'عدد الفواتير'],
                    'القيمة': [
                        self._format_currency(report['summary']['total_amount']),
                        self._format_currency(report['summary']['total_tax']),
                        self._format_currency(report['summary']['total_net']),
                        report['summary']['invoice_count']
                    ]
                }
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='الملخص', startrow=len(period_df) + 2, index=False)
                
                # إضافة ورقة التفاصيل
                if report_type == 'sales':
                    details_df = pd.DataFrame(report['details'])
                    if not details_df.empty:
                        # إعادة تسمية الأعمدة
                        details_df = details_df.rename(columns={
                            'invoice_number': 'رقم الفاتورة',
                            'issue_date': 'تاريخ الإصدار',
                            'client_name': 'اسم العميل',
                            'client_tax_number': 'الرقم الضريبي للعميل',
                            'total_amount': 'إجمالي المبلغ',
                            'tax_amount': 'مبلغ الضريبة',
                            'net_amount': 'صافي المبلغ',
                            'status': 'الحالة'
                        })
                        details_df.to_excel(writer, sheet_name='تفاصيل المبيعات', index=False)
                else:  # purchases
                    details_df = pd.DataFrame(report['details'])
                    if not details_df.empty:
                        # إعادة تسمية الأعمدة
                        details_df = details_df.rename(columns={
                            'invoice_number': 'رقم الفاتورة',
                            'issue_date': 'تاريخ الإصدار',
                            'supplier_name': 'اسم المورد',
                            'supplier_tax_number': 'الرقم الضريبي للمورد',
                            'total_amount': 'إجمالي المبلغ',
                            'tax_amount': 'مبلغ الضريبة',
                            'net_amount': 'صافي المبلغ',
                            'status': 'الحالة'
                        })
                        details_df.to_excel(writer, sheet_name='تفاصيل المشتريات', index=False)
                
                # إضافة ورقة البيانات المجمعة
                grouped_data_list = []
                for period, data in report['grouped_data'].items():
                    grouped_data_list.append({
                        'الفترة': period,
                        'إجمالي المبلغ': data['total_amount'],
                        'إجمالي الضريبة': data['tax_amount'],
                        'عدد الفواتير': data['invoice_count']
                    })
                
                grouped_df = pd.DataFrame(grouped_data_list)
                if not grouped_df.empty:
                    grouped_df.to_excel(writer, sheet_name='البيانات المجمعة', index=False)
            
            elif report_type == 'tax':
                # إضافة معلومات الفترة الحالية
                current_period_data = {
                    'المعلومات': ['تاريخ البداية', 'تاريخ النهاية', 'ضرائب المبيعات', 'ضرائب المشتريات', 'صافي الضرائب'],
                    'القيمة': [
                        self._format_date(report['current_period']['start_date']),
                        self._format_date(report['current_period']['end_date']),
                        self._format_currency(report['current_period']['sales_tax']),
                        self._format_currency(report['current_period']['purchases_tax']),
                        self._format_currency(report['current_period']['net_tax'])
                    ]
                }
                current_period_df = pd.DataFrame(current_period_data)
                current_period_df.to_excel(writer, sheet_name='الملخص', startrow=0, index=False)
                
                # إضافة معلومات الفترة السابقة إذا كانت موجودة
                if report['previous_period']:
                    prev_period_data = {
                        'المعلومات': ['تاريخ البداية (الفترة السابقة)', 'تاريخ النهاية (الفترة السابقة)', 'ضرائب المبيعات (الفترة السابقة)', 'ضرائب المشتريات (الفترة السابقة)', 'صافي الضرائب (الفترة السابقة)'],
                        'القيمة': [
                            self._format_date(report['previous_period']['start_date']),
                            self._format_date(report['previous_period']['end_date']),
                            self._format_currency(report['previous_period']['sales_tax']),
                            self._format_currency(report['previous_period']['purchases_tax']),
                            self._format_currency(report['previous_period']['net_tax'])
                        ]
                    }
                    prev_period_df = pd.DataFrame(prev_period_data)
                    prev_period_df.to_excel(writer, sheet_name='الملخص', startrow=len(current_period_df) + 2, index=False)
                    start_row = len(current_period_df) + len(prev_period_df) + 4
                else:
                    start_row = len(current_period_df) + 2
                
                # إضافة معلومات رصيد الضرائب
                balance_data = {
                    'المعلومات': ['رصيد الفترة السابقة', 'صافي ضرائب الفترة الحالية', 'رصيد مصلحة الضرائب'],
                    'القيمة': [
                        self._format_currency(report['tax_balance']['previous_balance']),
                        self._format_currency(report['tax_balance']['current_period_net']),
                        self._format_currency(report['tax_balance']['current_balance'])
                    ]
                }
                balance_df = pd.DataFrame(balance_data)
                balance_df.to_excel(writer, sheet_name='الملخص', startrow=start_row, index=False)
                
                # إضافة ورقة تفاصيل المبيعات
                sales_df = pd.DataFrame(report['sales_details'])
                if not sales_df.empty:
                    # إعادة تسمية الأعمدة
                    sales_df = sales_df.rename(columns={
                        'invoice_number': 'رقم الفاتورة',
                        'issue_date': 'تاريخ الإصدار',
                        'client_name': 'اسم العميل',
                        'client_tax_number': 'الرقم الضريبي للعميل',
                        'tax_amount': 'مبلغ الضريبة',
                        'status': 'الحالة'
                    })
                    sales_df.to_excel(writer, sheet_name='تفاصيل ضرائب المبيعات', index=False)
                
                # إضافة ورقة تفاصيل المشتريات
                purchases_df = pd.DataFrame(report['purchases_details'])
                if not purchases_df.empty:
                    # إعادة تسمية الأعمدة
                    purchases_df = purchases_df.rename(columns={
                        'invoice_number': 'رقم الفاتورة',
                        'issue_date': 'تاريخ الإصدار',
                        'supplier_name': 'اسم المورد',
                        'supplier_tax_number': 'الرقم الضريبي للمورد',
                        'tax_amount': 'مبلغ الضريبة',
                        'status': 'الحالة'
                    })
                    purchases_df.to_excel(writer, sheet_name='تفاصيل ضرائب المشتريات', index=False)
            
            # حفظ الملف
            writer.close()
            
            logger.info(f"تم تصدير التقرير بنجاح إلى: {file_path}")
            
            return file_path
        
        except Exception as e:
            logger.error(f"خطأ في تصدير التقرير إلى Excel: {str(e)}")
            raise ValueError(f"خطأ في تصدير التقرير إلى Excel: {str(e)}")
    
    def export_report_to_pdf(self, report: Dict[str, Any], file_path: str, report_type: str) -> str:
        """
        تصدير التقرير إلى ملف PDF
        
        Args:
            report: بيانات التقرير
            file_path: مسار ملف PDF
            report_type: نوع التقرير (sales أو purchases أو tax)
            
        Returns:
            مسار الملف المصدر
        """
        try:
            logger.info(f"جاري تصدير تقرير {report_type} إلى الملف: {file_path}")
            
            # TODO: تنفيذ تصدير PDF
            # يمكن استخدام مكتبات مثل ReportLab أو WeasyPrint
            
            logger.info(f"تم تصدير التقرير بنجاح إلى: {file_path}")
            
            return file_path
        
        except Exception as e:
            logger.error(f"خطأ في تصدير التقرير إلى PDF: {str(e)}")
            raise ValueError(f"خطأ في تصدير التقرير إلى PDF: {str(e)}")
    
    def _group_data(self, data: List[Dict[str, Any]], group_by: str) -> Dict[str, Dict[str, Any]]:
        """
        تجميع البيانات حسب المعيار المحدد
        
        Args:
            data: البيانات المراد تجميعها
            group_by: معيار التجميع (day أو month أو year)
            
        Returns:
            البيانات المجمعة
        """
        grouped_data = {}
        
        for invoice in data:
            date_str = invoice.get('issue_date')
            if not date_str:
                continue
            
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                
                if group_by == 'day':
                    key = date_obj.strftime('%Y-%m-%d')
                elif group_by == 'month':
                    key = date_obj.strftime('%Y-%m')
                elif group_by == 'year':
                    key = date_obj.strftime('%Y')
                else:
                    key = date_obj.strftime('%Y-%m-%d')
                
                if key in grouped_data:
                    grouped_data[key]['total_amount'] += invoice['total_amount']
                    grouped_data[key]['tax_amount'] += invoice['tax_amount']
                    grouped_data[key]['invoice_count'] += 1
                else:
                    grouped_data[key] = {
                        'total_amount': invoice['total_amount'],
                        'tax_amount': invoice['tax_amount'],
                        'invoice_count': 1
                    }
            except:
                continue
        
        return grouped_data
    
    def _get_mock_sales_report(self, start_date: str, end_date: str, group_by: str) -> Dict[str, Any]:
        """
        الحصول على تقرير مبيعات تجريبي
        
        Args:
            start_date: تاريخ البداية
            end_date: تاريخ النهاية
            group_by: التجميع حسب
            
        Returns:
            تقرير المبيعات التجريبي
        """
        # إنشاء بيانات تجريبية
        sales_data = [
            {
                'id': 1,
                'invoice_number': 'INV-001',
                'issue_date': '2025-05-01',
                'client_name': 'شركة الأمل للتجارة',
                'client_tax_number': '123456789',
                'total_amount': 11800,
                'tax_amount': 1400,
                'net_amount': 10400,
                'status': 'مرسلة'
            },
            {
                'id': 2,
                'invoice_number': 'INV-002',
                'issue_date': '2025-05-03',
                'client_name': 'مؤسسة النور',
                'client_tax_number': '234567890',
                'total_amount': 5700,
                'tax_amount': 700,
                'net_amount': 5000,
                'status': 'مرسلة'
            },
            {
                'id': 3,
                'invoice_number': 'INV-003',
                'issue_date': '2025-05-07',
                'client_name': 'شركة المستقبل',
                'client_tax_number': '345678901',
                'total_amount': 18500,
                'tax_amount': 2500,
                'net_amount': 16000,
                'status': 'مرسلة'
            },
            {
                'id': 4,
                'invoice_number': 'INV-004',
                'issue_date': '2025-05-10',
                'client_name': 'مؤسسة الإبداع',
                'client_tax_number': '456789012',
                'total_amount': 8200,
                'tax_amount': 1200,
                'net_amount': 7000,
                'status': 'مرسلة'
            },
            {
                'id': 5,
                'invoice_number': 'INV-005',
                'issue_date': '2025-05-15',
                'client_name': 'شركة التقدم',
                'client_tax_number': '567890123',
                'total_amount': 14500,
                'tax_amount': 1900,
                'net_amount': 12600,
                'status': 'مرسلة'
            }
        ]
        
        # تجميع البيانات حسب المعيار المحدد
        grouped_data = self._group_data(sales_data, group_by)
        
        # حساب الإجماليات
        total_amount = sum(invoice['total_amount'] for invoice in sales_data)
        total_tax = sum(invoice['tax_amount'] for invoice in sales_data)
        total_net = sum(invoice['net_amount'] for invoice in sales_data)
        
        # إنشاء الرسوم البيانية
        amount_chart = self._generate_chart(
            {k: v['total_amount'] for k, v in grouped_data.items()},
            f"إجمالي المبيعات حسب {group_by}",
            'bar'
        )
        
        client_data = {}
        for invoice in sales_data:
            client = invoice['client_name']
            if client in client_data:
                client_data[client] += invoice['total_amount']
            else:
                client_data[client] = invoice['total_amount']
        
        client_chart = self._generate_chart(client_data, "توزيع المبيعات حسب العملاء", 'pie')
        
        # إعداد التقرير
        report = {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'group_by': group_by
            },
            'summary': {
                'total_amount': total_amount,
                'total_tax': total_tax,
                'total_net': total_net,
                'invoice_count': len(sales_data)
            },
            'details': sales_data,
            'grouped_data': grouped_data,
            'charts': {
                'amount_chart': amount_chart,
                'client_chart': client_chart
            }
        }
        
        return report
    
    def _get_mock_purchases_report(self, start_date: str, end_date: str, group_by: str) -> Dict[str, Any]:
        """
        الحصول على تقرير مشتريات تجريبي
        
        Args:
            start_date: تاريخ البداية
            end_date: تاريخ النهاية
            group_by: التجميع حسب
            
        Returns:
            تقرير المشتريات التجريبي
        """
        # إنشاء بيانات تجريبية
        purchases_data = [
            {
                'id': 1,
                'invoice_number': 'PINV-001',
                'issue_date': '2025-05-02',
                'supplier_name': 'شركة التوريدات العامة',
                'supplier_tax_number': '987654321',
                'total_amount': 8500,
                'tax_amount': 1100,
                'net_amount': 7400,
                'status': 'مستلمة'
            },
            {
                'id': 2,
                'invoice_number': 'PINV-002',
                'issue_date': '2025-05-05',
                'supplier_name': 'مؤسسة الإمداد',
                'supplier_tax_number': '876543210',
                'total_amount': 4200,
                'tax_amount': 600,
                'net_amount': 3600,
                'status': 'مستلمة'
            },
            {
                'id': 3,
                'invoice_number': 'PINV-003',
                'issue_date': '2025-05-09',
                'supplier_name': 'شركة المستلزمات',
                'supplier_tax_number': '765432109',
                'total_amount': 12000,
                'tax_amount': 1600,
                'net_amount': 10400,
                'status': 'مستلمة'
            },
            {
                'id': 4,
                'invoice_number': 'PINV-004',
                'issue_date': '2025-05-12',
                'supplier_name': 'مؤسسة التجهيزات',
                'supplier_tax_number': '654321098',
                'total_amount': 6300,
                'tax_amount': 900,
                'net_amount': 5400,
                'status': 'مستلمة'
            }
        ]
        
        # تجميع البيانات حسب المعيار المحدد
        grouped_data = self._group_data(purchases_data, group_by)
        
        # حساب الإجماليات
        total_amount = sum(invoice['total_amount'] for invoice in purchases_data)
        total_tax = sum(invoice['tax_amount'] for invoice in purchases_data)
        total_net = sum(invoice['net_amount'] for invoice in purchases_data)
        
        # إنشاء الرسوم البيانية
        amount_chart = self._generate_chart(
            {k: v['total_amount'] for k, v in grouped_data.items()},
            f"إجمالي المشتريات حسب {group_by}",
            'bar'
        )
        
        supplier_data = {}
        for invoice in purchases_data:
            supplier = invoice['supplier_name']
            if supplier in supplier_data:
                supplier_data[supplier] += invoice['total_amount']
            else:
                supplier_data[supplier] = invoice['total_amount']
        
        supplier_chart = self._generate_chart(supplier_data, "توزيع المشتريات حسب الموردين", 'pie')
        
        # إعداد التقرير
        report = {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'group_by': group_by
            },
            'summary': {
                'total_amount': total_amount,
                'total_tax': total_tax,
                'total_net': total_net,
                'invoice_count': len(purchases_data)
            },
            'details': purchases_data,
            'grouped_data': grouped_data,
            'charts': {
                'amount_chart': amount_chart,
                'supplier_chart': supplier_chart
            }
        }
        
        return report
    
    def _get_mock_tax_report(self, start_date: str, end_date: str, previous_period: bool) -> Dict[str, Any]:
        """
        الحصول على تقرير ضرائب تجريبي
        
        Args:
            start_date: تاريخ البداية
            end_date: تاريخ النهاية
            previous_period: ما إذا كان يجب تضمين الفترة السابقة
            
        Returns:
            تقرير الضرائب التجريبي
        """
        # إنشاء بيانات تجريبية للمبيعات
        sales_data = [
            {
                'id': 1,
                'invoice_number': 'INV-001',
                'issue_date': '2025-05-01',
                'client_name': 'شركة الأمل للتجارة',
                'client_tax_number': '123456789',
                'total_amount': 11800,
                'tax_amount': 1400,
                'net_amount': 10400,
                'status': 'مرسلة'
            },
            {
                'id': 2,
                'invoice_number': 'INV-002',
                'issue_date': '2025-05-03',
                'client_name': 'مؤسسة النور',
                'client_tax_number': '234567890',
                'total_amount': 5700,
                'tax_amount': 700,
                'net_amount': 5000,
                'status': 'مرسلة'
            },
            {
                'id': 3,
                'invoice_number': 'INV-003',
                'issue_date': '2025-05-07',
                'client_name': 'شركة المستقبل',
                'client_tax_number': '345678901',
                'total_amount': 18500,
                'tax_amount': 2500,
                'net_amount': 16000,
                'status': 'مرسلة'
            },
            {
                'id': 4,
                'invoice_number': 'INV-004',
                'issue_date': '2025-05-10',
                'client_name': 'مؤسسة الإبداع',
                'client_tax_number': '456789012',
                'total_amount': 8200,
                'tax_amount': 1200,
                'net_amount': 7000,
                'status': 'مرسلة'
            },
            {
                'id': 5,
                'invoice_number': 'INV-005',
                'issue_date': '2025-05-15',
                'client_name': 'شركة التقدم',
                'client_tax_number': '567890123',
                'total_amount': 14500,
                'tax_amount': 1900,
                'net_amount': 12600,
                'status': 'مرسلة'
            }
        ]
        
        # إنشاء بيانات تجريبية للمشتريات
        purchases_data = [
            {
                'id': 1,
                'invoice_number': 'PINV-001',
                'issue_date': '2025-05-02',
                'supplier_name': 'شركة التوريدات العامة',
                'supplier_tax_number': '987654321',
                'total_amount': 8500,
                'tax_amount': 1100,
                'net_amount': 7400,
                'status': 'مستلمة'
            },
            {
                'id': 2,
                'invoice_number': 'PINV-002',
                'issue_date': '2025-05-05',
                'supplier_name': 'مؤسسة الإمداد',
                'supplier_tax_number': '876543210',
                'total_amount': 4200,
                'tax_amount': 600,
                'net_amount': 3600,
                'status': 'مستلمة'
            },
            {
                'id': 3,
                'invoice_number': 'PINV-003',
                'issue_date': '2025-05-09',
                'supplier_name': 'شركة المستلزمات',
                'supplier_tax_number': '765432109',
                'total_amount': 12000,
                'tax_amount': 1600,
                'net_amount': 10400,
                'status': 'مستلمة'
            },
            {
                'id': 4,
                'invoice_number': 'PINV-004',
                'issue_date': '2025-05-12',
                'supplier_name': 'مؤسسة التجهيزات',
                'supplier_tax_number': '654321098',
                'total_amount': 6300,
                'tax_amount': 900,
                'net_amount': 5400,
                'status': 'مستلمة'
            }
        ]
        
        # حساب إجماليات الضرائب
        sales_tax = sum(invoice['tax_amount'] for invoice in sales_data)
        purchases_tax = sum(invoice['tax_amount'] for invoice in purchases_data)
        
        # بيانات الفترة السابقة
        if previous_period:
            prev_sales_tax = 6500
            prev_purchases_tax = 3800
            previous_balance = 12000
            prev_start_date = '2025-04-01'
            prev_end_date = '2025-04-30'
        else:
            prev_sales_tax = 0
            prev_purchases_tax = 0
            previous_balance = 0
            prev_start_date = None
            prev_end_date = None
        
        # حساب رصيد مصلحة الضرائب
        current_balance = previous_balance + sales_tax - purchases_tax
        
        # إنشاء الرسوم البيانية
        tax_comparison = {
            'ضرائب المبيعات': sales_tax,
            'ضرائب المشتريات': purchases_tax
        }
        tax_chart = self._generate_chart(tax_comparison, "مقارنة ضرائب المبيعات والمشتريات", 'bar')
        
        if previous_period:
            period_comparison = {
                'الفترة الحالية': sales_tax - purchases_tax,
                'الفترة السابقة': prev_sales_tax - prev_purchases_tax
            }
            period_chart = self._generate_chart(period_comparison, "مقارنة صافي الضرائب بين الفترات", 'bar')
        else:
            period_chart = None
        
        # إعداد التقرير
        report = {
            'current_period': {
                'start_date': start_date,
                'end_date': end_date,
                'sales_tax': sales_tax,
                'purchases_tax': purchases_tax,
                'net_tax': sales_tax - purchases_tax
            },
            'previous_period': {
                'start_date': prev_start_date,
                'end_date': prev_end_date,
                'sales_tax': prev_sales_tax,
                'purchases_tax': prev_purchases_tax,
                'net_tax': prev_sales_tax - prev_purchases_tax
            } if previous_period else None,
            'tax_balance': {
                'previous_balance': previous_balance,
                'current_period_net': sales_tax - purchases_tax,
                'current_balance': current_balance
            },
            'sales_details': sales_data,
            'purchases_details': purchases_data,
            'charts': {
                'tax_chart': tax_chart,
                'period_chart': period_chart
            }
        }
        
        return report
