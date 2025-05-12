import React, { useState, useEffect } from 'react';
import api from '../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { cacheService } from '../services/cacheService';
import './InvoicesManagement.css';
import { Table, Button, Input, Select, Space, Modal, message, Tooltip as AntTooltip, Dropdown, Menu } from 'antd';
import { SearchOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined, FileOutlined } from '@ant-design/icons';
import { invoiceService } from '../services/invoiceService';
import { exportService } from '../services/exportService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const InvoicesManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    status: 'all',
    amountFrom: '',
    amountTo: '',
    customerType: 'all'
  });
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalInvoices: 0,
    averageAmount: 0,
    monthlyData: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, invoices]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await cacheService.cacheWithStaleWhileRevalidate(
        'invoices',
        async () => {
          const response = await api.get('/invoices');
          return response.data;
        }
      );
      setInvoices(data);
      calculateStats(data);
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب الفواتير');
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalAmount = data.reduce((sum, inv) => sum + inv.amount, 0);
    const monthlyData = data.reduce((acc, inv) => {
      const month = new Date(inv.date).toLocaleString('ar-EG', { month: 'long' });
      acc[month] = (acc[month] || 0) + inv.amount;
      return acc;
    }, {});

    setStats({
      totalAmount,
      totalInvoices: data.length,
      averageAmount: totalAmount / data.length,
      monthlyData: Object.entries(monthlyData).map(([month, amount]) => ({
        month,
        amount
      }))
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    if (filters.searchTerm) {
      filtered = filtered.filter(inv =>
        inv.number.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        inv.customer.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(inv => new Date(inv.date) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(inv => new Date(inv.date) <= new Date(filters.dateTo));
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(inv => inv.status === filters.status);
    }

    if (filters.amountFrom) {
      filtered = filtered.filter(inv => inv.amount >= Number(filters.amountFrom));
    }

    if (filters.amountTo) {
      filtered = filtered.filter(inv => inv.amount <= Number(filters.amountTo));
    }

    if (filters.customerType !== 'all') {
      filtered = filtered.filter(inv => inv.customerType === filters.customerType);
    }

    setFilteredInvoices(filtered);
  };

  const chartData = {
    labels: stats.monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'إجمالي المبيعات الشهرية',
        data: stats.monthlyData.map(d => d.amount),
        backgroundColor: 'rgba(25, 118, 210, 0.5)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'إحصائيات المبيعات الشهرية',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const handleViewInvoice = async (id) => {
    try {
      const invoice = await cacheService.cacheWithRefresh(
        `invoice_${id}`,
        async () => {
          const response = await api.get(`/invoices/${id}`);
          return response.data;
        }
      );
      // Handle viewing invoice details
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب تفاصيل الفاتورة');
      console.error('Error fetching invoice details:', error);
    }
  };

  const handleEditInvoice = async (id) => {
    try {
      const invoice = await cacheService.cacheWithRefresh(
        `invoice_${id}`,
        async () => {
          const response = await api.get(`/invoices/${id}`);
          return response.data;
        }
      );
      // Handle editing invoice
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب تفاصيل الفاتورة');
      console.error('Error fetching invoice details:', error);
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      cacheService.delete(`invoice_${id}`);
      cacheService.delete('invoices');
      toast.success('تم حذف الفاتورة بنجاح');
      fetchInvoices();
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الفاتورة');
      console.error('Error deleting invoice:', error);
    }
  };

  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      const data = await cacheService.get('invoices') || [];
      
      const exportData = data.map(invoice => ({
        'رقم الفاتورة': invoice.invoiceNumber,
        'التاريخ': new Date(invoice.date).toLocaleDateString('ar-EG'),
        'العميل': invoice.customerName,
        'المبلغ الإجمالي': invoice.totalAmount,
        'الحالة': invoice.status,
        'الضريبة': invoice.tax,
        'صافي المبلغ': invoice.netAmount
      }));

      const options = {
        title: 'تقرير الفواتير',
        headers: ['رقم الفاتورة', 'التاريخ', 'العميل', 'المبلغ الإجمالي', 'الحالة', 'الضريبة', 'صافي المبلغ']
      };

      exportService.exportWithFormat(exportData, 'تقرير_الفواتير', format, options);
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('خطأ في تصدير التقرير:', error);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setExportLoading(false);
    }
  };

  const exportMenu = (
    <Menu>
      <Menu.Item key="excel" icon={<FileExcelOutlined />} onClick={() => handleExport('excel')}>
        تصدير إلى Excel
      </Menu.Item>
      <Menu.Item key="pdf" icon={<FilePdfOutlined />} onClick={() => handleExport('pdf')}>
        تصدير إلى PDF
      </Menu.Item>
      <Menu.Item key="csv" icon={<FileTextOutlined />} onClick={() => handleExport('csv')}>
        تصدير إلى CSV
      </Menu.Item>
      <Menu.Item key="json" icon={<FileOutlined />} onClick={() => handleExport('json')}>
        تصدير إلى JSON
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="invoices-management">
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
      
      <div className="invoices-header">
        <h2>إدارة الفواتير</h2>
        <Space>
          <Dropdown overlay={exportMenu} trigger={['click']}>
            <Button 
              type="primary" 
              icon={<FileExcelOutlined />}
              loading={exportLoading}
            >
              تصدير التقرير
            </Button>
          </Dropdown>
          <Button type="primary" onClick={() => setShowForm(true)}>
            إضافة فاتورة جديدة
          </Button>
        </Space>
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <h3>إجمالي الفواتير</h3>
          <p>{stats.totalInvoices}</p>
        </div>
        <div className="stat-card">
          <h3>إجمالي المبيعات</h3>
          <p>{stats.totalAmount.toFixed(2)} جنيه</p>
        </div>
        <div className="stat-card">
          <h3>متوسط قيمة الفاتورة</h3>
          <p>{stats.averageAmount.toFixed(2)} جنيه</p>
        </div>
      </div>

      <div className="chart-container">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="filters-section">
        <h2>تصفية الفواتير</h2>
        <div className="filters-grid">
          <div className="filter-item">
            <label>بحث:</label>
            <input
              type="text"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="بحث عن فاتورة..."
            />
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
            <label>الحالة:</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="all">الكل</option>
              <option value="pending">قيد الانتظار</option>
              <option value="sent">تم الإرسال</option>
              <option value="failed">فشل الإرسال</option>
            </select>
          </div>
          <div className="filter-item">
            <label>من مبلغ:</label>
            <input
              type="number"
              name="amountFrom"
              value={filters.amountFrom}
              onChange={handleFilterChange}
              placeholder="الحد الأدنى"
            />
          </div>
          <div className="filter-item">
            <label>إلى مبلغ:</label>
            <input
              type="number"
              name="amountTo"
              value={filters.amountTo}
              onChange={handleFilterChange}
              placeholder="الحد الأقصى"
            />
          </div>
          <div className="filter-item">
            <label>نوع العميل:</label>
            <select name="customerType" value={filters.customerType} onChange={handleFilterChange}>
              <option value="all">الكل</option>
              <option value="individual">فرد</option>
              <option value="company">شركة</option>
            </select>
          </div>
        </div>
      </div>

      <div className="invoices-table">
        <table>
          <thead>
            <tr>
              <th>رقم الفاتورة</th>
              <th>التاريخ</th>
              <th>العميل</th>
              <th>نوع العميل</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id}>
                <td>{invoice.number}</td>
                <td>{new Date(invoice.date).toLocaleDateString('ar-EG')}</td>
                <td>{invoice.customer}</td>
                <td>{invoice.customerType === 'individual' ? 'فرد' : 'شركة'}</td>
                <td>{invoice.amount.toFixed(2)} جنيه</td>
                <td>
                  <span className={`status-badge ${invoice.status}`}>
                    {invoice.status === 'pending' ? 'قيد الانتظار' :
                     invoice.status === 'sent' ? 'تم الإرسال' : 'فشل الإرسال'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handleViewInvoice(invoice.id)}>عرض</button>
                    <button onClick={() => handleEditInvoice(invoice.id)}>تعديل</button>
                    <button onClick={() => handleDeleteInvoice(invoice.id)}>حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesManagement; 