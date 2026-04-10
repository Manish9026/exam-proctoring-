import React from 'react';
import './Badge.css';

const Badge = ({ children, variant = 'primary', dot = false, size = 'md', className = '' }) => {
  const classes = [
    'badge',
    `badge--${variant}`,
    dot && 'badge--dot',
    size === 'lg' && 'badge--lg',
    className,
  ].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
};

export default Badge;
