import React, { useState, useEffect } from 'react';
import api from '../api';
import './ItemsManagement.css';

const ItemsManagement = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleAddItem = async () => {
    try {
      await api.post('/items', newItem);
      setNewItem({ name: '', description: '', price: '' });
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="items-management">
      <h2>إدارة الأصناف</h2>
      <div className="search-bar">
        <input type="text" placeholder="بحث عن صنف..." value={searchTerm} onChange={handleSearch} />
      </div>
      <div className="add-item-form">
        <input type="text" name="name" placeholder="اسم الصنف" value={newItem.name} onChange={handleInputChange} />
        <input type="text" name="description" placeholder="الوصف" value={newItem.description} onChange={handleInputChange} />
        <input type="number" name="price" placeholder="السعر" value={newItem.price} onChange={handleInputChange} />
        <button onClick={handleAddItem}>إضافة صنف</button>
      </div>
      <ul className="items-list">
        {filteredItems.map(item => (
          <li key={item.id}>
            <strong>{item.name}</strong> - {item.description} - {item.price}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ItemsManagement; 