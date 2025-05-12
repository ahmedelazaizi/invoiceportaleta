import React, { useState, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-toastify';
import './AuditLog.css';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    action: 'all',
    user: 'all',
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/audit-logs', { params: filters });
      setLogs(response.data);
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب سجل العمليات');
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return '#28a745';
      case 'update':
        return '#17a2b8';
      case 'delete':
        return '#dc3545';
      case 'login':
        return '#6c757d';
      default:
        return '#1976d2';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="audit-log">
      <h2>سجل العمليات</h2>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-item">
            <label>نوع العملية:</label>
            <select name="action" value={filters.action} onChange={handleFilterChange}>
              <option value="all">الكل</option>
              <option value="create">إنشاء</option>
              <option value="update">تعديل</option>
              <option value="delete">حذف</option>
              <option value="login">تسجيل دخول</option>
            </select>
          </div>

          <div className="filter-item">
            <label>المستخدم:</label>
            <select name="user" value={filters.user} onChange={handleFilterChange}>
              <option value="all">الكل</option>
              <option value="admin">مدير النظام</option>
              <option value="user">مستخدم</option>
            </select>
          </div>

          <div className="filter-item">
            <label>من تاريخ:</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-item">
            <label>إلى تاريخ:</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-item">
            <label>بحث:</label>
            <input
              type="text"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="بحث في السجل..."
            />
          </div>
        </div>
      </div>

      <div className="logs-table">
        {isLoading ? (
          <div className="loading">جاري التحميل...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>التاريخ والوقت</th>
                <th>المستخدم</th>
                <th>نوع العملية</th>
                <th>التفاصيل</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{formatDate(log.timestamp)}</td>
                  <td>{log.user}</td>
                  <td>
                    <span
                      className="action-badge"
                      style={{ backgroundColor: getActionColor(log.action) }}
                    >
                      {log.action === 'create' ? 'إنشاء' :
                       log.action === 'update' ? 'تعديل' :
                       log.action === 'delete' ? 'حذف' :
                       log.action === 'login' ? 'تسجيل دخول' : log.action}
                    </span>
                  </td>
                  <td>{log.details}</td>
                  <td>{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditLog; 