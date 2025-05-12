import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPrint, FaEdit, FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';
import './InvoiceView.css';

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/invoices/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        setError('حدث خطأ في جلب بيانات الفاتورة');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleApprove = async () => {
    try {
      const response = await fetch(`http://localhost:8000/invoices/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        fetchInvoice();
      } else {
        setError('حدث خطأ في اعتماد الفاتورة');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch(`http://localhost:8000/invoices/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        fetchInvoice();
      } else {
        setError('حدث خطأ في رفض الفاتورة');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
    }
  };

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

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!invoice) {
    return <div className="no-data">الفاتورة غير موجودة</div>;
  }

  return (
    <div className="invoice-view">
      <div className="card">
        <div className="header">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/invoices')}
          >
            <FaArrowLeft /> العودة للقائمة
          </button>
          <div className="actions">
            {invoice.status === 'pending' && (
              <>
                <button
                  className="btn btn-success"
                  onClick={handleApprove}
                >
                  <FaCheck /> اعتماد
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleReject}
                >
                  <FaTimes /> رفض
                </button>
              </>
            )}
            <button
              className="btn btn-primary"
              onClick={handlePrint}
            >
              <FaPrint /> طباعة
            </button>
            {invoice.status === 'draft' && (
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/invoices/${id}/edit`)}
              >
                <FaEdit /> تعديل
              </button>
            )}
          </div>
        </div>

        <div className="invoice-header">
          <div className="company-info">
            <h1>نظام الفواتير الإلكترونية</h1>
            <p>الرقم الضريبي: 123456789</p>
            <p>العنوان: القاهرة، مصر</p>
            <p>هاتف: 0123456789</p>
          </div>
          <div className="invoice-info">
            <h2>فاتورة ضريبية</h2>
            <p>رقم الفاتورة: {invoice.invoice_number}</p>
            <p>التاريخ: {formatDate(invoice.invoice_date)}</p>
            <p>الحالة: 
              <span className={`status-badge status-${invoice.status}`}>
                {invoice.status === 'draft' && 'مسودة'}
                {invoice.status === 'pending' && 'قيد الانتظار'}
                {invoice.status === 'approved' && 'معتمدة'}
                {invoice.status === 'rejected' && 'مرفوضة'}
              </span>
            </p>
          </div>
        </div>

        <div className="client-info">
          <h3>بيانات العميل</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>الاسم:</label>
              <span>{invoice.client_name}</span>
            </div>
            <div className="info-item">
              <label>الرقم الضريبي:</label>
              <span>{invoice.client_tax_number}</span>
            </div>
            <div className="info-item">
              <label>العنوان:</label>
              <span>{invoice.client_address}</span>
            </div>
            <div className="info-item">
              <label>نوع العميل:</label>
              <span>{invoice.client_type === 'B' ? 'شركة' : 'فرد'}</span>
            </div>
          </div>
        </div>

        <div className="items-section">
          <h3>تفاصيل الفاتورة</h3>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>المنتج</th>
                <th>الوصف</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>نسبة الضريبة</th>
                <th>الإجمالي</th>
                <th>الضريبة</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td>{item.tax_rate}%</td>
                  <td>{formatCurrency(item.total)}</td>
                  <td>{formatCurrency(item.tax_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals-section">
          <div className="total-row">
            <span>الإجمالي:</span>
            <span>{formatCurrency(invoice.total_amount)}</span>
          </div>
          <div className="total-row">
            <span>ضريبة القيمة المضافة:</span>
            <span>{formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div className="total-row grand-total">
            <span>الإجمالي النهائي:</span>
            <span>{formatCurrency(invoice.net_amount)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="notes-section">
            <h3>ملاحظات</h3>
            <p>{invoice.notes}</p>
          </div>
        )}

        <div className="footer">
          <p>طريقة الدفع: {invoice.payment_method === 'cash' ? 'نقدي' : invoice.payment_method === 'bank' ? 'تحويل بنكي' : 'آجل'}</p>
          <p>تم إنشاء هذه الفاتورة إلكترونياً</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView; 