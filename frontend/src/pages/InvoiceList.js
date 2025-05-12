import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaEye, FaPrint, FaSearch } from 'react-icons/fa';
import './InvoiceList.css';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, filterStatus]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/invoices/?page=${currentPage}&status=${filterStatus}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.items);
        setTotalPages(Math.ceil(data.total / itemsPerPage));
      } else {
        setError('حدث خطأ في جلب بيانات الفواتير');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      try {
        const response = await fetch(`http://localhost:8000/invoices/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.ok) {
          setInvoices(invoices.filter(invoice => invoice.id !== id));
        } else {
          setError('حدث خطأ في حذف الفاتورة');
        }
      } catch (err) {
        setError('حدث خطأ في الاتصال بالخادم');
      }
    }
  };

  const handlePrint = (invoice) => {
    // TODO: Implement print functionality
    console.log('Printing invoice:', invoice);
  };

  const filteredInvoices = invoices.filter(invoice => {
    const searchFields = [
      invoice.invoice_number,
      invoice.client_name,
      invoice.client_tax_number,
      invoice.total_amount.toString(),
    ];
    return searchFields.some(field => 
      field.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  return (
    <div className="invoice-list">
      <div className="card">
        <div className="header">
          <h2>قائمة الفواتير</h2>
          <Link to="/invoices/new" className="btn btn-primary">
            <FaPlus /> إنشاء فاتورة جديدة
          </Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="filters">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">معتمدة</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <>
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
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{formatDate(invoice.invoice_date)}</td>
                      <td>{invoice.client_name}</td>
                      <td>{invoice.client_tax_number}</td>
                      <td>{formatCurrency(invoice.total_amount)}</td>
                      <td>{formatCurrency(invoice.tax_amount)}</td>
                      <td>
                        <span className={`status-badge status-${invoice.status}`}>
                          {invoice.status === 'draft' && 'مسودة'}
                          {invoice.status === 'pending' && 'قيد الانتظار'}
                          {invoice.status === 'approved' && 'معتمدة'}
                          {invoice.status === 'rejected' && 'مرفوضة'}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn btn-icon"
                            onClick={() => handlePrint(invoice)}
                            title="طباعة"
                          >
                            <FaPrint />
                          </button>
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="btn btn-icon"
                            title="عرض"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/invoices/${invoice.id}/edit`}
                            className="btn btn-icon"
                            title="تعديل"
                          >
                            <FaEdit />
                          </Link>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() => handleDelete(invoice.id)}
                            title="حذف"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredInvoices.length === 0 && (
              <div className="no-data">
                لا توجد فواتير متاحة
              </div>
            )}

            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                السابق
              </button>
              <span className="page-info">
                الصفحة {currentPage} من {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                التالي
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;
