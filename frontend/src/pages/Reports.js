import React, { useState } from 'react';
import './Reports.css';

const Reports = () => {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [reportType, setReportType] = useState('sales');
  const [reportData, setReportData] = useState(null);

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const handleReportTypeChange = (e) => {
    setReportType(e.target.value);
    setReportData(null);
  };

  const generateReport = async () => {
    try {
      // طلب API لجلب بيانات التقرير حسب النوع
      const response = await fetch(`/api/reports/${reportType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dateRange),
      });
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const printReport = () => {
    window.print();
  };

  const exportToExcel = () => {
    if (!reportData) return;
    let csv = '';
    if (reportType === 'sales') {
      csv += 'رقم الفاتورة,التاريخ,اسم العميل,رقم التسجيل الضريبي,قيمة الفاتورة,قيمة الضريبة,الإجمالي\n';
      reportData.invoices.forEach(inv => {
        csv += `${inv.number},${inv.date},${inv.customer},${inv.customerVat},${inv.amount},${inv.tax},${inv.total}\n`;
      });
    } else if (reportType === 'purchases') {
      csv += 'رقم الفاتورة,التاريخ,اسم المورد,رقم التسجيل الضريبي,قيمة الفاتورة,قيمة الضريبة,الإجمالي\n';
      reportData.invoices.forEach(inv => {
        csv += `${inv.number},${inv.date},${inv.supplier},${inv.supplierVat},${inv.amount},${inv.tax},${inv.total}\n`;
      });
    } else if (reportType === 'items') {
      csv += 'نوع الحركة,كود الصنف,اسم الصنف,الكمية,رقم الفاتورة,تاريخ الفاتورة\n';
      reportData.inItems?.forEach(item => {
        csv += `وارد,${item.code},${item.name},${item.qty},${item.invoiceNumber},${item.invoiceDate}\n`;
      });
      reportData.outItems?.forEach(item => {
        csv += `منصرف,${item.code},${item.name},${item.qty},${item.invoiceNumber},${item.invoiceDate}\n`;
      });
    } else if (reportType === 'taxes') {
      csv += 'نوع الضريبة,رقم الفاتورة,التاريخ,الطرف,رقم التسجيل الضريبي,قيمة الفاتورة,قيمة الضريبة,الإجمالي\n';
      reportData.salesTaxes?.forEach(row => {
        csv += `مبيعات,${row.number},${row.date},${row.customer},${row.customerVat},${row.amount},${row.tax},${row.total}\n`;
      });
      reportData.purchaseTaxes?.forEach(row => {
        csv += `مشتريات,${row.number},${row.date},${row.supplier},${row.supplierVat},${row.amount},${row.tax},${row.total}\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2>التقارير</h2>
        <div className="report-actions">
          <button onClick={printReport} className="action-btn print">
            طباعة التقرير
          </button>
          <button onClick={exportToExcel} className="action-btn export">
            تصدير إلى Excel
          </button>
        </div>
      </div>

      <div className="reports-filters">
        <div className="filter-group">
          <label>نوع التقرير:</label>
          <select value={reportType} onChange={handleReportTypeChange}>
            <option value="sales">تقرير المبيعات</option>
            <option value="purchases">تقرير المشتريات</option>
            <option value="items">تقرير الأصناف</option>
            <option value="taxes">تقرير الضرائب</option>
          </select>
        </div>

        <div className="filter-group">
          <label>من تاريخ:</label>
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
          />
        </div>

        <div className="filter-group">
          <label>إلى تاريخ:</label>
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
          />
        </div>

        <button onClick={generateReport} className="action-btn generate">
          عرض التقرير
        </button>
      </div>

      {reportData && reportType === 'sales' && (
        <div className="report-content">
          <div className="report-summary">
            <div className="summary-item">
              <label>إجمالي المبيعات:</label>
              <span>{reportData.totalSales?.toFixed(2)} جنيه</span>
            </div>
            <div className="summary-item">
              <label>إجمالي الضرائب:</label>
              <span>{reportData.totalTaxes?.toFixed(2)} جنيه</span>
            </div>
            <div className="summary-item">
              <label>عدد الفواتير:</label>
              <span>{reportData.invoiceCount}</span>
            </div>
          </div>

          <div className="report-table">
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>اسم العميل</th>
                  <th>رقم التسجيل الضريبي</th>
                  <th>قيمة الفاتورة</th>
                  <th>قيمة الضريبة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {reportData.invoices?.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.number}</td>
                    <td>{invoice.date}</td>
                    <td>{invoice.customer}</td>
                    <td>{invoice.customerVat}</td>
                    <td>{invoice.amount.toFixed(2)}</td>
                    <td>{invoice.tax.toFixed(2)}</td>
                    <td>{invoice.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && reportType === 'purchases' && (
        <div className="report-content">
          <div className="report-summary">
            <div className="summary-item">
              <label>إجمالي المشتريات:</label>
              <span>{reportData.totalPurchases?.toFixed(2)} جنيه</span>
            </div>
            <div className="summary-item">
              <label>إجمالي الضرائب:</label>
              <span>{reportData.totalTaxes?.toFixed(2)} جنيه</span>
            </div>
            <div className="summary-item">
              <label>عدد الفواتير:</label>
              <span>{reportData.invoiceCount}</span>
            </div>
          </div>

          <div className="report-table">
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>اسم المورد</th>
                  <th>رقم التسجيل الضريبي</th>
                  <th>قيمة الفاتورة</th>
                  <th>قيمة الضريبة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {reportData.invoices?.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.number}</td>
                    <td>{invoice.date}</td>
                    <td>{invoice.supplier}</td>
                    <td>{invoice.supplierVat}</td>
                    <td>{invoice.amount.toFixed(2)}</td>
                    <td>{invoice.tax.toFixed(2)}</td>
                    <td>{invoice.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && reportType === 'items' && (
        <div className="report-content">
          <div className="report-summary">
            <div className="summary-item">
              <label>إجمالي الأصناف الواردة:</label>
              <span>{reportData.totalInItems}</span>
            </div>
            <div className="summary-item">
              <label>إجمالي الأصناف المنصرفة:</label>
              <span>{reportData.totalOutItems}</span>
            </div>
          </div>

          <div className="report-table">
            <h4>الأصناف الواردة (من الفواتير المستلمة)</h4>
            <table>
              <thead>
                <tr>
                  <th>كود الصنف</th>
                  <th>اسم الصنف</th>
                  <th>الكمية الواردة</th>
                  <th>رقم الفاتورة</th>
                  <th>تاريخ الفاتورة</th>
                </tr>
              </thead>
              <tbody>
                {reportData.inItems?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{item.invoiceNumber}</td>
                    <td>{item.invoiceDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{marginTop: '32px'}}>الأصناف المنصرفة (من الفواتير المرسلة)</h4>
            <table>
              <thead>
                <tr>
                  <th>كود الصنف</th>
                  <th>اسم الصنف</th>
                  <th>الكمية المنصرفة</th>
                  <th>رقم الفاتورة</th>
                  <th>تاريخ الفاتورة</th>
                </tr>
              </thead>
              <tbody>
                {reportData.outItems?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{item.invoiceNumber}</td>
                    <td>{item.invoiceDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && reportType === 'taxes' && (
        <div className="report-content">
          <div className="report-summary">
            <div className="summary-item">
              <label>إجمالي ضرائب المبيعات:</label>
              <span>{reportData.totalSalesTaxes?.toFixed(2)} جنيه</span>
            </div>
            <div className="summary-item">
              <label>إجمالي ضرائب المشتريات:</label>
              <span>{reportData.totalPurchaseTaxes?.toFixed(2)} جنيه</span>
            </div>
          </div>

          <div className="report-table">
            <h4>ضرائب المبيعات (من الفواتير المرسلة)</h4>
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>اسم العميل</th>
                  <th>رقم التسجيل الضريبي</th>
                  <th>قيمة الفاتورة</th>
                  <th>قيمة الضريبة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {reportData.salesTaxes?.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.number}</td>
                    <td>{row.date}</td>
                    <td>{row.customer}</td>
                    <td>{row.customerVat}</td>
                    <td>{row.amount.toFixed(2)}</td>
                    <td>{row.tax.toFixed(2)}</td>
                    <td>{row.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{marginTop: '32px'}}>ضرائب المشتريات (من الفواتير المستلمة)</h4>
            <table>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>اسم المورد</th>
                  <th>رقم التسجيل الضريبي</th>
                  <th>قيمة الفاتورة</th>
                  <th>قيمة الضريبة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {reportData.purchaseTaxes?.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.number}</td>
                    <td>{row.date}</td>
                    <td>{row.supplier}</td>
                    <td>{row.supplierVat}</td>
                    <td>{row.amount.toFixed(2)}</td>
                    <td>{row.tax.toFixed(2)}</td>
                    <td>{row.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports; 