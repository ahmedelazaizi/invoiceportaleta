import React, { useState, useEffect } from 'react';
import api from '../api';
import './UsersManagement.css';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUser = async () => {
    try {
      await api.post('/users', newUser);
      setNewUser({ username: '', email: '', password: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter(user => user.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="users-management">
      <h2>إدارة المستخدمين</h2>
      <div className="search-bar">
        <input type="text" placeholder="بحث عن مستخدم..." value={searchTerm} onChange={handleSearch} />
      </div>
      <div className="add-user-form">
        <input type="text" name="username" placeholder="اسم المستخدم" value={newUser.username} onChange={handleInputChange} />
        <input type="email" name="email" placeholder="البريد الإلكتروني" value={newUser.email} onChange={handleInputChange} />
        <input type="password" name="password" placeholder="كلمة المرور" value={newUser.password} onChange={handleInputChange} />
        <button onClick={handleAddUser}>إضافة مستخدم</button>
      </div>
      <ul className="users-list">
        {filteredUsers.map(user => (
          <li key={user.id}>
            <strong>{user.username}</strong> - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersManagement; 