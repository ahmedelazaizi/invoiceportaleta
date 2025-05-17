import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import IssuerInfo from './pages/IssuerInfo';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import LoginPage from './pages/LoginPage';
import CustomersManagement from './components/CustomersManagement';
import ItemsManagement from './components/ItemsManagement';
import TaxesManagement from './components/TaxesManagement';
import UsersManagement from './components/UsersManagement';
import OfflineInvoices from './components/OfflineInvoices';
import Notification from './components/Notification';
import './App.css';

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [highContrast, setHighContrast] = useState(localStorage.getItem('highContrast') === 'true');

  useEffect(() => {
    // تطبيق الوضع المظلم أو التباين العالي إذا كان مفعلاً
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [darkMode, highContrast]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
    showNotification('تم تسجيل الخروج بنجاح', 'info');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  const toggleHighContrast = () => {
    const newMode = !highContrast;
    setHighContrast(newMode);
    localStorage.setItem('highContrast', newMode);
  };

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} showNotification={showNotification} />;
  }

  return (
    <BrowserRouter>
      <div className={`app-layout ${darkMode ? 'dark-mode' : ''} ${highContrast ? 'high-contrast' : ''}`}>
        {/* زر إظهار/إخفاء الشريط الجانبي للشاشات الصغيرة */}
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar} 
          aria-label={sidebarOpen ? 'إخفاء القائمة الجانبية' : 'إظهار القائمة الجانبية'}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        
        {/* الشريط الجانبي */}
        <Sidebar 
          onLogout={handleLogout} 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          highContrast={highContrast}
          toggleHighContrast={toggleHighContrast}
        />
        
        {/* المحتوى الرئيسي */}
        <main className={`main-content ${!sidebarOpen ? 'full-width' : ''}`}>
          {notification.show && (
            <Notification 
              message={notification.message} 
              type={notification.type} 
              onClose={() => setNotification({ ...notification, show: false })} 
            />
          )}
          
          <Routes>
            <Route path="/" element={<Dashboard showNotification={showNotification} />} />
            <Route path="/invoices" element={<InvoiceList showNotification={showNotification} />} />
            <Route path="/invoices/new" element={<InvoiceForm showNotification={showNotification} />} />
            <Route path="/items" element={<ItemsManagement showNotification={showNotification} />} />
            <Route path="/customers" element={<CustomersManagement showNotification={showNotification} />} />
            <Route path="/taxes" element={<TaxesManagement showNotification={showNotification} />} />
            <Route path="/users" element={<UsersManagement showNotification={showNotification} />} />
            <Route path="/issuerinfo" element={<IssuerInfo showNotification={showNotification} />} />
            <Route path="/settings/*" element={<Settings showNotification={showNotification} />} />
            <Route path="/reports/*" element={<Reports showNotification={showNotification} />} />
            <Route path="/offline-invoices" element={<OfflineInvoices showNotification={showNotification} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
