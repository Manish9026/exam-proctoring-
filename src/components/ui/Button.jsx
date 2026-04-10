import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    loading && 'btn--loading',
    fullWidth && 'btn--full',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn__spinner" />}
      <span className="btn__text" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
        {children}
        {IconRight && <IconRight size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      </span>
    </button>
  );
};

export default Button;
