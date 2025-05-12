import React from "react";
import './IssuerInfo.css';

const IssuerInfo = () => {
  return (
    <div className="issuer-info">
      <h2>بيانات الممول</h2>
      <form>
        <input placeholder="اسم الشركة" />
        <input placeholder="الرقم الضريبي" />
        <input placeholder="العنوان" />
        <input placeholder="رقم التسجيل" />
        <button type="submit">حفظ</button>
      </form>
    </div>
  );
};

export default IssuerInfo;
