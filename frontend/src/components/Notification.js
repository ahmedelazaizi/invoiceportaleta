import React from 'react';
import PropTypes from 'prop-types';

/**
 * مكون الإشعارات - يعرض رسائل النجاح والخطأ والتحذير والمعلومات
 */
const Notification = ({ message, type, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`alert alert-${type}`} role="alert" aria-live="assertive">
      <span className="alert-icon">{getIcon()}</span>
      <div className="alert-content">{message}</div>
      <button 
        type="button" 
        className="alert-close" 
        onClick={onClose}
        aria-label="إغلاق"
      >
        ✕
      </button>
    </div>
  );
};

Notification.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func.isRequired
};

Notification.defaultProps = {
  type: 'info'
};

export default Notification;
