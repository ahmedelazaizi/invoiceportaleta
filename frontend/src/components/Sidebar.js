import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * مكون الشريط الجانبي - يعرض قائمة التنقل الرئيسية للتطبيق
 */
const Sidebar = ({ onLogout, isOpen, toggleSidebar, darkMode, toggleDarkMode, highContrast, toggleHighContrast }) => {
  const location = useLocation();
  const [activeItem, setActiveItem] = useState('/');

  useEffect(() => {
    // تحديث العنصر النشط بناءً على المسار الحالي
    const path = location.pathname;
    setActiveItem(path);
  }, [location]);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>نظام الفواتير الإلكترونية</h2>
      </div>
      
      <nav>
        <ul className="sidebar-menu" role="menu">
          <li role="none">
            <Link 
              to="/" 
              className={`sidebar-menu-item ${activeItem === '/' ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">📊</span>
              <span>لوحة التحكم</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/invoices" 
              className={`sidebar-menu-item ${activeItem.includes('/invoices') ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">📝</span>
              <span>الفواتير</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/customers" 
              className={`sidebar-menu-item ${activeItem === '/customers' ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">👥</span>
              <span>العملاء</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/items" 
              className={`sidebar-menu-item ${activeItem === '/items' ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">📦</span>
              <span>المنتجات</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/taxes" 
              className={`sidebar-menu-item ${activeItem === '/taxes' ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">💰</span>
              <span>الضرائب</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/reports" 
              className={`sidebar-menu-item ${activeItem.includes('/reports') ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">📈</span>
              <span>التقارير</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/offline-invoices" 
              className={`sidebar-menu-item ${activeItem === '/offline-invoices' ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">📴</span>
              <span>الفواتير غير المتصلة</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/issuerinfo" 
              className={`sidebar-menu-item ${activeItem === '/issuerinfo' ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">🏢</span>
              <span>معلومات الشركة</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/users" 
              className={`sidebar-menu-item ${activeItem === '/users' ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">👤</span>
              <span>المستخدمين</span>
            </Link>
          </li>
          <li role="none">
            <Link 
              to="/settings" 
              className={`sidebar-menu-item ${activeItem.includes('/settings') ? 'active' : ''}`}
              role="menuitem"
            >
              <span className="icon">⚙️</span>
              <span>الإعدادات</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="accessibility-controls">
          <button 
            className={`btn btn-icon ${darkMode ? 'active' : ''}`} 
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'تعطيل الوضع المظلم' : 'تفعيل الوضع المظلم'}
            title={darkMode ? 'تعطيل الوضع المظلم' : 'تفعيل الوضع المظلم'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          <button 
            className={`btn btn-icon ${highContrast ? 'active' : ''}`} 
            onClick={toggleHighContrast}
            aria-label={highContrast ? 'تعطيل التباين العالي' : 'تفعيل التباين العالي'}
            title={highContrast ? 'تعطيل التباين العالي' : 'تفعيل التباين العالي'}
          >
            {highContrast ? 'A' : 'A+'}
          </button>
        </div>
        
        <button 
          className="btn btn-danger btn-responsive" 
          onClick={onLogout}
        >
          <span className="icon">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  onLogout: PropTypes.func.isRequired,
  isOpen: PropTypes.bool,
  toggleSidebar: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
  toggleDarkMode: PropTypes.func.isRequired,
  highContrast: PropTypes.bool,
  toggleHighContrast: PropTypes.func.isRequired
};

Sidebar.defaultProps = {
  isOpen: true,
  darkMode: false,
  highContrast: false
};

export default Sidebar;
