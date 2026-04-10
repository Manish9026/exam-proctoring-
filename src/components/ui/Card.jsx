import React from 'react';
import './Card.css';

const Card = ({
  children,
  className = '',
  interactive = false,
  glow = false,
  compact = false,
  flush = false,
  ...props
}) => {
  const classes = [
    'card',
    interactive && 'card--interactive',
    glow && 'card--glow',
    compact && 'card--compact',
    flush && 'card--flush',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props}>{children}</div>;
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`card__header ${className}`}>{children}</div>
);

const CardTitle = ({ children, subtitle, className = '' }) => (
  <div className={className}>
    <h3 className="card__title">{children}</h3>
    {subtitle && <p className="card__subtitle">{subtitle}</p>}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;

export default Card;
