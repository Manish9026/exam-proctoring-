import React from 'react';
import './Input.css';

const Input = ({
  label,
  icon: Icon,
  error,
  className = '',
  id,
  ...props
}) => {
  const wrapperClass = [
    'input-wrapper',
    Icon && 'input-wrapper--has-icon',
    error && 'input-wrapper--error',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      {label && <label className="input-wrapper__label" htmlFor={id}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input className="input-wrapper__field" id={id} {...props} />
        {Icon && <span className="input-wrapper__icon"><Icon size={18} /></span>}
      </div>
      {error && <span className="input-wrapper__error">{error}</span>}
    </div>
  );
};

export default Input;
