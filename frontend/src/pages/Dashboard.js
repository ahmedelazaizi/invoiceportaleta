import React from "react";
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="main-content">
      <div className="card">
        <div className="dashboard">
          <h2>لوحة التحكم</h2>
          <div className="stats">
            <div className="stat-box">عدد الفواتير: 0</div>
            <div className="stat-box">فواتير اليوم: 0</div>
            <div className="stat-box">عدد العملاء: 0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
