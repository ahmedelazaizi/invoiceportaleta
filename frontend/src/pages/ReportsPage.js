import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaFilePdf, FaDownload, FaFilter } from 'react-icons/fa';
import './ReportsPage.css';

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    type: 'sales', // sales or purchases
    startDate: '',
    endDate: '',
    status: 'all', // all, approved, pending, rejected
    customerId: ''
  });
  const [customers, setCustomers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchReports();
  }, [filters]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('http://localhost:8000/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      setError('حدث خطأ في جلب بيانات العملاء');
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: filters.type,
        start_date: filters.startDate,
        end_date: filters.endDate,
        status: filters.status,
        customer_id: filters.customerId
      });

      const response = await fetch(`http://localhost:8000/reports?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        setError('حدث خطأ في جلب التقارير');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (supplier) => {
    setSelectedSupplier(supplier);
    // هنا يمكنك إضافة منطق تغيير بيانات الممول
  };

  const exportToExcel = async () => {
    try {
      const queryParams = new URLSearchParams({
        type: filters.type,
        start_date: filters.startDate,
        end_date: filters.endDate,
        status: filters.status,
        customer_id: filters.customerId,
        format: 'excel'
      });

      const response = await fetch(`http://localhost:8000/reports/export?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_${filters.type}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('حدث خطأ في تصدير التقرير');
    }
  };

  const exportToPDF = async () => {
    try {
      const queryParams = new URLSearchParams({
        type: filters.type,
        start_date: filters.startDate,
        end_date: filters.endDate,
        status: filters.status,
        customer_id: filters.customerId,
        format: 'pdf'
      });

      const response = await fetch(`http://localhost:8000/reports/export?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_${filters.type}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('حدث خطأ في تصدير التقرير');
    }
  };

  return (
    <div className="reports-page">
      <div className="card">
        <div className="card-header">
          <h2>التقارير</h2>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={exportToExcel}>
              <FaFileExcel />
              <span>تصدير Excel</span>
            </button>
            <button className="btn btn-primary" onClick={exportToPDF}>
              <FaFilePdf />
              <span>تصدير PDF</span>
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="filters-section">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">نوع التقرير</label>
              <select
                className="form-control"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="sales">المبيعات</option>
                <option value="purchases">المشتريات</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">من تاريخ</label>
              <input
                type="date"
                className="form-control"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">إلى تاريخ</label>
              <input
                type="date"
                className="form-control"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">الحالة</label>
              <select
                className="form-control"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">الكل</option>
                <option value="approved">معتمد</option>
                <option value="pending">قيد الانتظار</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">العميل</label>
              <select
                className="form-control"
                value={filters.customerId}
                onChange={(e) => handleFilterChange('customerId', e.target.value)}
              >
                <option value="">الكل</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.taxNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>الرقم الضريبي</th>
                <th>الإجمالي</th>
                <th>الضريبة</th>
                <th>الإجمالي النهائي</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    <div className="loading-spinner"></div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id}>
                    <td>{report.invoiceNumber}</td>
                    <td>{new Date(report.date).toLocaleDateString('ar-EG')}</td>
                    <td>{report.customerName}</td>
                    <td>{report.customerTaxNumber}</td>
                    <td>{report.totalAmount.toFixed(2)}</td>
                    <td>{report.taxAmount.toFixed(2)}</td>
                    <td>{report.grandTotal.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${report.status}`}>
                        {report.status === 'approved' && 'معتمد'}
                        {report.status === 'pending' && 'قيد الانتظار'}
                        {report.status === 'rejected' && 'مرفوض'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => window.open(`/invoices/${report.id}`, '_blank')}
                      >
                        <FaDownload />
                        <span>عرض</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage; 