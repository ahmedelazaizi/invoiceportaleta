import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import './TwoFactorAuth.css';

const TwoFactorAuth = ({ onSuccess }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post('/api/auth/verify-2fa', { code });
      if (response.data.success) {
        toast.success('تم التحقق بنجاح');
        onSuccess();
      } else {
        toast.error('رمز غير صحيح');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التحقق');
      console.error('Error verifying 2FA:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await axios.post('/api/auth/resend-2fa');
      toast.success('تم إرسال رمز جديد');
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الرمز');
      console.error('Error resending 2FA code:', error);
    }
  };

  return (
    <div className="two-factor-auth">
      <div className="auth-container">
        <h2>التحقق بخطوتين</h2>
        <p>تم إرسال رمز التحقق إلى هاتفك المحمول</p>
        
        <form onSubmit={handleSubmit}>
          <div className="code-input">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="أدخل رمز التحقق"
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              required
            />
          </div>

          <div className="auth-buttons">
            <button
              type="submit"
              className="verify-btn"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'جاري التحقق...' : 'تحقق'}
            </button>
            
            <button
              type="button"
              className="resend-btn"
              onClick={handleResendCode}
              disabled={isLoading}
            >
              إعادة إرسال الرمز
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TwoFactorAuth; 