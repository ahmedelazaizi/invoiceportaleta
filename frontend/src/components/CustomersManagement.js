import React, { useState, useEffect } from 'react';
import api from '../api';
import './CustomersManagement.css';

const CustomersManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer({ ...newCustomer, [name]: value });
  };

  const handleAddCustomer = async () => {
    try {
      await api.post('/customers', newCustomer);
      setNewCustomer({ name: '', email: '', phone: '' });
      fetchCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredCustomers = customers.filter(customer => customer.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="main-content">
      <div className="card">
        <div className="customers-management">
          <h2>إدارة العملاء</h2>
          <div className="search-bar">
            <input type="text" placeholder="بحث عن عميل..." value={searchTerm} onChange={handleSearch} />
          </div>
          <div className="add-customer-form">
            <input type="text" name="name" placeholder="اسم العميل" value={newCustomer.name} onChange={handleInputChange} />
            <input type="email" name="email" placeholder="البريد الإلكتروني" value={newCustomer.email} onChange={handleInputChange} />
            <input type="text" name="phone" placeholder="رقم الهاتف" value={newCustomer.phone} onChange={handleInputChange} />
            <button onClick={handleAddCustomer}>إضافة عميل</button>
          </div>
          <ul className="customers-list">
            {filteredCustomers.map(customer => (
              <li key={customer.id}>
                <strong>{customer.name}</strong> - {customer.email} - {customer.phone}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CustomersManagement; 