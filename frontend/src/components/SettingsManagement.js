import React, { useState, useEffect } from 'react';
import api from '../api';
import './SettingsManagement.css';

const SettingsManagement = () => {
  const [settings, setSettings] = useState([]);
  const [newSetting, setNewSetting] = useState({ name: '', value: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSetting({ ...newSetting, [name]: value });
  };

  const handleAddSetting = async () => {
    try {
      await api.post('/settings', newSetting);
      setNewSetting({ name: '', value: '' });
      fetchSettings();
    } catch (error) {
      console.error('Error adding setting:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredSettings = settings.filter(setting => setting.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="settings-management">
      <h2>إدارة الإعدادات</h2>
      <div className="search-bar">
        <input type="text" placeholder="بحث عن إعداد..." value={searchTerm} onChange={handleSearch} />
      </div>
      <div className="add-setting-form">
        <input type="text" name="name" placeholder="اسم الإعداد" value={newSetting.name} onChange={handleInputChange} />
        <input type="text" name="value" placeholder="القيمة" value={newSetting.value} onChange={handleInputChange} />
        <button onClick={handleAddSetting}>إضافة إعداد</button>
      </div>
      <ul className="settings-list">
        {filteredSettings.map(setting => (
          <li key={setting.id}>
            <strong>{setting.name}</strong> - {setting.value}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SettingsManagement; 