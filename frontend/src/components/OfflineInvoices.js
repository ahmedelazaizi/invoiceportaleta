import React, { useState, useEffect } from 'react';
import './OfflineInvoices.css';

const OfflineInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [editInvoice, setEditInvoice] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    const data = JSON.parse(localStorage.getItem('invoices_offline') || '[]');
    setInvoices(data);
  };

  const handleEdit = (idx) => {
    setEditIdx(idx);
    setEditInvoice({ ...invoices[idx] });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditInvoice({ ...editInvoice, [name]: value });
  };

  const handleSaveEdit = () => {
    const updated = [...invoices];
    updated[editIdx] = { ...editInvoice };
    localStorage.setItem('invoices_offline', JSON.stringify(updated));
    setInvoices(updated);
    setEditIdx(null);
    setMessage('تم تحديث بيانات الفاتورة بنجاح.');
  };

  const handleDelete = (idx) => {
    const updated = invoices.filter((_, i) => i !== idx);
    localStorage.setItem('invoices_offline', JSON.stringify(updated));
    setInvoices(updated);
    setMessage('تم حذف الفاتورة.');
  };

  const handleSend = async (idx) => {
    try {
      const { sendToPortal } = await import('../api');
      await sendToPortal(invoices[idx]);
      const updated = invoices.filter((_, i) => i !== idx);
      localStorage.setItem('invoices_offline', JSON.stringify(updated));
      setInvoices(updated);
      setMessage('تم إرسال الفاتورة بنجاح.');
    } catch (err) {
      setMessage('فشل إرسال الفاتورة.');
    }
  };

  const handleSendAll = async () => {
    let successCount = 0;
    let failedCount = 0;
    let remaining = [...invoices];
    for (let i = 0; i < invoices.length; i++) {
      try {
        const { sendToPortal } = await import('../api');
        await sendToPortal(remaining[0]);
        successCount++;
        remaining = remaining.slice(1);
      } catch {
        failedCount++;
      }
    }
    localStorage.setItem('invoices_offline', JSON.stringify(remaining));
    setInvoices(remaining);
    setMessage(`تم إرسال ${successCount} فاتورة${successCount !== 1 ? 'ات' : ''} بنجاح.`);
  };

  return (
    <div className="offline-invoices">
      <h2>الفواتير غير المرسلة</h2>
      {message && <div className="message">{message}</div>}
      <button onClick={handleSendAll} disabled={invoices.length === 0} className="send-all-btn">إرسال الكل</button>
      <ul className="offline-invoices-list">
        {invoices.length === 0 && <li>لا توجد فواتير غير مرسلة.</li>}
        {invoices.map((inv, idx) => (
          <li key={idx} className="offline-invoice-item">
            {editIdx === idx ? (
              <div className="edit-form">
                <input name="invoice_number" value={editInvoice.invoice_number} onChange={handleEditChange} placeholder="رقم الفاتورة" />
                <input name="invoice_date" type="date" value={editInvoice.invoice_date} onChange={handleEditChange} placeholder="تاريخ الفاتورة" />
                <button onClick={handleSaveEdit}>حفظ</button>
                <button onClick={() => setEditIdx(null)}>إلغاء</button>
              </div>
            ) : (
              <>
                <span>رقم: {inv.invoice_number} | تاريخ: {inv.invoice_date} | عميل: {inv.customer_name}</span>
                <button onClick={() => handleEdit(idx)}>تعديل</button>
                <button onClick={() => handleSend(idx)}>إرسال</button>
                <button onClick={() => handleDelete(idx)}>حذف</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OfflineInvoices; 