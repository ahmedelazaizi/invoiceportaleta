import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaFileInvoiceDollar, FaUsers, FaCalculator, FaChartLine, FaCog, FaSignOutAlt } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: <FaHome />, label: 'الرئيسية' },
    { path: '/invoices', icon: <FaFileInvoiceDollar />, label: 'الفواتير' },
    { path: '/customers', icon: <FaUsers />, label: 'العملاء' },
    { path: '/taxes', icon: <FaCalculator />, label: 'الضرائب' },
    { path: '/reports', icon: <FaChartLine />, label: 'التقارير' },
    { path: '/settings', icon: <FaCog />, label: 'الإعدادات' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>نظام الفواتير الإلكترونية</h2>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-menu-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="btn btn-logout">
          <FaSignOutAlt />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
