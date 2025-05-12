import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTrash, FaSave, FaTimes, FaFileExcel, FaDownload, FaCalculator } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Spin } from 'antd';
import './InvoiceForm.css';
import * as XLSX from 'xlsx';
import etaService from '../services/etaService';
import {
  DOCUMENT_TYPES,
  CUSTOMER_TYPES,
  TAX_TYPES,
  UNIT_TYPES,
  PAYMENT_METHODS,
  VALIDATION_REQUIREMENTS,
  ERROR_MESSAGES
} from '../constants/etaConstants';

const InvoiceForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    type: DOCUMENT_TYPES.SALES_INVOICE,
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    customerId: '',
    customerType: CUSTOMER_TYPES.BUSINESS,
    customerTaxNumber: '',
    customerAddress: '',
    activityCode: '',
    paymentMethod: PAYMENT_METHODS[0].code,
    bankName: '',
    bankAccountNumber: '',
    bankAccountIBAN: '',
    swiftCode: '',
    paymentTerms: '',
    deliveryApproach: '',
    deliveryPackaging: '',
    deliveryDateValidity: '',
    deliveryExportPort: '',
    deliveryGrossWeight: 0,
    deliveryNetWeight: 0,
    deliveryTerms: '',
    notes: '',
    totalAmount: 0,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: 0
  });
  const [importedInvoices, setImportedInvoices] = useState([]);

  useEffect(() => {
    fetchCustomers();
    fetchItems();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('http://localhost:8000/customers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      setError('حدث خطأ في جلب بيانات العملاء');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('http://localhost:8000/items', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      setError('حدث خطأ في جلب بيانات المنتجات');
    }
  };

  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    setInvoiceData(prev => ({
      ...prev,
      customerId,
      customerType: customer?.type || CUSTOMER_TYPES.BUSINESS,
      customerTaxNumber: customer?.taxNumber || '',
      customerAddress: customer?.address || '',
      activityCode: customer?.activityCode || ''
    }));
  };

  const addItem = () => {
    setInvoiceItems(prev => [...prev, {
      id: Date.now(),
      itemId: '',
      name: '',
      description: '',
      type: '',
      code: '',
      unitType: UNIT_TYPES[0].code,
      quantity: 1,
      unitPrice: 0,
      currency: 'EGP',
      taxType: TAX_TYPES[0].code,
      taxSubType: TAX_TYPES[0].subtype,
      taxRate: TAX_TYPES[0].rate,
      taxAmount: 0,
      totalAmount: 0,
      discountRate: 0,
      discountAmount: 0,
      taxableFees: 0,
      netTotal: 0
    }]);
  };

  const removeItem = (id) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== id));
    calculateTotals();
  };

  const handleItemChange = (id, field, value) => {
    setInvoiceItems(prev => {
      const updatedItems = prev.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // حساب المجاميع
          if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate' || field === 'discountRate') {
            const quantity = field === 'quantity' ? value : item.quantity;
            const unitPrice = field === 'unitPrice' ? value : item.unitPrice;
            const taxRate = field === 'taxRate' ? value : item.taxRate;
            const discountRate = field === 'discountRate' ? value : item.discountRate;
            
            const totalAmount = quantity * unitPrice;
            const discountAmount = totalAmount * (discountRate / 100);
            const netTotal = totalAmount - discountAmount;
            const taxAmount = netTotal * (taxRate / 100);
            
            updatedItem.totalAmount = totalAmount;
            updatedItem.discountAmount = discountAmount;
            updatedItem.netTotal = netTotal;
            updatedItem.taxAmount = taxAmount;
          }
          
          return updatedItem;
        }
        return item;
      });
      
      calculateTotals(updatedItems);
      return updatedItems;
    });
  };

  const calculateTotals = (items = invoiceItems) => {
    const totals = items.reduce((acc, item) => ({
      totalAmount: acc.totalAmount + (item.totalAmount || 0),
      totalDiscount: acc.totalDiscount + (item.discountAmount || 0),
      totalTax: acc.totalTax + (item.taxAmount || 0)
    }), { totalAmount: 0, totalDiscount: 0, totalTax: 0 });

    setInvoiceData(prev => ({
      ...prev,
      totalAmount: totals.totalAmount,
      totalDiscount: totals.totalDiscount,
      totalTax: totals.totalTax,
      grandTotal: totals.totalAmount - totals.totalDiscount + totals.totalTax
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // التحقق من صحة الفاتورة
      const validationErrors = etaService.validateInvoice({
        ...invoiceData,
        items: invoiceItems
      });

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      // إرسال الفاتورة إلى ETA
      const etaResponse = await etaService.submitInvoice({
        ...invoiceData,
        items: invoiceItems
      });

      // حفظ الفاتورة في قاعدة البيانات المحلية
      const response = await fetch('http://localhost:8000/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...invoiceData,
          items: invoiceItems,
          etaResponse
        })
      });

      if (response.ok) {
        toast.success('تم إنشاء الفاتورة بنجاح');
        navigate('/invoices');
      } else {
        const data = await response.json();
        throw new Error(data.detail || 'حدث خطأ في حفظ الفاتورة');
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error('الملف لا يحتوي على بيانات');
          return;
        }

        // كل صف يمثل فاتورة
        const invoices = jsonData.map(row => ({
          invoiceNumber: row['رقم الفاتورة'] || '',
          invoiceDate: row['تاريخ الفاتورة'] || new Date().toISOString().split('T')[0],
          customerName: row['اسم العميل'] || '',
          customerTaxNumber: row['الرقم الضريبي للعميل'] || '',
          customerAddress: row['عنوان العميل'] || '',
          customerType: row['نوع العميل'] === 'شركة' ? 'B' : 'P',
          items: [{
            name: row['اسم المنتج'] || '',
            description: row['وصف المنتج'] || '',
            quantity: parseFloat(row['الكمية']) || 1,
            unitPrice: parseFloat(row['سعر الوحدة']) || 0,
            taxRate: parseFloat(row['نسبة الضريبة']) || 14,
            totalAmount: (parseFloat(row['الكمية']) || 1) * (parseFloat(row['سعر الوحدة']) || 0),
            taxAmount: ((parseFloat(row['الكمية']) || 1) * (parseFloat(row['سعر الوحدة']) || 0)) * ((parseFloat(row['نسبة الضريبة']) || 14) / 100)
          }],
          notes: row['ملاحظات'] || '',
          paymentMethod: row['طريقة الدفع'] || 'CASH'
        }));

        setImportedInvoices(invoices);
        toast.success('تم استيراد ' + invoices.length + ' فاتورة بنجاح');
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('حدث خطأ في قراءة الملف');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'رقم الفاتورة': '',
        'تاريخ الفاتورة': new Date().toISOString().split('T')[0],
        'اسم العميل': '',
        'الرقم الضريبي للعميل': '',
        'عنوان العميل': '',
        'نوع العميل': 'شركة',
        'اسم المنتج': '',
        'وصف المنتج': '',
        'الكمية': 1,
        'سعر الوحدة': 0,
        'نسبة الضريبة': 14,
        'ملاحظات': '',
        'طريقة الدفع': 'نقدي'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
    XLSX.writeFile(wb, 'invoice_template.xlsx');
  };

  const handleBulkSave = async () => {
    setLoading(true);
    setError('');
    let successCount = 0;
    let failCount = 0;
    for (const inv of importedInvoices) {
      try {
        // تحقق من صحة الفاتورة (يمكنك تحسين التحقق لاحقًا)
        await fetch('http://localhost:8000/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(inv)
        });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setLoading(false);
    toast.success(`تم حفظ ${successCount} فاتورة بنجاح. فشل ${failCount}`);
    setImportedInvoices([]);
    navigate('/invoices');
  };

  return (
    <div className="invoice-form">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Spin size="large" tip="جاري التحميل..." />
        </div>
      )}
      <div className="card">
      <div className="invoice-header">
          <h2>إنشاء فاتورة جديدة</h2>
        <div className="header-actions">
          <label className="excel-upload">
              <FaFileExcel />
              <span>استيراد من Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                style={{ display: 'none' }}
              />
          </label>
            <button
              type="button"
              className="template-download"
              onClick={downloadTemplate}
            >
              <FaDownload />
              تحميل القالب
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">رقم الفاتورة</label>
              <input
                type="text"
                className="form-control"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                required
                pattern={VALIDATION_REQUIREMENTS.INVOICE_NUMBER.pattern}
                title={VALIDATION_REQUIREMENTS.INVOICE_NUMBER.message}
              />
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ الفاتورة</label>
              <input
                type="date"
                className="form-control"
                value={invoiceData.invoiceDate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">العميل</label>
            <select
              className="form-control"
              value={invoiceData.customerId}
              onChange={handleCustomerChange}
              required
            >
              <option value="">اختر العميل</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.taxNumber}
                </option>
              ))}
            </select>
        </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">نوع العميل</label>
              <select 
                className="form-control"
                value={invoiceData.customerType}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customerType: e.target.value }))}
                required
              >
                <option value={CUSTOMER_TYPES.BUSINESS}>شركة/مؤسسة</option>
                <option value={CUSTOMER_TYPES.PERSON}>فرد</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">الرقم الضريبي</label>
              <input 
                type="text" 
                className="form-control"
                value={invoiceData.customerTaxNumber}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customerTaxNumber: e.target.value }))}
                required
                pattern={VALIDATION_REQUIREMENTS.TAX_NUMBER.pattern}
                title={VALIDATION_REQUIREMENTS.TAX_NUMBER.message}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">العنوان</label>
              <input 
                type="text" 
                className="form-control"
                value={invoiceData.customerAddress}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, customerAddress: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">الرمز النشاط</label>
              <input 
                type="text" 
                className="form-control"
                value={invoiceData.activityCode}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, activityCode: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="items-section">
            <div className="section-header">
              <h3>أصناف الفاتورة</h3>
              <button
                type="button"
                className="btn btn-primary"
                onClick={addItem}
              >
                <FaPlus />
                <span>إضافة صنف</span>
              </button>
        </div>

            <div className="table-responsive">
              <table className="table">
              <thead>
                <tr>
                    <th>الصنف</th>
                    <th>الوصف</th>
                    <th>الوحدة</th>
                  <th>الكمية</th>
                    <th>سعر الوحدة</th>
                    <th>نوع الضريبة</th>
                    <th>نسبة الضريبة</th>
                    <th>نسبة الخصم</th>
                    <th>قيمة الخصم</th>
                    <th>الصافي</th>
                    <th>قيمة الضريبة</th>
                  <th>الإجمالي</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                  {invoiceItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <select
                          className="form-control"
                          value={item.itemId}
                          onChange={(e) => {
                            const selectedItem = items.find(i => i.id === e.target.value);
                            handleItemChange(item.id, 'itemId', e.target.value);
                            handleItemChange(item.id, 'name', selectedItem?.name || '');
                            handleItemChange(item.id, 'description', selectedItem?.description || '');
                            handleItemChange(item.id, 'unitPrice', selectedItem?.price || 0);
                            handleItemChange(item.id, 'unitType', selectedItem?.unitType || UNIT_TYPES[0].code);
                          }}
                          required
                        >
                          <option value="">اختر الصنف</option>
                          {items.map(i => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                              <select 
                          className="form-control"
                          value={item.unitType}
                          onChange={(e) => handleItemChange(item.id, 'unitType', e.target.value)}
                          required
                        >
                          {UNIT_TYPES.map(unit => (
                            <option key={unit.code} value={unit.code}>
                              {unit.label}
                                  </option>
                                ))}
                              </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                          min="1"
                          required
                        />
                      </td>
                      <td>
                              <input 
                                type="number" 
                          className="form-control"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                          min="0"
                          step="0.01"
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={item.taxType}
                          onChange={(e) => {
                            const taxType = TAX_TYPES.find(t => t.code === e.target.value);
                            handleItemChange(item.id, 'taxType', taxType.code);
                            handleItemChange(item.id, 'taxSubType', taxType.subtype);
                            handleItemChange(item.id, 'taxRate', taxType.rate);
                          }}
                          required
                        >
                          {TAX_TYPES.map(tax => (
                            <option key={tax.code} value={tax.code}>
                              {tax.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(item.id, 'taxRate', parseFloat(e.target.value))}
                          min="0"
                          max="100"
                          step="0.01"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.discountRate}
                          onChange={(e) => handleItemChange(item.id, 'discountRate', parseFloat(e.target.value))}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td>{item.discountAmount.toFixed(2)}</td>
                      <td>{item.netTotal.toFixed(2)}</td>
                      <td>{item.taxAmount.toFixed(2)}</td>
                      <td>{item.totalAmount.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="totals-section">
            <div className="total-row">
              <span>إجمالي الفاتورة:</span>
              <span>{invoiceData.totalAmount.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>إجمالي الخصومات:</span>
              <span>{(invoiceData.totalDiscount || 0).toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>إجمالي الضريبة:</span>
              <span>{invoiceData.totalTax.toFixed(2)}</span>
            </div>
            <div className="total-row grand-total">
              <span>الإجمالي النهائي:</span>
              <span>{invoiceData.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">طريقة الدفع</label>
              <select
                className="form-control"
                value={invoiceData.paymentMethod}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                required
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.code} value={method.code}>
                    {method.label}
                  </option>
                ))}
              </select>
        </div>

            {invoiceData.paymentMethod === PAYMENT_METHODS[1].code && (
              <>
                <div className="form-group">
                  <label className="form-label">اسم البنك</label>
                  <input
                    type="text"
                    className="form-control"
                    value={invoiceData.bankName}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الحساب</label>
                  <input
                    type="text"
                    className="form-control"
                    value={invoiceData.bankAccountNumber}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">IBAN</label>
                  <input
                    type="text"
                    className="form-control"
                    value={invoiceData.bankAccountIBAN}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, bankAccountIBAN: e.target.value }))}
                  />
          </div>
                <div className="form-group">
                  <label className="form-label">SWIFT Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={invoiceData.swiftCode}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, swiftCode: e.target.value }))}
                  />
        </div>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">ملاحظات</label>
            <textarea
              className="form-control"
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/invoices')}
            >
              <FaTimes /> إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <FaSave />
                  <span>حفظ الفاتورة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      {importedInvoices.length > 0 && (
        <div className="card" style={{marginTop: 24, background: '#f9f9f9'}}>
          <h3 style={{color: '#2d3e50'}}>مراجعة الفواتير المستوردة ({importedInvoices.length})</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>تاريخ الفاتورة</th>
                  <th>اسم العميل</th>
                  <th>الرقم الضريبي</th>
                  <th>العنوان</th>
                  <th>عدد الأصناف</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {importedInvoices.map((inv, idx) => (
                  <tr key={idx}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{inv.invoiceDate}</td>
                    <td>{inv.customerName}</td>
                    <td>{inv.customerTaxNumber}</td>
                    <td>{inv.customerAddress}</td>
                    <td>{inv.items.length}</td>
                    <td>{inv.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" onClick={handleBulkSave} disabled={loading} style={{marginTop: 12}}>
            {loading ? 'جاري الحفظ...' : 'حفظ وإرسال جميع الفواتير'}
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;
