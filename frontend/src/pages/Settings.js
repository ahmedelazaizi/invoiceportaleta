import React from "react";
import './Settings.css';

const Settings = () => {
  return (
    <div className="settings">
      <h2>إعدادات الربط مع بوابة الفاتورة الإلكترونية</h2>
      <form>
        <input placeholder="Client ID" />
        <input placeholder="Client Secret" />
        <input placeholder="Username" />
        <input placeholder="Password" type="password" />
        <button type="submit">حفظ الإعدادات</button>
      </form>
      <div className="connection-status">حالة الاتصال: <span style={{color:'green'}}>متصل</span></div>
    </div>
  );
};

export default Settings;
