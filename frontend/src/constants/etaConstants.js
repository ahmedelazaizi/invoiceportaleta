// أنواع المستندات
export const DOCUMENT_TYPES = {
  SALES_INVOICE: 'I', // فاتورة مبيعات
  SALES_RETURN: 'C', // مرتجع مبيعات
  PURCHASE_INVOICE: 'P', // فاتورة مشتريات
  PURCHASE_RETURN: 'R', // مرتجع مشتريات
};

// أنواع العملاء
export const CUSTOMER_TYPES = {
  BUSINESS: 'B', // شركة/مؤسسة
  PERSON: 'P', // فرد
};

// أنواع الضرائب
export const TAX_TYPES = [
  { code: 'T1', label: 'ضريبة القيمة المضافة', subtype: 'V009', rate: 14, desc: 'Value added tax - ضريبة القيمة المضافة' },
  { code: 'T2', label: 'ضريبة الجدول (نسبية)', subtype: 'Tbl01', rate: 5, desc: 'Table tax (percentage) - ضريبة الجدول (نسبية)' },
  { code: 'T3', label: 'ضريبة الجدول (نوعية)', subtype: 'V010', rate: 0, desc: 'Table tax (Fixed Amount) - ضريبة الجدول (النوعية)' },
  { code: 'T4', label: 'الخصم تحت حساب الضريبة', subtype: 'W003', rate: 1, desc: 'Withholding tax (WHT) - الخصم تحت حساب الضريبة' },
];

// الوحدات الرسمية
export const UNIT_TYPES = [
  { code: 'KGM', label: 'KGM Kilogram ( كجم )' },
  { code: 'LTR', label: 'LTR Liter ( لتر )' },
  { code: 'MTR', label: 'MTR Meter ( متر )' },
  { code: 'EA', label: 'EA Each ( وحدة )' },
  { code: 'BOX', label: 'BOX Box ( صندوق )' },
  { code: 'DAY', label: 'DAY Day ( يوم )' },
  { code: 'BAG', label: 'BAG Bag ( كيس )' },
  { code: 'CMK', label: 'CMK Square centimeter ( سم2 )' },
  { code: 'GRM', label: 'GRM Gram ( جم )' },
  { code: 'HUR', label: 'HUR Hour ( ساعة )' },
  { code: 'MMT', label: 'MMT Cubic millimeter ( مم3 )' },
  { code: 'MON', label: 'MON Month ( شهر )' },
  { code: 'MWH', label: 'MWH Megawatt hour ( ميجاوات ساعة )' },
  { code: 'TNE', label: 'TNE Ton ( طن )' },
  { code: 'PK', label: 'PK Pack ( عبوة )' },
  { code: 'C62', label: 'C62 One ( واحد )' },
  { code: 'LBR', label: 'LBR Pound ( رطل )' },
  { code: 'MTK', label: 'MTK Square meter ( م2 )' },
  { code: 'MGM', label: 'MGM Milligram ( ملجم )' },
  { code: 'LTR', label: 'LTR Liter ( لتر )' },
  { code: 'TNE', label: 'TNE Tonne ( طن )' },
  { code: 'CMT', label: 'CMT Centimeter ( سم )' },
  { code: 'CMQ', label: 'CMQ Cubic centimeter ( سم3 )' },
];

// طرق الدفع
export const PAYMENT_METHODS = [
  { code: 'CASH', label: 'نقدي' },
  { code: 'BANK', label: 'تحويل بنكي' },
  { code: 'CREDIT', label: 'آجل' },
];

// حالات الفاتورة
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// متطلبات التحقق من صحة الفاتورة
export const VALIDATION_REQUIREMENTS = {
  INVOICE_NUMBER: {
    required: true,
    pattern: /^[A-Z0-9]{1,20}$/,
    message: 'رقم الفاتورة يجب أن يكون حروف وأرقام فقط (1-20 حرف)'
  },
  TAX_NUMBER: {
    required: true,
    pattern: /^[0-9]{9,15}$/,
    message: 'الرقم الضريبي يجب أن يكون 9-15 رقم'
  },
  CURRENCY: {
    required: true,
    default: 'EGP'
  },
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss',
  DECIMAL_PLACES: 2,
};

// رسائل الخطأ
export const ERROR_MESSAGES = {
  INVALID_INVOICE_NUMBER: 'رقم الفاتورة غير صالح',
  INVALID_TAX_NUMBER: 'الرقم الضريبي غير صالح',
  INVALID_DATE: 'تاريخ الفاتورة غير صالح',
  INVALID_AMOUNT: 'قيمة الفاتورة غير صالحة',
  INVALID_TAX: 'قيمة الضريبة غير صالحة',
  INVALID_ITEMS: 'يجب إضافة صنف واحد على الأقل',
  INVALID_CUSTOMER: 'بيانات العميل غير مكتملة',
  INVALID_PAYMENT: 'طريقة الدفع غير صالحة',
  NETWORK_ERROR: 'خطأ في الاتصال بالخادم',
  API_ERROR: 'خطأ في الاتصال ببوابة الفاتورة الإلكترونية',
};

// إعدادات API
export const API_CONFIG = {
  BASE_URL: 'https://api.eta.gov.eg',
  VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
}; 