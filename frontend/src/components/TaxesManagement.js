import React, { useState, useEffect } from 'react';
import api from '../api';
import './TaxesManagement.css';

const TaxesManagement = () => {
  const [taxes, setTaxes] = useState([]);
  const [newTax, setNewTax] = useState({ name: '', rate: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const response = await api.get('/taxes');
      setTaxes(response.data);
    } catch (error) {
      console.error('Error fetching taxes:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTax({ ...newTax, [name]: value });
  };

  const handleAddTax = async () => {
    try {
      await api.post('/taxes', newTax);
      setNewTax({ name: '', rate: '' });
      fetchTaxes();
    } catch (error) {
      console.error('Error adding tax:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredTaxes = taxes.filter(tax => tax.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="main-content">
      <div className="card">
        <div className="taxes-management">
          <h2>إدارة الضرائب</h2>
          <div className="search-bar">
            <input type="text" placeholder="بحث عن ضريبة..." value={searchTerm} onChange={handleSearch} />
          </div>
          <div className="add-tax-form">
            <input type="text" name="name" placeholder="اسم الضريبة" value={newTax.name} onChange={handleInputChange} />
            <input type="number" name="rate" placeholder="نسبة الضريبة" value={newTax.rate} onChange={handleInputChange} />
            <button onClick={handleAddTax}>إضافة ضريبة</button>
          </div>
          <ul className="taxes-list">
            {filteredTaxes.map(tax => (
              <li key={tax.id}>
                <strong>{tax.name}</strong> - {tax.rate}%
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TaxesManagement; 