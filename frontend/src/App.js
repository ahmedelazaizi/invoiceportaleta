import React from 'react';
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
import './App.css';

function App() {
  const [loggedIn, setLoggedIn] = React.useState(!!localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
  };

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<InvoiceList />} />
            <Route path="/invoices/new" element={<InvoiceForm />} />
            <Route path="/items" element={<ItemsManagement />} />
            <Route path="/customers" element={<CustomersManagement />} />
            <Route path="/taxes" element={<TaxesManagement />} />
            <Route path="/users" element={<UsersManagement />} />
            <Route path="/issuerinfo" element={<IssuerInfo />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/reports/*" element={<Reports />} />
            <Route path="/offline-invoices" element={<OfflineInvoices />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
