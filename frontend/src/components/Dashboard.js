import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <img
          src="/logo192.png" // يمكنك تغيير المسار إلى شعار شركتك
          alt="شعار الشركة"
          className="company-logo"
        />
        <div className="company-info">
          <h1>شركة الفواتير الذكية</h1>
          <p>العنوان: القاهرة، مصر</p>
          <p>الهاتف: 0123456789</p>
          <p>البريد الإلكتروني: info@smartinvoices.com</p>
        </div>
      </div>
      <div className="dashboard-message">
        <h2>مرحبًا بك في نظام الفواتير الإلكترونية المتكامل</h2>
        <p>
          نظامنا يتيح لك إدارة الفواتير، العملاء، الأصناف، الضرائب والتقارير بكل سهولة واحترافية، مع توافق كامل مع منظومة الفاتورة الإلكترونية المصرية (ETA).
        </p>
        <p className="dashboard-ad">جرب جميع المزايا الآن وواكب التحول الرقمي بثقة!</p>
      </div>
    </div>
  );
};

export default Dashboard; 