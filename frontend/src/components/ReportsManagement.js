import React, { useState, useEffect } from 'react';
import api from '../api';
import './ReportsManagement.css';

const ReportsManagement = () => {
  const [reports, setReports] = useState([]);
  const [newReport, setNewReport] = useState({ title: '', date: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport({ ...newReport, [name]: value });
  };

  const handleAddReport = async () => {
    try {
      await api.post('/reports', newReport);
      setNewReport({ title: '', date: '' });
      fetchReports();
    } catch (error) {
      console.error('Error adding report:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredReports = reports.filter(report => report.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="reports-management">
      <h2>إدارة التقارير</h2>
      <div className="search-bar">
        <input type="text" placeholder="بحث عن تقرير..." value={searchTerm} onChange={handleSearch} />
      </div>
      <div className="add-report-form">
        <input type="text" name="title" placeholder="عنوان التقرير" value={newReport.title} onChange={handleInputChange} />
        <input type="date" name="date" placeholder="التاريخ" value={newReport.date} onChange={handleInputChange} />
        <button onClick={handleAddReport}>إضافة تقرير</button>
      </div>
      <ul className="reports-list">
        {filteredReports.map(report => (
          <li key={report.id}>
            <strong>{report.title}</strong> - {report.date}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReportsManagement; 