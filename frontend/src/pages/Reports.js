import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * مكون صفحة التقارير - يعرض تقارير المبيعات والمشتريات والضرائب
 */
const Reports = ({ showNotification }) => {
  // فترة التقرير
  const [reportPeriod, setReportPeriod] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // نوع التقرير المحدد
  const [reportType, setReportType] = useState('sales');
  
  // بيانات التقارير
  const [salesData, setSalesData] = useState([]);
  const [purchasesData, setPurchasesData] = useState([]);
  const [taxData, setTaxData] = useState({
    salesTax: 0,
    purchasesTax: 0,
    previousBalance: 0,
    currentBalance: 0
  });
  
  // حالة تحميل البيانات
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // تنسيق العملة
  const formatCurrency = (amount) => {
    return amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
  };
  
  // تحميل بيانات التقارير عند تغيير الفترة أو نوع التقرير
  useEffect(() => {
    fetchReportData();
  }, [reportPeriod, reportType]);
  
  // تحميل بيانات التقارير
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // استبدل هذا بطلب API فعلي
      // محاكاة تأخير الشبكة
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // بيانات تجريبية للعرض
      if (reportType === 'sales' || reportType === 'tax') {
        const mockSalesData = [
          { id: 1, invoice_number: 'INV-001', date: '2025-05-01', client_name: 'شركة الأمل للتجارة', amount: 11800, tax: 1400, status: 'مرسلة' },
          { id: 2, invoice_number: 'INV-002', date: '2025-05-03', client_name: 'مؤسسة النور', amount: 5700, tax: 700, status: 'مرسلة' },
          { id: 3, invoice_number: 'INV-003', date: '2025-05-07', client_name: 'شركة المستقبل', amount: 18500, tax: 2500, status: 'مرسلة' },
          { id: 4, invoice_number: 'INV-004', date: '2025-05-10', client_name: 'مؤسسة الإبداع', amount: 8200, tax: 1200, status: 'مرسلة' },
          { id: 5, invoice_number: 'INV-005', date: '2025-05-15', client_name: 'شركة التقدم', amount: 14500, tax: 1900, status: 'مرسلة' }
        ];
        setSalesData(mockSalesData);
      }
      
      if (reportType === 'purchases' || reportType === 'tax') {
        const mockPurchasesData = [
          { id: 1, invoice_number: 'PINV-001', date: '2025-05-02', supplier_name: 'شركة التوريدات العامة', amount: 8500, tax: 1100, status: 'مستلمة' },
          { id: 2, invoice_number: 'PINV-002', date: '2025-05-05', supplier_name: 'مؤسسة الإمداد', amount: 4200, tax: 600, status: 'مستلمة' },
          { id: 3, invoice_number: 'PINV-003', date: '2025-05-09', supplier_name: 'شركة المستلزمات', amount: 12000, tax: 1600, status: 'مستلمة' },
          { id: 4, invoice_number: 'PINV-004', date: '2025-05-12', supplier_name: 'مؤسسة التجهيزات', amount: 6300, tax: 900, status: 'مستلمة' }
        ];
        setPurchasesData(mockPurchasesData);
      }
      
      if (reportType === 'tax') {
        const totalSalesTax = 7700; // مجموع ضرائب المبيعات
        const totalPurchasesTax = 4200; // مجموع ضرائب المشتريات
        const previousBalance = 12000; // رصيد الفترة السابقة
        
        setTaxData({
          salesTax: totalSalesTax,
          purchasesTax: totalPurchasesTax,
          previousBalance: previousBalance,
          currentBalance: previousBalance + totalSalesTax - totalPurchasesTax
        });
      }
    } catch (err) {
      setError('حدث خطأ أثناء تحميل بيانات التقرير');
      showNotification('حدث خطأ أثناء تحميل بيانات التقرير', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // تصدير التقرير
  const exportReport = () => {
    showNotification('جاري تصدير التقرير...', 'info');
    
    // محاكاة تأخير التصدير
    setTimeout(() => {
      showNotification('تم تصدير التقرير بنجاح', 'success');
    }, 1500);
  };
  
  // تغيير فترة التقرير
  const handlePeriodChange = (e) => {
    const { name, value } = e.target;
    setReportPeriod(prev => ({ ...prev, [name]: value }));
  };
  
  // تغيير نوع التقرير
  const handleReportTypeChange = (type) => {
    setReportType(type);
  };
  
  // عرض تقرير المبيعات
  const renderSalesReport = () => {
    return (
      <div className="report-content">
        <h3>تقرير المبيعات</h3>
        
        {salesData.length === 0 ? (
          <div className="empty-state">
            <p>لا توجد بيانات للفترة المحددة</p>
          </div>
        ) : (
          <>
            <div className="report-summary">
              <div className="summary-card">
                <h4>إجمالي المبيعات</h4>
                <div className="summary-value">
                  {formatCurrency(salesData.reduce((sum, item) => sum + item.amount, 0))}
                </div>
              </div>
              <div className="summary-card">
                <h4>إجمالي الضرائب</h4>
                <div className="summary-value">
                  {formatCurrency(salesData.reduce((sum, item) => sum + item.tax, 0))}
                </div>
              </div>
              <div className="summary-card">
                <h4>عدد الفواتير</h4>
                <div className="summary-value">{salesData.length}</div>
              </div>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th>
                    <th>التاريخ</th>
                    <th>العميل</th>
                    <th>المبلغ</th>
                    <th>الضريبة</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map(invoice => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{invoice.date}</td>
                      <td>{invoice.client_name}</td>
                      <td>{formatCurrency(invoice.amount - invoice.tax)}</td>
                      <td>{formatCurrency(invoice.tax)}</td>
                      <td>{formatCurrency(invoice.amount)}</td>
                      <td>
                        <span className={`status-badge ${invoice.status === 'مرسلة' ? 'success' : 'pending'}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>الإجمالي</strong></td>
                    <td><strong>{formatCurrency(salesData.reduce((sum, item) => sum + (item.amount - item.tax), 0))}</strong></td>
                    <td><strong>{formatCurrency(salesData.reduce((sum, item) => sum + item.tax, 0))}</strong></td>
                    <td><strong>{formatCurrency(salesData.reduce((sum, item) => sum + item.amount, 0))}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };
  
  // عرض تقرير المشتريات
  const renderPurchasesReport = () => {
    return (
      <div className="report-content">
        <h3>تقرير المشتريات</h3>
        
        {purchasesData.length === 0 ? (
          <div className="empty-state">
            <p>لا توجد بيانات للفترة المحددة</p>
          </div>
        ) : (
          <>
            <div className="report-summary">
              <div className="summary-card">
                <h4>إجمالي المشتريات</h4>
                <div className="summary-value">
                  {formatCurrency(purchasesData.reduce((sum, item) => sum + item.amount, 0))}
                </div>
              </div>
              <div className="summary-card">
                <h4>إجمالي الضرائب</h4>
                <div className="summary-value">
                  {formatCurrency(purchasesData.reduce((sum, item) => sum + item.tax, 0))}
                </div>
              </div>
              <div className="summary-card">
                <h4>عدد الفواتير</h4>
                <div className="summary-value">{purchasesData.length}</div>
              </div>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th>
                    <th>التاريخ</th>
                    <th>المورد</th>
                    <th>المبلغ</th>
                    <th>الضريبة</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasesData.map(invoice => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{invoice.date}</td>
                      <td>{invoice.supplier_name}</td>
                      <td>{formatCurrency(invoice.amount - invoice.tax)}</td>
                      <td>{formatCurrency(invoice.tax)}</td>
                      <td>{formatCurrency(invoice.amount)}</td>
                      <td>
                        <span className={`status-badge ${invoice.status === 'مستلمة' ? 'success' : 'pending'}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>الإجمالي</strong></td>
                    <td><strong>{formatCurrency(purchasesData.reduce((sum, item) => sum + (item.amount - item.tax), 0))}</strong></td>
                    <td><strong>{formatCurrency(purchasesData.reduce((sum, item) => sum + item.tax, 0))}</strong></td>
                    <td><strong>{formatCurrency(purchasesData.reduce((sum, item) => sum + item.amount, 0))}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };
  
  // عرض تقرير الضرائب
  const renderTaxReport = () => {
    return (
      <div className="report-content">
        <h3>تقرير الضرائب</h3>
        
        <div className="tax-summary">
          <div className="tax-summary-section">
            <h4>ملخص الضرائب للفترة من {reportPeriod.startDate} إلى {reportPeriod.endDate}</h4>
            
            <div className="tax-summary-grid">
              <div className="tax-summary-card">
                <div className="tax-summary-title">ضرائب المبيعات</div>
                <div className="tax-summary-value">{formatCurrency(taxData.salesTax)}</div>
              </div>
              
              <div className="tax-summary-card">
                <div className="tax-summary-title">ضرائب المشتريات</div>
                <div className="tax-summary-value">{formatCurrency(taxData.purchasesTax)}</div>
              </div>
              
              <div className="tax-summary-card">
                <div className="tax-summary-title">رصيد الفترة السابقة</div>
                <div className="tax-summary-value">{formatCurrency(taxData.previousBalance)}</div>
              </div>
              
              <div className="tax-summary-card highlight">
                <div className="tax-summary-title">رصيد مصلحة الضرائب</div>
                <div className="tax-summary-value">{formatCurrency(taxData.currentBalance)}</div>
              </div>
            </div>
            
            <div className="tax-calculation">
              <p>
                <strong>طريقة الحساب:</strong> رصيد الفترة السابقة ({formatCurrency(taxData.previousBalance)}) + 
                ضرائب المبيعات ({formatCurrency(taxData.salesTax)}) - 
                ضرائب المشتريات ({formatCurrency(taxData.purchasesTax)}) = 
                رصيد مصلحة الضرائب ({formatCurrency(taxData.currentBalance)})
              </p>
            </div>
          </div>
          
          <div className="tax-details">
            <h4>تفاصيل الضرائب</h4>
            
            <div className="tax-tabs">
              <div className="tab-header">
                <button 
                  className={`tab-btn ${reportType === 'tax-sales' ? 'active' : ''}`}
                  onClick={() => setReportType('tax-sales')}
                >
                  ضرائب المبيعات
                </button>
                <button 
                  className={`tab-btn ${reportType === 'tax-purchases' ? 'active' : ''}`}
                  onClick={() => setReportType('tax-purchases')}
                >
                  ضرائب المشتريات
                </button>
              </div>
              
              <div className="tab-content">
                {reportType === 'tax-sales' ? (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>رقم الفاتورة</th>
                          <th>التاريخ</th>
                          <th>العميل</th>
                          <th>قيمة الضريبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.map(invoice => (
                          <tr key={invoice.id}>
                            <td>{invoice.invoice_number}</td>
                            <td>{invoice.date}</td>
                            <td>{invoice.client_name}</td>
                            <td>{formatCurrency(invoice.tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3"><strong>الإجمالي</strong></td>
                          <td><strong>{formatCurrency(salesData.reduce((sum, item) => sum + item.tax, 0))}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>رقم الفاتورة</th>
                          <th>التاريخ</th>
                          <th>المورد</th>
                          <th>قيمة الضريبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchasesData.map(invoice => (
                          <tr key={invoice.id}>
                            <td>{invoice.invoice_number}</td>
                            <td>{invoice.date}</td>
                            <td>{invoice.supplier_name}</td>
                            <td>{formatCurrency(invoice.tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3"><strong>الإجمالي</strong></td>
                          <td><strong>{formatCurrency(purchasesData.reduce((sum, item) => sum + item.tax, 0))}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="reports-container">
      <h1>التقارير</h1>
      
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      
      <div className="card">
        <div className="report-controls">
          <div className="report-period">
            <div className="form-group">
              <label htmlFor="startDate" className="form-label">من تاريخ</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                className="form-control"
                value={reportPeriod.startDate}
                onChange={handlePeriodChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="endDate" className="form-label">إلى تاريخ</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                className="form-control"
                value={reportPeriod.endDate}
                onChange={handlePeriodChange}
              />
            </div>
          </div>
          
          <div className="report-actions">
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={fetchReportData}
              disabled={loading}
            >
              {loading ? 'جاري التحميل...' : 'تحديث التقرير'}
            </button>
            
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={exportReport}
              disabled={loading}
            >
              <span className="icon">📥</span> تصدير التقرير
            </button>
          </div>
        </div>
        
        <div className="report-tabs">
          <div className="tab-header">
            <button 
              className={`tab-btn ${reportType === 'sales' ? 'active' : ''}`}
              onClick={() => handleReportTypeChange('sales')}
            >
              المبيعات
            </button>
            <button 
              className={`tab-btn ${reportType === 'purchases' ? 'active' : ''}`}
              onClick={() => handleReportTypeChange('purchases')}
            >
              المشتريات
            </button>
            <button 
              className={`tab-btn ${reportType === 'tax' ? 'active' : ''}`}
              onClick={() => handleReportTypeChange('tax')}
            >
              الضرائب
            </button>
          </div>
          
          <div className="tab-content">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>جاري تحميل البيانات...</p>
              </div>
            ) : (
              <>
                {reportType === 'sales' && renderSalesReport()}
                {reportType === 'purchases' && renderPurchasesReport()}
                {reportType === 'tax' && renderTaxReport()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Reports.propTypes = {
  showNotification: PropTypes.func.isRequired
};

export default Reports;
