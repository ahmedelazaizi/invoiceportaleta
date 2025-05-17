import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Notification from '../components/Notification';

/**
 * مكون نموذج الفاتورة - يتيح إنشاء وتعديل الفواتير بواجهة سهلة الاستخدام
 */
const InvoiceForm = ({ showNotification }) => {
  // بيانات الفاتورة الأساسية
  const [invoice, setInvoice] = useState({
    invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_tax_number: '',
    client_type: 'B',
    activity_code: '',
    notes: '',
    payment_method: 'cash',
    currency: 'EGP'
  });

  // بنود الفاتورة
  const [items, setItems] = useState([{
    item_code: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 14,
    discount: 0
  }]);

  // إجماليات الفاتورة
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0
  });

  // حالة تحميل البيانات
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // الخطوة الحالية في النموذج متعدد الخطوات
  const [currentStep, setCurrentStep] = useState(1);
  
  // قائمة العملاء للاختيار
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  
  // قائمة المنتجات للاختيار
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // تحميل بيانات العملاء والمنتجات عند تحميل الصفحة
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        // استبدل هذا بطلب API فعلي
        // const response = await fetch('/api/clients');
        // const data = await response.json();
        // setClients(data);
        
        // بيانات تجريبية للعرض
        setTimeout(() => {
          setClients([
            { id: 1, name: 'شركة الأمل للتجارة', tax_number: '123456789', email: 'info@alamal.com' },
            { id: 2, name: 'مؤسسة النور', tax_number: '987654321', email: 'info@alnoor.com' },
            { id: 3, name: 'شركة المستقبل', tax_number: '456789123', email: 'info@future.com' }
          ]);
          setLoadingClients(false);
        }, 500);
      } catch (err) {
        setError('حدث خطأ أثناء تحميل بيانات العملاء');
        setLoadingClients(false);
      }
    };

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        // استبدل هذا بطلب API فعلي
        // const response = await fetch('/api/products');
        // const data = await response.json();
        // setProducts(data);
        
        // بيانات تجريبية للعرض
        setTimeout(() => {
          setProducts([
            { id: 1, code: 'P001', name: 'لابتوب', price: 15000, tax_rate: 14 },
            { id: 2, code: 'P002', name: 'طابعة', price: 3000, tax_rate: 14 },
            { id: 3, code: 'P003', name: 'هاتف ذكي', price: 8000, tax_rate: 14 },
            { id: 4, code: 'S001', name: 'خدمة صيانة', price: 500, tax_rate: 14 }
          ]);
          setLoadingProducts(false);
        }, 700);
      } catch (err) {
        setError('حدث خطأ أثناء تحميل بيانات المنتجات');
        setLoadingProducts(false);
      }
    };

    fetchClients();
    fetchProducts();
  }, []);

  // حساب إجماليات الفاتورة عند تغيير البنود
  useEffect(() => {
    calculateTotals();
  }, [items]);

  // حساب إجماليات الفاتورة
  const calculateTotals = () => {
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = (itemTotal * item.discount) / 100;
      const itemTax = ((itemTotal - itemDiscount) * item.tax_rate) / 100;

      subtotal += itemTotal;
      discount_amount += itemDiscount;
      tax_amount += itemTax;
    });

    const total_amount = subtotal - discount_amount + tax_amount;

    setTotals({
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(tax_amount.toFixed(2)),
      discount_amount: parseFloat(discount_amount.toFixed(2)),
      total_amount: parseFloat(total_amount.toFixed(2))
    });
  };

  // تحديث بيانات الفاتورة
  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoice(prev => ({ ...prev, [name]: value }));
  };

  // اختيار عميل من القائمة
  const handleClientSelect = (clientId) => {
    const selectedClient = clients.find(client => client.id === parseInt(clientId));
    if (selectedClient) {
      setInvoice(prev => ({
        ...prev,
        client_name: selectedClient.name,
        client_email: selectedClient.email,
        client_tax_number: selectedClient.tax_number
      }));
    }
  };

  // تحديث بند في الفاتورة
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [name]: name === 'quantity' || name === 'unit_price' || name === 'tax_rate' || name === 'discount' ? parseFloat(value) || 0 : value };
    setItems(newItems);
  };

  // اختيار منتج من القائمة
  const handleProductSelect = (index, productId) => {
    const selectedProduct = products.find(product => product.id === parseInt(productId));
    if (selectedProduct) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        item_code: selectedProduct.code,
        description: selectedProduct.name,
        unit_price: selectedProduct.price,
        tax_rate: selectedProduct.tax_rate
      };
      setItems(newItems);
    }
  };

  // إضافة بند جديد للفاتورة
  const addItem = () => {
    setItems([...items, {
      item_code: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 14,
      discount: 0
    }]);
  };

  // حذف بند من الفاتورة
  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    } else {
      setError('يجب أن تحتوي الفاتورة على بند واحد على الأقل');
      setTimeout(() => setError(''), 3000);
    }
  };

  // الانتقال للخطوة التالية
  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) {
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  // الرجوع للخطوة السابقة
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // التحقق من صحة بيانات الخطوة الأولى
  const validateStep1 = () => {
    if (!invoice.invoice_number) {
      setError('يرجى إدخال رقم الفاتورة');
      return false;
    }
    if (!invoice.issue_date) {
      setError('يرجى إدخال تاريخ الإصدار');
      return false;
    }
    if (!invoice.client_name) {
      setError('يرجى إدخال اسم العميل');
      return false;
    }
    setError('');
    return true;
  };

  // إرسال الفاتورة
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // استبدل هذا بطلب API فعلي
      // const response = await fetch('/api/invoices', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     ...invoice,
      //     items,
      //     totals
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error('فشل في إنشاء الفاتورة');
      // }
      
      // محاكاة استجابة API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess('تم إنشاء الفاتورة بنجاح');
      showNotification('تم إنشاء الفاتورة بنجاح', 'success');
      
      // إعادة تعيين النموذج
      setInvoice({
        invoice_number: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        client_tax_number: '',
        client_type: 'B',
        activity_code: '',
        notes: '',
        payment_method: 'cash',
        currency: 'EGP'
      });
      
      setItems([{
        item_code: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 14,
        discount: 0
      }]);
      
      setCurrentStep(1);
    } catch (err) {
      setError('حدث خطأ أثناء إنشاء الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-form-container">
      <h1>إنشاء فاتورة جديدة</h1>
      
      {/* شريط الخطوات */}
      <div className="stepper">
        <div className={`step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">معلومات العميل</div>
        </div>
        <div className={`step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">بنود الفاتورة</div>
        </div>
        <div className={`step ${currentStep === 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">المراجعة والإرسال</div>
        </div>
      </div>
      
      {/* رسائل الخطأ والنجاح */}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="alert">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* الخطوة 1: معلومات العميل */}
        {currentStep === 1 && (
          <div className="card">
            <h2>معلومات العميل والفاتورة</h2>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="invoice_number" className="form-label">رقم الفاتورة *</label>
                  <input
                    type="text"
                    id="invoice_number"
                    name="invoice_number"
                    className="form-control"
                    value={invoice.invoice_number}
                    onChange={handleInvoiceChange}
                    required
                    aria-required="true"
                  />
                </div>
              </div>
              
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="issue_date" className="form-label">تاريخ الإصدار *</label>
                  <input
                    type="date"
                    id="issue_date"
                    name="issue_date"
                    className="form-control"
                    value={invoice.issue_date}
                    onChange={handleInvoiceChange}
                    required
                    aria-required="true"
                  />
                </div>
              </div>
              
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="due_date" className="form-label">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    className="form-control"
                    value={invoice.due_date}
                    onChange={handleInvoiceChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="client_select" className="form-label">اختر عميل</label>
              <select
                id="client_select"
                className="form-control"
                onChange={(e) => handleClientSelect(e.target.value)}
                disabled={loadingClients}
              >
                <option value="">-- اختر عميل --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              {loadingClients && <div className="form-hint">جاري تحميل بيانات العملاء...</div>}
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="client_name" className="form-label">اسم العميل *</label>
                  <input
                    type="text"
                    id="client_name"
                    name="client_name"
                    className="form-control"
                    value={invoice.client_name}
                    onChange={handleInvoiceChange}
                    required
                    aria-required="true"
                  />
                </div>
              </div>
              
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="client_tax_number" className="form-label">الرقم الضريبي للعميل</label>
                  <input
                    type="text"
                    id="client_tax_number"
                    name="client_tax_number"
                    className="form-control"
                    value={invoice.client_tax_number}
                    onChange={handleInvoiceChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="client_email" className="form-label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    id="client_email"
                    name="client_email"
                    className="form-control"
                    value={invoice.client_email}
                    onChange={handleInvoiceChange}
                  />
                </div>
              </div>
              
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="client_phone" className="form-label">رقم الهاتف</label>
                  <input
                    type="tel"
                    id="client_phone"
                    name="client_phone"
                    className="form-control"
                    value={invoice.client_phone}
                    onChange={handleInvoiceChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="client_address" className="form-label">العنوان</label>
              <textarea
                id="client_address"
                name="client_address"
                className="form-control"
                value={invoice.client_address}
                onChange={handleInvoiceChange}
                rows="2"
              ></textarea>
            </div>
            
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="client_type" className="form-label">نوع العميل</label>
                  <select
                    id="client_type"
                    name="client_type"
                    className="form-control"
                    value={invoice.client_type}
                    onChange={handleInvoiceChange}
                  >
                    <option value="B">شركة</option>
                    <option value="P">فرد</option>
                    <option value="F">أجنبي</option>
                  </select>
                </div>
              </div>
              
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="activity_code" className="form-label">كود النشاط</label>
                  <input
                    type="text"
                    id="activity_code"
                    name="activity_code"
                    className="form-control"
                    value={invoice.activity_code}
                    onChange={handleInvoiceChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                التالي <span className="icon">→</span>
              </button>
            </div>
          </div>
        )}
        
        {/* الخطوة 2: بنود الفاتورة */}
        {currentStep === 2 && (
          <div className="card">
            <h2>بنود الفاتورة</h2>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '15%' }}>كود المنتج</th>
                    <th style={{ width: '25%' }}>الوصف</th>
                    <th style={{ width: '10%' }}>الكمية</th>
                    <th style={{ width: '15%' }}>السعر</th>
                    <th style={{ width: '10%' }}>الضريبة %</th>
                    <th style={{ width: '10%' }}>الخصم %</th>
                    <th style={{ width: '10%' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <select
                          className="form-control"
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          disabled={loadingProducts}
                        >
                          <option value="">-- اختر منتج --</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>{product.code} - {product.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          name="description"
                          className="form-control"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, e)}
                          placeholder="وصف المنتج"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="quantity"
                          className="form-control"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, e)}
                          min="1"
                          step="1"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="unit_price"
                          className="form-control"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, e)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="tax_rate"
                          className="form-control"
                          value={item.tax_rate}
                          onChange={(e) => handleItemChange(index, e)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          name="discount"
                          className="form-control"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, e)}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-icon"
                          onClick={() => removeItem(index)}
                          aria-label="حذف البند"
                          title="حذف البند"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={addItem}>
                <span className="icon">+</span> إضافة بند
              </button>
            </div>
            
            <div className="invoice-summary">
              <div className="summary-row">
                <span className="summary-label">الإجمالي قبل الضريبة:</span>
                <span className="summary-value">{totals.subtotal.toLocaleString()} جنيه</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">قيمة الخصم:</span>
                <span className="summary-value">{totals.discount_amount.toLocaleString()} جنيه</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">قيمة الضريبة:</span>
                <span className="summary-value">{totals.tax_amount.toLocaleString()} جنيه</span>
              </div>
              <div className="summary-row total">
                <span className="summary-label">الإجمالي:</span>
                <span className="summary-value">{totals.total_amount.toLocaleString()} جنيه</span>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={prevStep}>
                <span className="icon">←</span> السابق
              </button>
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                التالي <span className="icon">→</span>
              </button>
            </div>
          </div>
        )}
        
        {/* الخطوة 3: المراجعة والإرسال */}
        {currentStep === 3 && (
          <div className="card">
            <h2>مراجعة الفاتورة</h2>
            
            <div className="invoice-preview">
              <div className="preview-section">
                <h3>معلومات الفاتورة</h3>
                <div className="preview-row">
                  <span className="preview-label">رقم الفاتورة:</span>
                  <span className="preview-value">{invoice.invoice_number}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">تاريخ الإصدار:</span>
                  <span className="preview-value">{invoice.issue_date}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">تاريخ الاستحقاق:</span>
                  <span className="preview-value">{invoice.due_date || 'غير محدد'}</span>
                </div>
              </div>
              
              <div className="preview-section">
                <h3>معلومات العميل</h3>
                <div className="preview-row">
                  <span className="preview-label">اسم العميل:</span>
                  <span className="preview-value">{invoice.client_name}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">الرقم الضريبي:</span>
                  <span className="preview-value">{invoice.client_tax_number || 'غير محدد'}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">البريد الإلكتروني:</span>
                  <span className="preview-value">{invoice.client_email || 'غير محدد'}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">رقم الهاتف:</span>
                  <span className="preview-value">{invoice.client_phone || 'غير محدد'}</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">العنوان:</span>
                  <span className="preview-value">{invoice.client_address || 'غير محدد'}</span>
                </div>
              </div>
              
              <div className="preview-section">
                <h3>بنود الفاتورة</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>الوصف</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الضريبة %</th>
                        <th>الخصم %</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const itemTotal = item.quantity * item.unit_price;
                        const itemDiscount = (itemTotal * item.discount) / 100;
                        const itemTax = ((itemTotal - itemDiscount) * item.tax_rate) / 100;
                        const itemFinalTotal = itemTotal - itemDiscount + itemTax;
                        
                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{item.description}</td>
                            <td>{item.quantity}</td>
                            <td>{item.unit_price.toLocaleString()}</td>
                            <td>{item.tax_rate}%</td>
                            <td>{item.discount}%</td>
                            <td>{itemFinalTotal.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="preview-section">
                <h3>ملخص الفاتورة</h3>
                <div className="preview-row">
                  <span className="preview-label">الإجمالي قبل الضريبة:</span>
                  <span className="preview-value">{totals.subtotal.toLocaleString()} جنيه</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">قيمة الخصم:</span>
                  <span className="preview-value">{totals.discount_amount.toLocaleString()} جنيه</span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">قيمة الضريبة:</span>
                  <span className="preview-value">{totals.tax_amount.toLocaleString()} جنيه</span>
                </div>
                <div className="preview-row total">
                  <span className="preview-label">الإجمالي:</span>
                  <span className="preview-value">{totals.total_amount.toLocaleString()} جنيه</span>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes" className="form-label">ملاحظات</label>
              <textarea
                id="notes"
                name="notes"
                className="form-control"
                value={invoice.notes}
                onChange={handleInvoiceChange}
                rows="3"
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={prevStep}>
                <span className="icon">←</span> السابق
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'جاري الإرسال...' : 'إنشاء الفاتورة'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

InvoiceForm.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default InvoiceForm;
